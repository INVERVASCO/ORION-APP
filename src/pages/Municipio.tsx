import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Loader2, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Barrio {
  id: string;
  nombre: string;
  tipo: string;
}

export default function Municipio() {
  const navigate = useNavigate();
  const [barrios, setBarrios] = useState<Barrio[]>([]);
  const [barriosFiltrados, setBarriosFiltrados] = useState<Barrio[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBarrios = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('barrios_colonias')
        .select('id, nombre, tipo')
        .order('nombre', { ascending: true });

      if (error) {
        setError('Error al cargar los barrios: ' + error.message);
        console.error(error);
      } else {
        setBarrios(data || []);
        setBarriosFiltrados(data || []);
      }
      setLoading(false);
    };

    fetchBarrios();
  }, []);

  // Filtro de búsqueda
  useEffect(() => {
    if (busqueda.trim() === '') {
      setBarriosFiltrados(barrios);
    } else {
      const filtro = busqueda.toLowerCase();
      setBarriosFiltrados(
        barrios.filter(b => 
          b.nombre.toLowerCase().includes(filtro) || 
          b.tipo.toLowerCase().includes(filtro)
        )
      );
    }
  }, [busqueda, barrios]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', color: '#9F2241' }}>
        <Loader2 size={40} />
        <p style={{ marginLeft: '10px', fontSize: '18px' }}>Cargando barrios y colonias...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="header-title">Municipio: Tula de Allende</h1>
      <p style={{ marginBottom: '20px' }}>
        Se encontraron <strong>{barrios.length}</strong> barrios, colonias y localidades. Selecciona uno para gestionar su estructura:
      </p>

      {/* Barra de búsqueda */}
      <div style={{ position: 'relative', marginBottom: '25px', maxWidth: '500px' }}>
        <Search size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: '#999' }} />
        <input
          type="text"
          placeholder="Buscar barrio, colonia o localidad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 12px 12px 40px',
            borderRadius: '6px',
            border: '1px solid #E0E0E0',
            fontSize: '16px'
          }}
        />
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div className="grid-menu">
        {barriosFiltrados.map((barrio) => (
          <div 
            key={barrio.id} 
            className="grid-item"
            onClick={() => navigate(`/municipio/${barrio.id}`)}
          >
            <MapPin size={30} color="#9F2241" style={{ marginBottom: '10px' }} />
            <h3>{barrio.nombre}</h3>
            <p style={{ fontSize: '14px', color: '#666', textTransform: 'capitalize' }}>
              {barrio.tipo}
            </p>
          </div>
        ))}
      </div>

      {barriosFiltrados.length === 0 && !loading && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '30px' }}>
          No se encontraron resultados para "{busqueda}"
        </p>
      )}
    </div>
  );
}