// src/lib/syncManager.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// ... (el resto de tu archivo Storage, Network, UUID, Cache, Queue se mantiene igual) ...

// ============================================================
// 6) MOTOR DE SINCRONIZACIÓN CON BATCHING (IDEMPOTENTE)
// ============================================================
// ... (engineStarted, engineInterval, listeners, estadoMotor, publicarEstado, limpiarPayload se mantienen igual) ...

const BATCH_SIZE = 50;

const ejecutarOperacion = async (op: any) => {
  const { type, table, payload, recordId } = op;
  if (type === 'INSERT') {
    // 🚀 CAMBIO CLAVE: Usamos UPSERT con onConflict en el 'id'
    // Si el id ya existe, actualiza el registro (o lo ignora si es idéntico).
    // Si no existe, lo inserta.
    const { error } = await supabase
      .from(table)
      .upsert([limpiarPayload(payload)], { onConflict: 'id' });
    if (error) throw error;
  } else if (type === 'UPDATE') {
    const { error } = await supabase
      .from(table)
      .update(limpiarPayload(payload))
      .eq('id', recordId);
    if (error) throw error;
  } else if (type === 'DELETE') {
    const { error } = await supabase.from(table).delete().eq('id', recordId);
    if (error) throw error;
  }
};

// ... (syncNow, iniciarMotorSync, offlineInsert, offlineUpdate, useSyncStatus, SyncProvider, useSync se mantienen igual) ...
