import { X, Shield } from 'lucide-react';
import { ORION_CONFIG } from '../lib/config';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAceptar?: () => void;
  mostrarBotonAceptar?: boolean;
}

export default function AvisoPrivacidad({ visible, onClose, onAceptar, mostrarBotonAceptar = false }: Props) {
  if (!visible) return null;

  const legal = ORION_CONFIG.legal;
  const org = ORION_CONFIG.organizacionNombre;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '15px' }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', borderTop: '5px solid #00A651' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, #00A651 0%, #0066CC 100%)', color: 'white', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#00A651', fontSize: '20px' }}>Aviso de Privacidad</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                {org.toUpperCase()} · Activismo Ciudadano
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#999" />
          </button>
        </div>

        <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.7' }}>
          <p><strong>1. Responsable del Tratamiento</strong><br />
          El <strong>RESPONSABLE</strong> del tratamiento de sus datos personales es <strong>{legal?.responsableNombre || org}</strong>,
          con domicilio en {legal?.responsableDomicilio || 'Tula de Allende, Hidalgo, México'}. Para ejercer sus derechos ARCO o cualquier consulta
          relacionada con sus datos, puede escribir a <strong>{legal?.responsableContactoARCO || 'privacidad@tu-dominio.com'}</strong>.</p>

          <p><strong>2. Encargado del Tratamiento (Plataforma Tecnológica)</strong><br />
          La plataforma tecnológica es operada por <strong>{legal?.encargadoNombre || 'ORION Campaign Intelligence'}</strong>, quien actúa
          como <strong>ENCARGADO</strong> del tratamiento y únicamente procesa los datos conforme a las
          instrucciones del Responsable, sin definir finalidades propias.</p>

          <p><strong>3. Finalidad del Tratamiento</strong><br />
          Los datos personales recabados serán utilizados para:</p>
          <ul style={{ paddingLeft: '25px', marginBottom: '12px' }}>
            <li>Organización territorial y activismo ciudadano</li>
            <li>Contacto con simpatizantes y ciudadanos del municipio</li>
            <li>Análisis estadístico para la toma de decisiones de política pública</li>
            <li>Envío de información sobre propuestas y actividades del movimiento</li>
            <li>Actividades propias del proceso electoral en curso</li>
          </ul>
          <p>No serán utilizados para fines distintos a los aquí señalados.</p>

          <p><strong>4. Datos Recabados</strong><br />
          Nombre completo, teléfono, correo electrónico, dirección, ocupación, <strong>preferencia electoral</strong>,
          temas de interés y geolocalización (en el caso de encuestadores y brigadistas).</p>

          <p style={{ background: '#FFF8E1', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #F9A825' }}>
            <strong>⚠️ Sobre la preferencia electoral:</strong> Este dato se considera información sensible
            en el contexto político-electoral. Al proporcionarlo, usted otorga su <strong>consentimiento expreso
            y específico</strong> para su tratamiento. Puede negarse a proporcionarlo sin que ello afecte la
            prestación del servicio.
          </p>

          <p><strong>5. Destinatarios y Encargados Tecnológicos</strong><br />
          Para operar la plataforma, el Responsable se apoya en los siguientes Encargados:</p>
          <ul style={{ paddingLeft: '25px', marginBottom: '12px' }}>
            <li><strong>Supabase Inc.</strong> (base de datos y autenticación) — servidores en EE.UU.</li>
            <li><strong>Vercel Inc.</strong> (hosting del frontend) — servidores en EE.UU.</li>
            <li><strong>Sentry</strong> (monitoreo de errores) — servidores en EE.UU.</li>
            <li><strong>DeepSeek</strong> (procesamiento de IA) — servidores en la República Popular China.
              Solo se envían <strong>datos agregados y anonimizados</strong> (métricas, no datos personales individuales).</li>
            <li><strong>{legal?.proveedorGeocoding || 'Photon (Komoot GmbH, Alemania)'}</strong> — recibe las coordenadas GPS para traducirlas a dirección postal.
              Se envían únicamente coordenadas, sin nombre ni otro dato personal.</li>
          </ul>
          <p>La transferencia internacional a DeepSeek se realiza con base en su consentimiento expreso.
          Si no desea que sus datos agregados se procesen por IA, puede solicitarlo al Responsable.</p>

          <p><strong>6. Plazo de Conservación</strong><br />
          Sus datos se conservarán durante <strong>{legal?.plazoConservacion || '36 meses posteriores al término del ciclo electoral'}</strong>, salvo que usted
          solicite su eliminación antes o exista una obligación legal de conservarlos por más tiempo.</p>

          <p><strong>7. Derechos ARCO</strong><br />
          Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> al tratamiento
          de sus datos personales. Para ejercerlos, escriba a <strong>{legal?.responsableContactoARCO || 'privacidad@tu-dominio.com'}</strong>
          indicando su nombre completo, el derecho que desea ejercer y un documento que acredite su identidad.
          El Responsable responderá en un plazo máximo de 20 días hábiles.</p>

          <p><strong>8. Revocación del Consentimiento</strong><br />
          En cualquier momento podrá revocar el consentimiento otorgado, mediante solicitud por escrito
          a <strong>{legal?.responsableContactoARCO || 'privacidad@tu-dominio.com'}</strong>. La revocación no tendrá efectos retroactivos.</p>

          <p><strong>9. Medidas de Seguridad</strong><br />
          El sistema cuenta con medidas técnicas, administrativas y físicas para proteger sus datos:</p>
          <ul style={{ paddingLeft: '25px', marginBottom: '12px' }}>
            <li>Encriptación TLS en tránsito y en reposo en servidores en la nube</li>
            <li>Control de acceso por roles (RLS) — cada usuario solo ve los datos de su barrio o área asignada</li>
            <li><strong>Bitácora de cambios</strong> (INSERT/UPDATE/DELETE) con IP y usuario; no se registran consultas de lectura</li>
            <li>Servidores con certificación internacional (SOC 2, ISO 27001)</li>
          </ul>
          <p style={{ background: '#FFF8E1', padding: '10px', borderRadius: '6px', borderLeft: '3px solid #F9A825' }}>
            <strong>⚠️ Almacenamiento local:</strong> Cuando un brigadista captura datos sin conexión,
            estos se guardan temporalmente en el navegador del dispositivo. <strong>Ese almacenamiento local
            NO está cifrado</strong>. Por ello, el dispositivo debe ser de uso exclusivo del personal autorizado
            y protegido con contraseña. Los datos locales se eliminan al sincronizarse.
          </p>

          <p><strong>10. Cambios al Aviso</strong><br />
          Cualquier modificación se notificará en los canales oficiales de {org} y se publicará en esta plataforma.</p>

          <p><strong>11. Ley Aplicable y Autoridad</strong><br />
          Este Aviso se rige por la <strong>Ley Federal de Protección de Datos Personales en Posesión
          de los Particulares (LFPDPPP)</strong> vigente en México. Si considera que sus derechos han sido
          vulnerados, puede acudir a la autoridad federal en materia de protección de datos.</p>

          <div style={{ background: '#E8F5E9', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #00A651', marginTop: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#333' }}>
              <strong>Nuestro compromiso:</strong> La información de los ciudadanos es sagrada.
              Trabajamos con transparencia, honorabilidad y respeto absoluto por la privacidad.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '12px 24px', background: '#F0F0F0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', color: '#666' }}>
            Cerrar
          </button>
          {mostrarBotonAceptar && onAceptar && (
            <button onClick={() => { onAceptar(); onClose(); }} className="btn-primary" style={{ padding: '12px 24px', fontSize: '14px', background: 'linear-gradient(135deg, #00A651 0%, #0066CC 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Acepto el Aviso de Privacidad
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
