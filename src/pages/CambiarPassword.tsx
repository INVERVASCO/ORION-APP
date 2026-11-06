  const handleCambiar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 🚀 FIX: Validación estricta unificada
    const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, incluir una mayúscula y un número.');
      return;
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    
    if (updateError) {
      setError('Error al cambiar la contraseña: ' + updateError.message);
      setLoading(false);
      return;
    }

    setExito(true);
    setLoading(false);
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/login', { replace: true });
    }, 3000);
  };
