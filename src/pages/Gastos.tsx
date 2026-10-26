import { useEffect, useState } from 'react';
import { 
  Search, Trash2, Edit3, Plus, X, Loader2, 
  AlertTriangle, CheckCircle2, DollarSign, TrendingUp,
  Wallet, FileText, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';

interface Gasto {
  id: string;
  concepto: string;
  categoria: string;
  monto: number;
  proveedor: string | null;
  factura: string | null;
  fecha: string;
  seccion_electoral_id: string | null;
  created_at: string;
}

interface ConfirmModalData {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'danger' | 'success' | 'warning';
  onConfirm: () => void;
}

const CATEGORIAS = [
  { value: 'propaganda', label: 'Propaganda', color: '#9C27B0', icono: '📢' },
  { value: 'eventos', label: 'Eventos', color: '#2196F3', icono: '🎉' },
  { value: 'viaticos', label: 'Viáticos', color: '#FF9800', icono: '🚗' },
  { value: 'logistica', label: 'Logística', color: '#4CAF50', icono: '📦' },
  { value: 'personal', label: 'Personal', color: '#F44336', icono: '👥' },
  { value: 'otros', label: 'Otros', color: '#666', icono: '📋' },
];

const ALERTA_PORCENTAJE = 80;

export default function Gastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [filtrados, setFiltrados] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  
  const [gastoEditar, setGastoEditar] = useState<Gasto | null>(null);
  const [gastoNuevo, setGastoNuevo] = useState<any | null>(null);
  
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMensaje, setToastMensaje] = useState('');

  const [presupuestoTotal, setPresupuestoTotal] = useState(500000);
  const [modalConfig, setModalConfig] = useState(false);
  const [configTemp, setConfigTemp] = useState<{ presupuesto_total: string; nombre_candidato: string }>({
    presupuesto_total: '500000',
    nombre_candidato: '',
  });

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
      
      const [gastosRes, configRes] = await Promise.all([
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
        supabase.from('configuracion_campana').select('*').limit(1).maybeSingle(),
      ]);
      
      if (gastosRes.data) {
        setGastos(gastosRes.data as any);
        setFiltrados(gastosRes.data as any);
      }
      
      if (configRes.data) {
        const presupuesto = parseFloat(configRes.data.presupuesto_total) || 500000;
        setPresupuestoTotal(presupuesto);
        setConfigTemp({
          presupuesto_total: String(presupuesto),
          nombre_candidato: configRes.data.nombre_candidato || '',
        });
      }
      
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    let resultado = [...gastos];
    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(g =>
        g.concepto.toLowerCase().includes(q) ||
        (g.proveedor || '').toLowerCase().includes(q)
      );
    }
    if (filtroCategoria) resultado = resultado.filter(g => g.categoria === filtroCategoria);
    if (filtroMes) resultado = resultado.filter(g => g.fecha.startsWith(filtroMes));
    setFiltrados(resultado);
  }, [busqueda, filtroCategoria, filtroMes, gastos]);

  const abrirModalNuevo = () => {
    setGastoNuevo({
      concepto: '',
      categoria: 'propaganda',
      monto: '',
      proveedor: '',
      factura: '',
      fecha: new Date().toISOString().split('T')[0],
    });
  };

  const abrirModalConfig = () => {
    setConfigTemp({
      presupuesto_total: String(presupuestoTotal),
      nombre_candidato: configTemp.nombre_candidato,
    });
    setModalConfig(true);
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoNuevo) return;
    setGuardando(true);

    const { data, error } = await supabase
      .from('gastos')
      .insert([{
        concepto: gastoNuevo.concepto,
        categoria: gastoNuevo.categoria,
        monto: parseFloat(gastoNuevo.monto) || 0,
        proveedor: gastoNuevo.proveedor || null,
        factura: gastoNuevo.factura || null,
        fecha: gastoNuevo.fecha,
      }])
      .select()
      .single();

    if (error) {
      setToastMensaje('Error al crear: ' + error.message);
      setToastVisible(true);
    } else if (data) {
      setGastos([data as any, ...gastos]);
      setGastoNuevo(null);
      setToastMensaje(`¡Gasto de $${gastoNuevo.monto} registrado!`);
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gastoEditar) return;
    setGuardando(true);

    const { error } = await supabase
      .from('gastos')
      .update({
        concepto: gastoEditar.concepto,
        categoria: gastoEditar.categoria,
        monto: gastoEditar.monto,
        proveedor: gastoEditar.proveedor,
        factura: gastoEditar.factura,
        fecha: gastoEditar.fecha,
      })
      .eq('id', gastoEditar.id);

    if (error) {
      setToastMensaje('Error al guardar: ' + error.message);
      setToastVisible(true);
    } else {
      setGastos(gastos.map(g => g.id === gastoEditar.id ? gastoEditar : g));
      setGastoEditar(null);
      setToastMensaje('Gasto actualizado');
      setToastVisible(true);
    }
    setGuardando(false);
  };

  const handleEliminar = (id: string) => {
    mostrarConfirm(
      '¿Eliminar este gasto?',
      'Esta acción no se puede deshacer.',
      'danger',
      async () => {
        cerrarConfirm();
        const { error } = await supabase.from('gastos').delete().eq('id', id);
        if (error) {
          setToastMensaje('Error al eliminar: ' + error.message);
          setToastVisible(true);
        } else {
          setGastos(gastos.filter(g => g.id !== id));
          setToastMensaje('Gasto eliminado');
          setToastVisible(true);
        }
      }
    );
  };

  const handleGuardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const presupuestoNum = parseFloat(String(configTemp.presupuesto_total).trim());
    
    if (isNaN(presupuestoNum) || presupuestoNum <= 0) {
      setToastMensaje('Ingresa un presupuesto válido mayor a 0');
      setToastVisible(true);
      return;
    }
    
    setGuardando(true);
    
    const { data: existente } = await supabase
      .from('configuracion_campana')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (existente) {
      const { error } = await supabase
        .from('configuracion_campana')
        .update({
          presupuesto_total: presupuestoNum,
          nombre_candidato: configTemp.nombre_candidato,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existente.id);
      
      if (error) {
        setToastMensaje('Error al guardar: ' + error.message);
        setToastVisible(true);
      } else {
        setPresupuestoTotal(presupuestoNum);
        setModalConfig(false);
        setToastMensaje(`¡Presupuesto actualizado a $${presupuestoNum.toLocaleString('es-MX')}!`);
        setToastVisible(true);
      }
    } else {
      setToastMensaje('No hay configuración inicial. Ejecuta el SQL primero.');
      setToastVisible(true);
    }
    
    setGuardando(false);
  };

  const totalGastado = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
  const restante = presupuestoTotal - totalGastado;
  const porcentajeGastado = presupuestoTotal > 0 ? (totalGastado / presupuestoTotal) * 100 : 0;
  const excedePresupuesto = totalGastado > presupuestoTotal;
  const cercaDelTope = porcentajeGastado >= ALERTA_PORCENTAJE;

  const gastoPorCategoria = (cat: string) => gastos.filter(g => g.categoria === cat).reduce((s, g) => s + g.monto, 0);
  const getCategoriaInfo = (cat: string) => CATEGORIAS.find(c => c.value === cat) || CATEGORIAS[CATEGORIAS.length - 1];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', gap: '10px', color: '#00A651' }}>
        <Loader2 size={32} /> Cargando gastos...
      </div>
    );
  }

  return (
    <div>
      <h1 className="header-title">Gastos de Campaña</h1>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Control de gastos para cumplimiento del INE. Cada peso cuenta.
      </p>

      {excedePresupuesto && (
        <div style={{
          background: '#FFEBEE', borderLeft: '5px solid #C62828',
          padding: '15px', borderRadius: '8px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <AlertTriangle size={28} color="#C62828" />
          <div>
            <strong style={{ color: '#C62828', fontSize: '15px' }}>¡Presupuesto Excedido!</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#555' }}>
              Has gastado ${totalGastado.toLocaleString('es-MX')} de ${presupuestoTotal.toLocaleString('es-MX')}.
              Excedes por ${(totalGastado - presupuestoTotal).toLocaleString('es-MX')}.
            </p>
          </div>
        </div>
      )}

      {cercaDelTope && !excedePresupuesto && (
        <div style={{
          background: '#FFF8E1', borderLeft: '5px solid #F9A825',
          padding: '15px', borderRadius: '8px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <AlertTriangle size={24} color="#F9A825" />
          <div>
            <strong style={{ color: '#F9A825', fontSize: '14px' }}>Cerca del Tope Presupuestal</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#555' }}>
              Llevas el {porcentajeGastado.toFixed(1)}% del presupuesto. Restan ${restante.toLocaleString('es-MX')}.
            </p>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '25px'
      }}>
        <div className="card" style={{ padding: '18px', borderTop: '4px solid #00A651', borderLeft: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Wallet size={20} color="#00A651" />
            <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>TOTAL GASTADO</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00A651' }}>
            ${totalGastado.toLocaleString('es-MX')}
          </div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
            {gastos.length} registro{gastos.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="card" style={{ padding: '18px', borderTop: '4px solid #2196F3', borderLeft: 'none', position: 'relative' }}>
          <button
            onClick={abrirModalConfig}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              background: '#E3F2FD', border: 'none', color: '#2196F3',
              padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '11px', fontWeight: 'bold'
            }}
          >
            ✏️ Editar
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <DollarSign size={20} color="#2196F3" />
            <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>PRESUPUESTO</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2196F3' }}>
            ${presupuestoTotal.toLocaleString('es-MX')}
          </div>
          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
            Ciclo electoral 2026-2027
          </div>
        </div>

        <div className="card" style={{ 
          padding: '18px', borderTop: `4px solid ${excedePresupuesto ? '#C62828' : '#4CAF50'}`, borderLeft: 'none' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <TrendingUp size={20} color={excedePresupuesto ? '#C62828' : '#4CAF50'} />
            <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>RESTANTE</span>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: excedePresupuesto ? '#C62828' : '#4CAF50' }}>
            ${Math.abs(restante).toLocaleString('es-MX')}
          </div>
          <div style={{ marginTop: '8px', height: '6px', background: '#EEE', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(porcentajeGastado, 100)}%`, height: '100%',
              background: excedePresupuesto ? '#C62828' : cercaDelTope ? '#F9A825' : '#00A651',
              transition: 'width 0.5s'
            }} />
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
            {porcentajeGastado.toFixed(1)}% utilizado
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
        marginBottom: '25px'
      }}>
        {CATEGORIAS.map(cat => {
          const monto = gastoPorCategoria(cat.value);
          return (
            <div key={cat.value} className="card" style={{
              padding: '14px', textAlign: 'center',
              borderTop: `3px solid ${cat.color}`, borderLeft: 'none',
              opacity: monto > 0 ? 1 : 0.5
            }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{cat.icono}</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: cat.color }}>
                ${monto.toLocaleString('es-MX')}
              </div>
              <div style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', marginTop: '2px' }}>
                {cat.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#00A651' }}>
          <FileText size={18} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          {filtrados.length} {filtrados.length === 1 ? 'gasto' : 'gastos'}
          {gastos.length !== filtrados.length && <span style={{ color: '#999', fontWeight: 'normal' }}> (de {gastos.length})</span>}
        </p>
        <button onClick={abrirModalNuevo} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
          <Plus size={16} /> Nuevo Gasto
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '25px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Buscar concepto o proveedor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '11px 11px 11px 40px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.icono} {c.label}</option>)}
        </select>
        <input
          type="month"
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          style={{ padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '14px', background: 'white' }}
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Wallet size={40} color="#00A651" style={{ opacity: 0.5, marginBottom: '15px' }} />
          <p style={{ color: '#666', fontSize: '15px' }}>
            {gastos.length === 0 ? 'Aún no hay gastos registrados. Presiona "Nuevo Gasto" para comenzar.' : 'No se encontraron resultados.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
          {filtrados.map(g => {
            const catInfo = getCategoriaInfo(g.categoria);
            return (
              <div key={g.id} style={{
                background: 'white', borderRadius: '10px', padding: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${catInfo.color}`,
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      background: `${catInfo.color}20`,
                      color: catInfo.color,
                      width: '40px', height: '40px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '18px', flexShrink: 0
                    }}>
                      {catInfo.icono}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: '14px', color: '#333', fontWeight: 'bold', wordBreak: 'break-word' }}>
                        {g.concepto}
                      </h3>
                      <span style={{
                        display: 'inline-block', marginTop: '3px', padding: '2px 8px',
                        background: `${catInfo.color}20`, color: catInfo.color,
                        borderRadius: '10px', fontSize: '10px', fontWeight: 'bold'
                      }}>
                        {catInfo.label}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    background: catInfo.color, color: 'white',
                    padding: '6px 12px', borderRadius: '8px',
                    fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap'
                  }}>
                    ${g.monto.toLocaleString('es-MX')}
                  </div>
                </div>

                {g.proveedor && (
                  <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={12} color="#00A651" /> {g.proveedor}
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={12} /> {new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>

                {g.factura && (
                  <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                    Factura: {g.factura}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #EEE' }}>
                  <button onClick={() => setGastoEditar(g)} style={{
                    flex: 1, padding: '8px', background: '#F4F4F4', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#333',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                  }}>
                    <Edit3 size={14} /> Editar
                  </button>
                  <button onClick={() => handleEliminar(g.id)} style={{
                    padding: '8px 12px', background: '#FFEBEE', border: 'none', borderRadius: '6px',
                    cursor: 'pointer', color: '#C62828',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {gastoNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Nuevo Gasto</h3>
              <button onClick={() => setGastoNuevo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCrear} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Concepto *</label>
                <input required type="text" placeholder="Ej. Impresión de lonas" 
                  value={gastoNuevo.concepto}
                  onChange={(e) => setGastoNuevo({...gastoNuevo, concepto: e.target.value})} 
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Categoría *</label>
                <select value={gastoNuevo.categoria}
                  onChange={(e) => setGastoNuevo({...gastoNuevo, categoria: e.target.value})} style={inputStyle}>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.icono} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Monto (MXN) *</label>
                <input required type="text" inputMode="decimal" placeholder="0.00"
                  value={gastoNuevo.monto}
                  onChange={(e) => setGastoNuevo({...gastoNuevo, monto: e.target.value.replace(/[^0-9.]/g, '')})} 
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Proveedor</label>
                <input type="text" placeholder="Ej. Imprenta XYZ"
                  value={gastoNuevo.proveedor}
                  onChange={(e) => setGastoNuevo({...gastoNuevo, proveedor: e.target.value})} 
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Número de Factura</label>
                <input type="text" placeholder="Ej. A-12345"
                  value={gastoNuevo.factura}
                  onChange={(e) => setGastoNuevo({...gastoNuevo, factura: e.target.value})} 
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input required type="date"
                  value={gastoNuevo.fecha}
                  onChange={(e) => setGastoNuevo({...gastoNuevo, fecha: e.target.value})} 
                  style={inputStyle} />
              </div>

              <div style={{ 
                background: '#FFF8E1', padding: '10px', borderRadius: '6px', 
                borderLeft: '3px solid #F9A825', fontSize: '12px', color: '#555' 
              }}>
                <strong>Nota INE:</strong> Todos los gastos de campaña deben estar respaldados con factura. Guarda el comprobante físico.
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setGastoNuevo(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
                  disabled={guardando}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><CheckCircle2 size={16} /> Registrar Gasto</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {gastoEditar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Editar Gasto</h3>
              <button onClick={() => setGastoEditar(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Concepto *</label>
                <input required type="text" value={gastoEditar.concepto}
                  onChange={(e) => setGastoEditar({...gastoEditar, concepto: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Categoría *</label>
                <select value={gastoEditar.categoria}
                  onChange={(e) => setGastoEditar({...gastoEditar, categoria: e.target.value})} style={inputStyle}>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.icono} {c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Monto (MXN) *</label>
                <input required type="number" step="0.01" min="0"
                  value={gastoEditar.monto}
                  onChange={(e) => setGastoEditar({...gastoEditar, monto: parseFloat(e.target.value) || 0})} 
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Proveedor</label>
                <input type="text" value={gastoEditar.proveedor || ''}
                  onChange={(e) => setGastoEditar({...gastoEditar, proveedor: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Número de Factura</label>
                <input type="text" value={gastoEditar.factura || ''}
                  onChange={(e) => setGastoEditar({...gastoEditar, factura: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input required type="date" value={gastoEditar.fecha}
                  onChange={(e) => setGastoEditar({...gastoEditar, fecha: e.target.value})} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setGastoEditar(null)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary" 
                  style={{ flex: 1 }} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ background: 'white', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#00A651', fontSize: '18px', margin: 0 }}>Configurar Presupuesto</h3>
              <button onClick={() => setModalConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleGuardarConfiguracion} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Presupuesto Total de Campaña (MXN) *</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={configTemp.presupuesto_total}
                  onChange={(e) => {
                    const soloNumeros = e.target.value.replace(/[^0-9.]/g, '');
                    setConfigTemp({ ...configTemp, presupuesto_total: soloNumeros });
                  }}
                  onFocus={(e) => e.target.select()}
                  style={inputStyle}
                  placeholder="500000"
                />
                <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  Este es el monto máximo autorizado por el INE para tu campaña.
                </p>
              </div>
              <div>
                <label style={labelStyle}>Nombre del Candidato</label>
                <input
                  type="text"
                  value={configTemp.nombre_candidato}
                  onChange={(e) => setConfigTemp({ ...configTemp, nombre_candidato: e.target.value })}
                  style={inputStyle}
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div style={{
                background: '#FFF8E1', padding: '10px', borderRadius: '6px',
                borderLeft: '3px solid #F9A825', fontSize: '12px', color: '#555'
              }}>
                <strong>Importante:</strong> El presupuesto debe coincidir con lo autorizado por el INE. Consulta con tu contador.
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalConfig(false)} style={btnSecundario}>Cancelar</button>
                <button type="submit" className="btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  disabled={guardando}>
                  {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar Presupuesto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.visible && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderTop: `5px solid ${confirmModal.tipo === 'danger' ? '#C62828' : '#00A651'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div style={{ background: confirmModal.tipo === 'danger' ? '#FFEBEE' : '#E8F5E9', color: confirmModal.tipo === 'danger' ? '#C62828' : '#00A651', width: '46px', height: '46px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {confirmModal.tipo === 'success' ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#333' }}>{confirmModal.titulo}</h3>
              </div>
              <button onClick={cerrarConfirm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#999" />
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.6', marginBottom: '25px' }}>{confirmModal.mensaje}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cerrarConfirm} style={{ flex: 1, padding: '13px', background: '#F0F0F0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#666' }}>Cancelar</button>
              <button onClick={confirmModal.onConfirm} style={{ flex: 1, padding: '13px', background: confirmModal.tipo === 'danger' ? '#C62828' : '#00A651', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Sí, confirmar</button>
            </div>
          </div>
        </div>
      )}

      <Toast mensaje={toastMensaje} visible={toastVisible} onClose={() => setToastVisible(false)} />
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #E0E0E0', fontSize: '15px', boxSizing: 'border-box' };
const btnSecundario: React.CSSProperties = { flex: 1, padding: '12px', background: '#EEE', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' };