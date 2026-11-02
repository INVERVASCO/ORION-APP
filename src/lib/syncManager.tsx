// src/lib/syncManager.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// ============================================================
// 1) STORAGE — IndexedDB NATIVO
// ============================================================
const DB_NAME = 'orion_db';
const DB_VERSION = 1;
const STORES = {
  queue: 'queue',
  cache: 'cache',
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.queue)) {
        db.createObjectStore(STORES.queue, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.cache)) {
        db.createObjectStore(STORES.cache, { keyPath: 'key' });
      }
    };
  });
};

const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.cache, 'readonly');
        const store = tx.objectStore(STORES.cache);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => reject(request.error);
      });
    } catch { return null; }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.cache, 'readwrite');
        const store = tx.objectStore(STORES.cache);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {}
  },
};

// ============================================================
// 2) NETWORK
// ============================================================
const Network = {
  async isConnected(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') return navigator.onLine;
      return true;
    } catch { return true; }
  },
  subscribe(callback: (online: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const onOnline = () => callback(true);
    const onOffline = () => callback(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  },
};

// ============================================================
// 3) UUID
// ============================================================
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ============================================================
// 4) COLA DE OPERACIONES (BLINDADA)
// ============================================================
const MAX_INTENTOS = 5;

const Queue = {
  async getAll(): Promise<any[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.queue, 'readonly');
        const store = tx.objectStore(STORES.queue);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch { return []; }
  },

  // 🚀 FIX: Agregar directamente sin leer toda la cola (evita colisiones)
  async add(op: any): Promise<any> {
    const item = { 
      id: generateUUID(), 
      timestamp: Date.now(), 
      attempts: 0, 
      status: 'PENDING', 
      error: null, 
      ...op 
    };
    
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.queue, 'readwrite');
      const store = tx.objectStore(STORES.queue);
      const request = store.add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  },

  async remove(id: string) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.queue, 'readwrite');
      const store = tx.objectStore(STORES.queue);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async update(id: string, patch: any) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.queue, 'readwrite');
      const store = tx.objectStore(STORES.queue);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated = { ...getReq.result, ...patch };
          const putReq = store.put(updated);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },

  async size(): Promise<number> {
    const queue = await this.getAll();
    return queue.length;
  },
};

// ============================================================
// 5) MOTOR DE SINCRONIZACIÓN
// ============================================================
let engineStarted = false;
let engineInterval: any = null;
const listeners = new Set<(estado: any) => void>();

const estadoMotor = {
  isOnline: true,
  queueSize: 0,
  syncing: false,
  lastSyncAt: null as Date | null,
  lastError: null as string | null,
};

const publicarEstado = () => {
  listeners.forEach((fn) => {
    try { fn({ ...estadoMotor }); } catch (_) {}
  });
};

const limpiarPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  const { _localId, barrios_colonias, personas, secciones_electorales, casillas, perfiles, ...limpio } = payload;
  return limpio;
};

const BATCH_SIZE = 50;

const ejecutarOperacion = async (op: any) => {
  const { type, table, payload, recordId } = op;
  
  if (type === 'INSERT') {
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

export const syncNow = async () => {
  if (estadoMotor.syncing) return { ok: false, reason: 'already_syncing' };
  const online = await Network.isConnected();
  estadoMotor.isOnline = online;
  if (!online) {
    publicarEstado();
    return { ok: false, reason: 'offline' };
  }

  estadoMotor.syncing = true;
  publicarEstado();

  const queue = await Queue.getAll();
  // Solo procesamos PENDING. Los DEAD se ignoran.
  const pendientes = queue.filter((q: any) => q.status === 'PENDING');

  let exitos = 0;
  let fallidos = 0;

  for (let i = 0; i < pendientes.length; i += BATCH_SIZE) {
    const lote = pendientes.slice(i, i + BATCH_SIZE);
    for (const op of lote) {
      try {
        await ejecutarOperacion(op);
        await Queue.remove(op.id);
        exitos++;
      } catch (err: any) {
        fallidos++;
        const attempts = (op.attempts || 0) + 1;
        // 🚀 FIX: Si supera el máximo, pasa a DEAD y ya no se reintenta.
        await Queue.update(op.id, {
          attempts,
          status: attempts >= MAX_INTENTOS ? 'DEAD' : 'PENDING',
          error: err?.message || String(err),
        });
      }
    }
    if (i + BATCH_SIZE < pendientes.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  estadoMotor.queueSize = await Queue.size();
  estadoMotor.syncing = false;
  estadoMotor.lastSyncAt = new Date();
  estadoMotor.lastError = fallidos > 0 ? `${fallidos} op(s) fallida(s)` : null;
  publicarEstado();
  return { ok: true, exitos, fallidos };
};

const iniciarMotorSync = () => {
  if (engineStarted) return;
  engineStarted = true;

  Network.subscribe(async (online) => {
    estadoMotor.isOnline = online;
    publicarEstado();
    if (online) setTimeout(() => syncNow(), 500);
  });

  Network.isConnected().then((online) => {
    estadoMotor.isOnline = online;
    publicarEstado();
    if (online) syncNow();
  });

  engineInterval = setInterval(async () => {
    const online = await Network.isConnected();
    estadoMotor.isOnline = online;
    if (online && (await Queue.size()) > 0) syncNow();
  }, 30000);
};

// ============================================================
// 6) API OFFLINE-AWARE
// ============================================================
export const offlineInsert = async (table: string, payload: any) => {
  const localId = generateUUID();
  const payloadFinal = {
    ...payload,
    id: payload.id || localId,
    _localId: localId,
  };
  
  const op = await Queue.add({
    type: 'INSERT',
    table,
    payload: payloadFinal,
    localId,
  });
  
  estadoMotor.queueSize = await Queue.size();
  publicarEstado();
  
  const online = await Network.isConnected();
  if (online) setTimeout(() => syncNow(), 50);
  
  return { ok: true, queued: !online, id: localId, queueId: op.id };
};

export const offlineUpdate = async (table: string, recordId: string, payload: any) => {
  await Queue.add({ type: 'UPDATE', table, recordId, payload });
  estadoMotor.queueSize = await Queue.size();
  publicarEstado();
  const online = await Network.isConnected();
  if (online) setTimeout(() => syncNow(), 50);
  return { ok: true, queued: !online };
};

// ============================================================
// 7) HOOKS DE REACT
// ============================================================
export const useSyncStatus = () => {
  const [estado, setEstado] = useState({ ...estadoMotor });

  useEffect(() => {
    const listener = (nuevo: any) => setEstado({ ...nuevo });
    listeners.add(listener);
    Queue.size().then((n) => {
      estadoMotor.queueSize = n;
      setEstado({ ...estadoMotor });
    });
    return () => { listeners.delete(listener); };
  }, []);

  return { ...estado, syncNow };
};

const SyncContext = createContext<any>(null);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const status = useSyncStatus();
  useEffect(() => { iniciarMotorSync(); }, []);
  return <SyncContext.Provider value={status}>{children}</SyncContext.Provider>;
};

export const useSync = () => useContext(SyncContext);
