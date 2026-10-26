import { useEffect, useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertTriangle, Database, Trash2, ArrowRight, Download, X, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface PersonaStaging {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  ocupacion: string | null;
  correo_electronico: string | null;
  direccion: string | null;
  preferencia_voto: string | null;
  barrio_colonia_id: string | null;
  estado: string;
  errores: any;
  created_at: string;
}

interface Barrio {
  id: string;
  nombre: string;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

// ===== PARSER ROBUSTO =====
function parsearArchivo(contenido: string) {
  const lineas = contenido.split('\n').filter(l => l.trim() !== '');
  if (lineas.length < 2) return { error: 'El archivo está vacío o no tiene filas de datos' };

  // 1. Detectar separador analizando MÚLTIPLES líneas (no solo el header)
  const muestras = lineas.slice(0, Math.min(5, lineas.length));
  let tabs = 0, semis = 0, comas = 0;
  muestras.forEach(l => {
    tabs += (l.match(/\t/g) || []).length;
    semis += (l.match(/;/g) || []).length;
    comas += (l.match(/,/g) || []).length;
  });

  let separador = ',';
  if (tabs > comas && tabs > semis) separador = '\t';
  else if (semis > comas && semis > tabs) separador = ';';

  const parseLinea = (linea: string) =>
    linea.split(separador).map(v => v.trim().replace(/^"|"$/g, '').trim());

  // 2. Parsear header
  let encabezados = parseLinea(lineas[0]).filter(h => h !== '');

  // 3. Caso especial: header todo en una sola celda con tabs internos
  if (encabezados.length === 1 && encabezados[0].includes('\t')) {
    encabezados = encabezados[0].split('\t').map(v => v.trim()).filter(h => h !== '');
    // NO cambiamos el separador aquí
  }

  // 4. Mapear columnas
  const indices: Record<string, number> = {};
  encabezados.forEach((h, i) => {
    const hn = h.toLowerCase().trim();
    if (indices.nombre === undefined && hn.includes('nombre')) indices.nombre = i;
    else if (indices.telefono === undefined && (hn.includes('tel') || hn.includes('celular') || hn.includes('whatsapp'))) indices.telefono = i;
    else if (indices.ocupacion === undefined && (hn.includes('ocupacion') || hn.includes('ocupación') || hn.includes('profesion') || hn.includes('profesión'))) indices.ocupacion = i;
    else if (indices.correo === undefined && (hn.includes('correo') || hn.includes('email'))) indices.correo = i;
    else if (indices.direccion === undefined && (hn.includes('direccion') || hn.includes('dirección') || hn.includes('domicilio'))) indices.direccion = i;
    else if (indices.preferencia_voto === undefined && (hn.includes('voto') || hn.includes('preferencia'))) indices.preferencia_voto = i;
    else if (indices.barrio === undefined && (hn.includes('barrio') || hn.includes('colonia'))) indices.barrio = i;
  });

  if (indices.nombre === undefined) {
    return { error: `No se detectó la columna "Nombre". Encabezados leídos: ${encabezados.join(' | ')}` };
  }

  // 5. Parsear filas de datos
  const filas: any[] = [];
  for (let i = 1; i < lineas.length; i++) {
    const valores = parseLinea(lineas[i]);
    if (valores.every(v => v === '')) continue;

    filas.push({
      nombre_completo: valores[indices.nombre!] || 'Sin nombre',
      telefono: indices.telefono !== undefined ? valores[indices.telefono] || null : null,
      ocupacion: indices.ocupacion !== undefined ? valores[indices.ocupacion] || null : null,
      correo_electronico: indices.correo !== undefined ? valores[indices.correo] || null : null,
      direccion: indices.direccion !== undefined ? valores[indices.direccion] || null : null,
      preferencia_voto: indices.preferencia_voto !== undefined ? valores[indices.preferencia_voto] || null : null,
      barrio_texto: indices.barrio !== undefined ? valores[indices.barrio] || null : null,
    });
  }

  return { encabezados, filas, indices };
}

// ===== PARSER PARA ARCHIVOS XLSX =====
async function parsearXLSX(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(primeraHoja, { header: 1, defval: '' });

  if (jsonData.length < 2) return { error: 'El archivo está vacío' };

  const encabezados = (jsonData[0] as any[]).map(h => String(h).trim()).filter(h => h !== '');
  const indices: Record<string, number> = {};
  encabezados.forEach((h, i) => {
    const hn = h.toLowerCase();
    if (indices.nombre === undefined && hn.includes('nombre')) indices.nombre = i;
    else if (indices.telefono === undefined && (hn.includes('tel') || hn.includes('celular'))) indices.telefono = i;
    else if (indices.ocupacion === undefined && (hn.includes('ocupacion') || hn.includes('ocupación'))) indices.ocupacion = i;
    else if (indices.correo === undefined && (hn.includes('correo') || hn.includes('email'))) indices.correo = i;
    else if (indices.direccion === undefined && (hn.includes('direccion') || hn.includes('dirección'))) indices.direccion = i;
    else if (indices.preferencia_voto === undefined && (hn.includes('voto') || hn.includes('preferencia'))) indices.preferencia_voto = i;
    else if (indices.barrio === undefined && (hn.includes('barrio') || hn.includes('colonia'))) indices.barrio = i;
  });

  if (indices.nombre === undefined) return { error: `No se detectó la columna "Nombre". Encabezados: ${encabezados.join(' | ')}` };

  const filas: any[] = [];
  for (let i = 1; i < jsonData.length; i++) {
    const valores = jsonData[i] as any[];
    if (!valores || valores.every(v => String(v).trim() === '')) continue;

    filas.push({
      nombre_completo: String(valores[indices.nombre!] || '').trim() || 'Sin nombre',
      telefono: indices.telefono !== undefined ? String(valores[indices.telefono] || '').trim() || null : null,
      ocupacion: indices.ocupacion !== undefined ? String(valores[indices.ocupacion] || '').trim() || null : null,
      correo_electronico: indices.correo !== undefined ? String(valores[indices.correo] || '').trim() || null : null,
      direccion: indices.direccion !== undefined ? String(valores[indices.direccion] || '').trim() || null : null,
      preferencia_voto: indices.preferencia_voto !== undefined ? String(valores[indices.preferencia_voto] || '').trim() || null : null,
      barrio_texto: indices.barrio !== undefined ? String(valores[indices.barrio] || '').trim() || null : null,
    });
  }

  return { encabezados, filas };
}

export default function Importar() {
  const [staging, setStaging] = useState<PersonaStaging[]>([]);
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [loading, setLoading] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');
  const [tabVista, setTabVista] = useState<'todas' | 'validas' | 'errores'>('todas');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [confirmModal, setConfirmModal] = useState<ConfirmModalData>({
    visible: false, titulo: '', mensaje: '', tipo: 'warning', onConfirm: () => {},
  });

  const mostrarConfirm = (titulo: string, mensaje: string, tipo: 'danger' | 'success' | 'warning', onConfirm: () => void) => {
    setConfirmModal({ visible: true, titulo, mensaje, tipo, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ ...confirmModal, visible: false });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: stagingData } = await supabase.from('personas_staging').select('*').order('created_at', { ascending: false });
      if (stagingData) setStaging(stagingData as any);

      const { data: barriosData } = await supabase.from('barrios_colonias').select('id, nombre').order('nombre');
      if (barriosData) setBarrios(barriosData);

      setLoading(false);
    };
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    let parsed: any = null;

    try {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parsed = await parsearXLSX(file);
      } else {
        const texto = await file.text();
        parsed = parsearArchivo(texto);
      }
    } catch (err: any) {
      setToastMensaje('Error al leer el archivo: ' + err.message);
      setToastVisible(true);
      setLoading(false);
      return;
    }

    if (parsed.error) {
      setToastMensaje(parsed.error);
      setToastVisible(true);
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const { encabezados, filas } = parsed;

    const filasConBarrio = filas.map((f: any) => {
      const { barrio_texto, ...resto } = f;
      let barrio_colonia_id: string | null = null;
      if (barrio_texto) {
        const encontrado = barrios.find(b =>
          b.nombre.toLowerCase().trim() === barrio_texto.toLowerCase().trim() ||
          b.nombre.toLowerCase().includes(barrio_texto.toLowerCase()) ||
          barrio_texto.toLowerCase().includes(b.nombre.toLowerCase())
        );
        if (encontrado) barrio_colonia_id = encontrado.id;
      }
      return { ...resto, barrio_colonia_id, estado: 'pendiente', errores: null };
    });

    const { error } = await supabase.from('personas_staging').insert(filasConBarrio);

    if (error) {
      setToastMensaje('Error al subir: ' + error.message);
      setToastVisible(true);
    } else {
      setToastMensaje(`✅ ${filasConBarrio.length} registros cargados. Columnas: ${encabezados.join(', ')}`);
      setToastVisible(true);
      const { data } = await supabase.from('personas_staging').select('*').order('created_at', { ascending: false });
      if (data) setStaging(data as any);
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ===== VALIDACIÓN COMPLETA =====
  const validarTodo = async () => {
    setLoading(true);
    const actualizados = staging.map(s => {
      const errores: string[] = [];

      // 1. Nombre
      if (!s.nombre_completo || s.nombre_completo === 'Sin nombre' || s.nombre_completo.trim() === '') {
        errores.push('Falta el nombre completo');
      }

      // 2. Teléfono
      if (s.telefono && s.telefono.trim() !== '') {
        const soloDigitos = s.telefono.replace(/\D/g, '');
        if (soloDigitos.length !== 10) {
          errores.push(`Teléfono inválido: "${s.telefono}" (se esperaban 10 dígitos, llegaron ${soloDigitos.length})`);
        }
      }

      // 3. Correo — validación paso por paso
      if (s.correo_electronico && s.correo_electronico.trim() !== '') {
        const email = s.correo_electronico.trim();
        const partes = email.split('@');

        if (partes.length !== 2) {
          errores.push(`Correo inválido: "${email}" — debe tener exactamente un símbolo @`);
        } else {
          const [usuario, dominio] = partes;
          if (!usuario || usuario.length < 1) {
            errores.push(`Correo inválido: "${email}" — falta el usuario antes del @`);
          } else if (!dominio || dominio.length < 1) {
            errores.push(`Correo inválido: "${email}" — falta el dominio después del @`);
          } else if (!dominio.includes('.')) {
            errores.push(`Correo inválido: "${email}" — falta la extensión del dominio (.com, .mx, etc.)`);
          } else {
            const partesDominio = dominio.split('.');
            const tld = partesDominio[partesDominio.length - 1];
            if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
              errores.push(`Correo inválido: "${email}" — la extensión del dominio es incorrecta`);
            }
          }
        }
      }

      return {
        ...s,
        estado: errores.length === 0 ? 'validado' : 'error',
        errores: errores.length > 0 ? errores : null,
      };
    });

    for (const registro of actualizados) {
      await supabase.from('personas_staging').update({ estado: registro.estado, errores: registro.errores }).eq('id', registro.id);
    }

    setStaging(actualizados);
    const totalErrores = actualizados.filter(a => a.estado === 'error').length;
    const totalValidados = actualizados.filter(a => a.estado === 'validado').length;
    setToastMensaje(`Validación: ${totalValidados} válidos, ${totalErrores} con errores`);
    setToastVisible(true);
    setLoading(false);
  };

  const publicar = () => {
    const validos = staging.filter(s => s.estado === 'validado');
    if (validos.length === 0) {
      setToastMensaje('No hay registros validados para publicar');
      setToastVisible(true);
      return;
    }

    mostrarConfirm(
      '¿Publicar al sistema productivo?',
      `Se publicarán ${validos.length} registro${validos.length !== 1 ? 's' : ''}. Una vez publicados, se eliminarán del arenero.`,
      'success',
      async () => {
        cerrarConfirm();
        setPublicando(true);

        let exitosos = 0;
        let fallidos = 0;
        const erroresPublicacion: string[] = [];
        const idsExitosos: string[] = [];

        for (const v of validos) {
          try {
            if (v.telefono) {
              const { data: existente } = await supabase.from('personas').select('id').eq('telefono', v.telefono).maybeSingle();
              if (existente) {
                idsExitosos.push(v.id);
                exitosos++;
                continue;
              }
            }

            const { error: insertError } = await supabase.from('personas').insert([{
              nombre_completo: v.nombre_completo,
              telefono: v.telefono,
              ocupacion: v.ocupacion,
              correo_electronico: v.correo_electronico,
              direccion: v.direccion,
              preferencia_voto: v.preferencia_voto,
              barrio_colonia_id: v.barrio_colonia_id,
              consentimiento_aceptado: true,
              fecha_consentimiento: new Date().toISOString(),
              origen_captura: 'Importación masiva',
            }]);

            if (insertError) {
              fallidos++;
              erroresPublicacion.push(`${v.nombre_completo}: ${insertError.message}`);
            } else {
              idsExitosos.push(v.id);
              exitosos++;
            }
          } catch (err: any) {
            fallidos++;
            erroresPublicacion.push(`${v.nombre_completo}: ${err.message}`);
          }
        }

        if (idsExitosos.length > 0) {
          await supabase.from('personas_staging').delete().in('id', idsExitosos);
          setStaging(staging.filter(s => !idsExitosos.includes(s.id)));
        }

        if (fallidos > 0) {
          setToastMensaje(`Publicados ${exitosos}, fallaron ${fallidos}. Revisa la consola.`);
          console.error('Errores:', erroresPublicacion);
        } else {
          setToastMensaje(`¡${exitosos} registros publicados con éxito!`);
        }
        setToastVisible(true);
        setPublicando(false);
      }
    );
  };

  const eliminarStaging = (id: string, nombre: string) => {
    mostrarConfirm('¿Eliminar este registro?', `Se eliminará "${nombre}" del arenero. Esta acción no se puede deshacer.`, 'danger', async () => {
      cerrarConfirm();
      await supabase.from('personas_staging').delete().eq('id', id);
      setStaging(staging.filter(s => s.id !== id));
      setToastMensaje('Registro eliminado del arenero');
      setToastVisible(true);
    });
  };

  const limpiarArenero = () => {
    if (staging.length === 0) return;
    mostrarConfirm('¿Limpiar todo el arenero?', `Se eliminarán TODOS los ${staging.length} registros. Esta acción no se puede deshacer.`, 'danger', async () => {
      cerrarConfirm();
      await supabase.from('personas_staging').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setStaging([]);
      setToastMensaje('Arenero limpiado por completo');
      setToastVisible(true);
    });
  };

  // ===== DESCARGAR PLANTILLA XLSX CON DROPDOWNS =====
  const descargarPlantillaXLSX = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'INTEL TERRITORIAL TULA';
      workbook.created = new Date();

      // Hoja principal
      const sheet = workbook.addWorksheet('Personas', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      // Columnas
      sheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Teléfono', key: 'telefono', width: 15 },
        { header: 'Ocupación', key: 'ocupacion', width: 22 },
        { header: 'Correo', key: 'correo', width: 32 },
        { header: 'Dirección', key: 'direccion', width: 38 },
        { header: 'Preferencia Voto', key: 'voto', width: 22 },
        { header: 'Barrio/Colonia', key: 'barrio', width: 28 },
      ];

      // Estilo del encabezado
      const headerRow = sheet.getRow(1);
      headerRow.height = 28;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9F2241' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Hoja de listas (oculta) para validaciones
      const listSheet = workbook.addWorksheet('Listas');
      
      // Lista de preferencias
      const preferencias = ['MORENA', 'PAN', 'PRI', 'Indeciso', 'Otro'];
      preferencias.forEach((p, i) => {
        listSheet.getCell(`A${i + 1}`).value = p;
      });

      // Lista de barrios
      barrios.forEach((b, i) => {
        listSheet.getCell(`B${i + 1}`).value = b.nombre;
      });

      listSheet.state = 'veryHidden';

      // Aplicar validaciones a 1000 filas (o las que necesites)
      const MAX_FILAS = 1000;
      for (let i = 2; i <= MAX_FILAS; i++) {
        // Preferencia de voto (columna F)
        sheet.getCell(`F${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Listas!$A$1:$A$${preferencias.length}`],
          showErrorMessage: true,
          errorTitle: 'Preferencia inválida',
          error: 'Por favor selecciona una opción de la lista desplegable',
          showInputMessage: true,
          promptTitle: 'Preferencia de voto',
          prompt: 'Selecciona una opción de la lista',
        };

        // Barrio/Colonia (columna G)
        if (barrios.length > 0) {
          sheet.getCell(`G${i}`).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [`Listas!$B$1:$B$${barrios.length}`],
            showErrorMessage: true,
            errorTitle: 'Barrio inválido',
            error: 'Selecciona un barrio de la lista',
            showInputMessage: true,
            promptTitle: 'Barrio / Colonia',
            prompt: 'Selecciona un barrio de la lista',
          };
        }
      }

      // Generar buffer y descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `plantilla_personas_${new Date().toISOString().split('T')[0]}.xlsx`);

      setToastMensaje(`Plantilla descargada con ${barrios.length} barrios disponibles`);
      setToastVisible(true);
    } catch (err: any) {
      console.error(err);
      alert('Error al generar la plantilla: ' + err.message);
    }
  };

  const filtrados = staging.filter(s => {
    if (tabVista === 'validas') return s.estado === 'validado';
    if (tabVista === 'errores') return s.estado === 'error';
    return true;
  });

  const totalValidados = staging.filter(s => s.estado === 'validado').length;
  const totalErrores = staging.filter(s => s.estado === 'error').length;
  const totalPendientes = staging.filter(s => s.estado === 'pendiente').length;

  return (
    <div>
      <h1 className="header-title">Arenero de Importación</h1>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Sube un archivo CSV o Excel (.xlsx), previsualiza, valida y publica al sistema productivo.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '25px' }}>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #9F2241', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#9F2241' }}>{staging.length}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>En el arenero</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #2E7D32', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#2E7D32' }}>{totalValidados}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Validados ✓</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #C62828', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#C62828' }}>{totalErrores}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Con errores</div>
        </div>
        <div className="card" style={{ padding: '15px', textAlign: 'center', borderTop: '4px solid #F9A825', borderLeft: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#F9A825' }}>{totalPendientes}</div>
          <div style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Pendientes</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} className="btn-primary" disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={16} /> Subir archivo
        </button>
        <button onClick={descargarPlantillaXLSX}
          style={{ padding: '12px 20px', background: 'white', color: '#9F2241', border: '2px solid #9F2241', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileSpreadsheet size={16} /> Descargar Plantilla Excel
        </button>
        {staging.length > 0 && (
          <>
            <button onClick={validarTodo} disabled={loading}
              style={{ padding: '12px 20px', background: '#FFF8E1', color: '#F9A825', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} /> Validar Todo
            </button>
            <button onClick={limpiarArenero}
              style={{ padding: '12px 20px', background: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={16} /> Limpiar Arenero
            </button>
          </>
        )}
      </div>

      {staging.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', marginBottom: '15px', borderBottom: '2px solid #E0E0E0' }}>
          <button onClick={() => setTabVista('todas')} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: tabVista === 'todas' ? '3px solid #9F2241' : '3px solid transparent', color: tabVista === 'todas' ? '#9F2241' : '#666', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            Todas ({staging.length})
          </button>
          <button onClick={() => setTabVista('validas')} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: tabVista === 'validas' ? '3px solid #2E7D32' : '3px solid transparent', color: tabVista === 'validas' ? '#2E7D32' : '#666', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            Válidas ({totalValidados})
          </button>
          <button onClick={() => setTabVista('errores')} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: tabVista === 'errores' ? '3px solid #C62828' : '3px solid transparent', color: tabVista === 'errores' ? '#C62828' : '#666', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            Errores ({totalErrores})
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', gap: '10px', color: '#9F2241' }}>
          <Loader2 size={28} /> Procesando...
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <Database size={48} color="#9F2241" style={{ opacity: 0.4, marginBottom: '15px' }} />
          <h3 style={{ color: '#9F2241', marginBottom: '10px' }}>El arenero está vacío</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            Descarga la plantilla de Excel (con listas desplegables) y llénala con los datos.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {filtrados.map(s => {
            const barrioVinculado = s.barrio_colonia_id
              ? barrios.find(b => b.id === s.barrio_colonia_id)?.nombre
              : null;
            return (
              <div key={s.id} style={{
                background: 'white', padding: '14px', borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                borderLeft: `4px solid ${s.estado === 'validado' ? '#2E7D32' : s.estado === 'error' ? '#C62828' : '#F9A825'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '14px' }}>{s.nombre_completo}</strong>
                    <span style={{
                      fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold',
                      background: s.estado === 'validado' ? '#E8F5E9' : s.estado === 'error' ? '#FFEBEE' : '#FFF8E1',
                      color: s.estado === 'validado' ? '#2E7D32' : s.estado === 'error' ? '#C62828' : '#F9A825'
                    }}>
                      {s.estado}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '4px 16px', marginTop: '8px', fontSize: '12px', color: '#555' }}>
                    {s.telefono && <div><strong style={{ color: '#9F2241' }}>📞</strong> {s.telefono}</div>}
                    {s.correo_electronico && <div><strong style={{ color: '#9F2241' }}>✉️</strong> {s.correo_electronico}</div>}
                    {s.ocupacion && <div><strong style={{ color: '#9F2241' }}>💼</strong> {s.ocupacion}</div>}
                    {s.preferencia_voto && <div><strong style={{ color: '#9F2241' }}>🗳️</strong> {s.preferencia_voto}</div>}
                    {s.direccion && <div style={{ gridColumn: '1 / -1' }}><strong style={{ color: '#9F2241' }}>🏠</strong> {s.direccion}</div>}
                    {barrioVinculado && <div><strong style={{ color: '#9F2241' }}>📍</strong> {barrioVinculado}</div>}
                  </div>
                  {s.errores && Array.isArray(s.errores) && s.errores.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#C62828', marginTop: '10px', lineHeight: '1.5', padding: '8px 10px', background: '#FFEBEE', borderRadius: '6px', borderLeft: '3px solid #C62828' }}>
                      {s.errores.map((err: string, i: number) => <div key={i}>⚠️ {err}</div>)}
                    </div>
                  )}
                </div>
                <button onClick={() => eliminarStaging(s.id, s.nombre_completo)}
                  style={{ background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', padding: '6px' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {totalValidados > 0 && (
        <div style={{
          position: 'sticky', bottom: '20px', marginTop: '30px',
          background: 'white', padding: '15px 20px', borderRadius: '12px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap',
          border: '2px solid #2E7D32'
        }}>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', color: '#2E7D32', fontSize: '15px' }}>
              ✓ {totalValidados} registro{totalValidados !== 1 ? 's' : ''} listo{totalValidados !== 1 ? 's' : ''} para publicar
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
              Al publicar, se moverán al directorio de personas y se eliminarán del arenero.
            </p>
          </div>
          <button onClick={publicar} disabled={publicando} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 28px', fontSize: '15px' }}>
            {publicando ? <><Loader2 size={18} /> Publicando...</> : <><ArrowRight size={18} /> Pasar a ONLINE</>}
          </button>
        </div>
      )}

      {confirmModal.visible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderTop: `5px solid ${confirmModal.tipo === 'danger' ? '#C62828' : confirmModal.tipo === 'success' ? '#2E7D32' : '#F9A825'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ background: confirmModal.tipo === 'danger' ? '#FFEBEE' : confirmModal.tipo === 'success' ? '#E8F5E9' : '#FFF8E1', color: confirmModal.tipo === 'danger' ? '#C62828' : confirmModal.tipo === 'success' ? '#2E7D32' : '#F9A825', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {confirmModal.tipo === 'success' ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#333', wordBreak: 'break-word', lineHeight: '1.3' }}>{confirmModal.titulo}</h3>
              </div>
              <button onClick={cerrarConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '8px' }}>
                <X size={20} color="#999" />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '25px' }}>{confirmModal.mensaje}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cerrarConfirm} style={{ flex: 1, padding: '13px', background: '#F0F0F0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#666' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} style={{ flex: 1, padding: '13px', background: confirmModal.tipo === 'danger' ? '#C62828' : confirmModal.tipo === 'success' ? '#2E7D32' : '#F9A825', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Sí, confirmar</button>
            </div>
          </div>
        </div>
      )}

      <Toast mensaje={toastMensaje} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}