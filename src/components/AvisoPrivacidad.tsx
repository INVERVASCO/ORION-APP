import { X, Shield, AlertTriangle } from 'lucide-react';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAceptar?: () => void;
  mostrarBotonAceptar?: boolean;
}

export default function AvisoPrivacidad({ visible, onClose, onAceptar, mostrarBotonAceptar = false }: Props) {
  if (!visible) return null;

  return (
    <div style={{ 
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', 
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      zIndex: 3000, padding: '15px' 
    }}>
      <div style={{ 
        background: 'white', padding: '30px', borderRadius: '12px', 
        width: '100%', maxWidth: '750px', maxHeight: '90vh', 
        overflowY: 'auto', borderTop: '5px solid #00A651'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #00A651 0%, #0066CC 100%)', 
              color: 'white', width: '50px', height: '50px', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', flexShrink: 0
            }}>
              <Shield size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#00A651', fontSize: '20px' }}>
                Aviso de Privacidad
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                UNIDOS X TULA · Activismo Ciudadano
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#999" />
          </button>
        </div>

        <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.7' }}>
          <p><strong>1. Responsable del Tratamiento de Datos</strong><br />
          El movimiento ciudadano <strong>UNIDOS X TULA</strong>, con domicilio en Tula de Allende, Hidalgo, México, 
          es el responsable del tratamiento de los datos personales que usted proporcione a través de esta plataforma.</p>

          <p><strong>2. Finalidad del Tratamiento</strong><br />
          Los datos personales recabados serán utilizados exclusivamente para fines de:
          </p>
          <ul style={{ paddingLeft: '25px', marginBottom: '12px' }}>
            <li>Organización territorial y activismo ciudadano</li>
            <li>Contacto con simpatizantes y ciudadanos del municipio</li>
            <li>Análisis estadístico para la toma de decisiones de política pública</li>
            <li>Envío de información relevante sobre propuestas y actividades del movimiento</li>
            <li>Actividades propias del proceso electoral 2026-2027</li>
          </ul>
          <p>En ningún caso serán utilizados para fines distintos a los aquí señalados.</p>

          <p><strong>3. Datos Recabados</strong><br />
          Los datos que podremos recabar incluyen: nombre completo, teléfono, correo electrónico, 
          dirección, ocupación, preferencia electoral, temas de interés y demás información que usted 
          proporcione voluntariamente a través de nuestros brigadistas o de esta plataforma digital.</p>

          <p><strong>4. Transferencia de Datos</strong><br />
          Sus datos personales <strong>NO serán transferidos, vendidos, compartidos ni utilizados</strong> 
          por terceros ajenos a UNIDOS X TULA. La plataforma tecnológica es operada por un 
          proveedor externo (Encargado del Tratamiento) que se compromete contractualmente a no acceder 
          a la información para fines distintos al mantenimiento técnico del sistema, y que opera bajo 
          estrictos protocolos de confidencialidad.</p>

          <p><strong>5. Derechos ARCO</strong><br />
          Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> al tratamiento de 
          sus datos personales (Derechos ARCO). Para ejercerlos, puede contactar al equipo de UNIDOS X TULA 
          a través de los canales oficiales de comunicación del movimiento.</p>

          <p><strong>6. Revocación del Consentimiento</strong><br />
          En cualquier momento, usted podrá revocar el consentimiento otorgado para el tratamiento de sus 
          datos personales, mediante solicitud por escrito dirigida al responsable.</p>

          <p><strong>7. Seguridad de los Datos</strong><br />
          El sistema cuenta con medidas de seguridad técnicas, administrativas y físicas para proteger 
          sus datos contra daño, pérdida, alteración, destrucción o uso no autorizado, incluyendo:
          </p>
          <ul style={{ paddingLeft: '25px', marginBottom: '12px' }}>
            <li>Encriptación de la información en tránsito y en reposo</li>
            <li>Control de acceso basado en roles (RLS) por barrio/colonia</li>
            <li>Bitácora de auditoría que registra quién consulta, edita o elimina información</li>
            <li>Servidores con certificación internacional de seguridad</li>
          </ul>

          <p><strong>8. Limitación del Uso o Divulgación</strong><br />
          El personal de UNIDOS X TULA que tenga acceso a sus datos está capacitado y obligado a 
          mantener la confidencialidad, y su acceso está limitado a las funciones que desempeñan.</p>

          <p><strong>9. Cambios al Aviso</strong><br />
          Cualquier modificación a este aviso será notificada a través de los medios oficiales de 
          UNIDOS X TULA y publicada en esta plataforma.</p>

          <p><strong>10. Ley Aplicable</strong><br />
          Este Aviso de Privacidad se rige por lo dispuesto en la <strong>Ley Federal de Protección de 
          Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> y su Reglamento.</p>

          <div style={{ 
            background: '#FFF8E1', padding: '14px', borderRadius: '8px', 
            borderLeft: '4px solid #F9A825', marginTop: '20px',
            display: 'flex', alignItems: 'flex-start', gap: '10px'
          }}>
            <AlertTriangle size={18} color="#F9A825" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '12px' }}>
              <strong>Importante:</strong> Al marcar la casilla de aceptación, usted otorga su consentimiento 
              libre, expreso e informado para el tratamiento de sus datos personales conforme a lo 
              establecido en este Aviso de Privacidad y en la LFPDPPP.
            </p>
          </div>

          <div style={{ 
            background: '#E8F5E9', padding: '14px', borderRadius: '8px', 
            borderLeft: '4px solid #00A651', marginTop: '12px'
          }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#333' }}>
              <strong>Nuestro compromiso:</strong> En UNIDOS X TULA creemos que la información de los 
              ciudadanos es sagrada. Tu confianza es nuestra prioridad. Trabajamos con transparencia, 
              honorabilidad y respeto absoluto por la privacidad.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            style={{ 
              padding: '12px 24px', background: '#F0F0F0', border: 'none', 
              borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', 
              fontSize: '14px', color: '#666' 
            }}
          >
            Cerrar
          </button>
          {mostrarBotonAceptar && onAceptar && (
            <button 
              onClick={() => { onAceptar(); onClose(); }} 
              className="btn-primary"
              style={{ 
                padding: '12px 24px', fontSize: '14px',
                background: 'linear-gradient(135deg, #00A651 0%, #0066CC 100%)',
                color: 'white', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              Acepto el Aviso de Privacidad
            </button>
          )}
        </div>
      </div>
    </div>
  );
}