import { borrarBaseLocal, getQueueStats, exportarColaMuerta, olvidarUsuario } from '../lib/syncManager';

const handleCerrarSesion = async () => {
  try {
    const stats = await getQueueStats();

    // 1. Solo bloquear si TÚ tienes pendientes propios (no ajenos)
    if (stats.pending > 0) {
      alert(
        `⚠️ Tienes ${stats.pending} registro(s) pendientes de subir.\n\n` +
        `Conéctate a internet y espera a que se sincronicen antes de cerrar sesión.`
      );
      return;
    }

    // 2. Si tienes fallidos propios, ofrecer descargar respaldo
    if (stats.dead > 0) {
      const descargar = window.confirm(
        `⚠️ Tienes ${stats.dead} registro(s) fallidos que el servidor rechazó.\n\n` +
        `🚨 ATENCIÓN: El respaldo JSON contiene datos personales SIN CIFRAR. ` +
        `Guárdalo en un lugar seguro y elimínalo cuando termines de revisarlo.\n\n` +
        `¿Deseas descargar el respaldo y continuar con el cierre de sesión?\n\n` +
        `(Aceptar = Descargar y continuar | Cancelar = No cerrar sesión)`
      );

      if (!descargar) return;
      await exportarColaMuerta();
      await new Promise(r => setTimeout(r, 1000));
    }

    // 3. ⚠️ NO bloquear por ajenas: solo advertir y preservar datos
    const avisoAjenas = stats.ajenas > 0
      ? `\n\n⚠️ ATENCIÓN: Hay ${stats.ajenas} registro(s) de OTRO usuario en este dispositivo.\n\n` +
        `NO se borrarán al cerrar sesión. La persona dueña de esos datos debe ` +
        `iniciar sesión aquí para sincronizarlos.\n\n` +
        `Los datos quedan guardados localmente sin cifrar hasta entonces.`
      : '';

    mostrarConfirm(
      '¿Cerrar sesión?',
      `Se cerrará tu sesión actual.${avisoAjenas}`,
      'warning',
      async () => {
        cerrarConfirm();
        setCerrandoSesion(true);

        const { error } = await supabase.auth.signOut();
        if (error) await supabase.auth.signOut({ scope: 'local' });

        // 4. Solo borrar IndexedDB si NO hay ajenas pendientes
        if (stats.ajenas === 0) {
          await borrarBaseLocal();
        }

        // 5. Olvido explícito del usuario recordado
        olvidarUsuario();

        navigate('/login', { replace: true });
        setCerrandoSesion(false);
      }
    );
  } catch (error) {
    console.error("Error al verificar la cola:", error);
    alert('No se pudo verificar la seguridad de los datos. Por favor, recarga la página.');
  }
};
