// @ts-nocheck
import { useEffect, useState } from 'react';
import { Search, User, Phone, Briefcase, MapPin, Download, Edit3, Trash2, X, Loader2, Users, CheckCircle2, AlertTriangle, Shield, Plus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Toast from '../components/Toast';
import AvisoPrivacidad from '../components/AvisoPrivacidad';
import { offlineInsert } from '../lib/syncManager'; // <-- IMPORTAMOS OFFLINE INSERT

export default function Personas() {
  // ... (Los estados: personas, loading, busqueda, etc. se quedan igual) ...

  const handleCrearPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaNueva) return;

    if (!aceptoAviso) {
      setToastMensaje('Debes confirmar el Aviso de Privacidad (LFPDPPP).');
      setToastVisible(true);
      return;
    }

    setGuardando(true);

    const nuevaPersona = {
      nombre_completo: personaNueva.nombre_completo,
      telefono: personaNueva.telefono || null,
      correo_electronico: personaNueva.correo_electronico || null,
      ocupacion: personaNueva.ocupacion || null,
      direccion: personaNueva.direccion || null,
      barrio_colonia_id: personaNueva.barrio_colonia_id || null,
      preferencia_voto: personaNueva.preferencia_voto || null,
      consentimiento_aceptado: true,
      fecha_consentimiento: new Date().toISOString(),
      origen_captura: 'Captura manual',
      created_at: new Date().toISOString(),
      barrios_colonias: barrios.find(b => b.id === personaNueva.barrio_colonia_id) ? { nombre: barrios.find(b => b.id === personaNueva.barrio_colonia_id)?.nombre } : null
    };

    // ✅ AQUÍ USAMOS EL MODO OFFLINE
    const res = await offlineInsert('personas', nuevaPersona);

    if (res.ok) {
      setPersonas([nuevaPersona, ...personas]);
      setPersonaNueva(null);
      setAceptoAviso(false);
      setToastMensaje(res.queued ? '📡 Sin señal: Persona guardada localmente.' : `¡${nuevaPersona.nombre_completo} registrado con éxito!`);
      setToastVisible(true);
    }
    setGuardando(false);
  };

  // ... (El resto del componente se queda igual) ...
