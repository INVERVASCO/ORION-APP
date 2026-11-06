import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const DB_NAME = 'orion_db';
const DB_VERSION = 1;
const STORES = { queue: 'queue', cache: 'cache' };

let dbPromise: Promise<IDBDatabase> | null = null;
const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.queue)) db.createObjectStore(STORES.queue, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.cache)) db.createObjectStore(STORES.cache, { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); dbPromise = null; };
      db.onclose = () => { dbPromise = null; };
      resolve(db);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
};

const Network = {
  async isConnected(): Promise<boolean> {
    try { return typeof navigator !== 'undefined' ? navigator.onLine : true; } catch { return true; }
  },
  subscribe(callback: (online: boolean) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const onOnline = () => callback(true);
    const onOffline = () => callback(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  },
};

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

const MAX_INTENTOS = 5;

const Queue = {
  async getAll(): Promise<any[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.queue, 'readonly');
        const request = tx.objectStore(STORES.queue).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch { return []; }
  },
  async add(op: any): Promise<any> {
    const item = { id: generateUUID(), timestamp: Date.now(), attempts: 0, status: 'PENDING', error: null, ...op };
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.queue, 'readwrite');
      const request = tx.objectStore(STORES.queue).add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  },
  async remove(id: string) {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.queue, 'readwrite');
      const request = tx.objectStore(STORES.queue).delete(id);
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
          const putReq = store.put({ ...getReq.result, ...patch });
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },
  async size(): Promise<number> {
    const q = await this.getAll();
    return q.length;
  }
};

// 🚀 FIX: Cerrar la conexión antes de borrar
export const borrarBaseLocal = async (): Promise<void> => {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch (_) {}
    dbPromise = null;
  }

  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, 2000);
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => { clearTimeout(t); resolve(); };
    req.onerror = req.onblocked = () => { clearTimeout(t); resolve(); };
  });
};

export const getQueueStats = async () => {
  const db = await openDB();
  const all: any[] = await new Promise((res, rej) => {
    const r = db.transaction(STORES.queue, 'readonly').objectStore(STORES.queue).getAll();
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return { pending: all.filter(o => o.status === 'PENDING').length, dead: all.filter(o => o.status === 'DEAD').length, total: all.length };
};

export const exportarColaMuerta = async () => {
  const db = await openDB();
  const all: any[] = await new Promise((res, rej) => {
    const r = db.transaction(STORES.queue, 'readonly').objectStore(STORES.queue).getAll();
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const dead = all.filter(o => o.status === 'DEAD');
  if (dead.length === 0) return;
  
  const blob = new Blob([JSON.stringify(dead, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orion_datos_fallidos_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const clasificar = (err: any): 'RED' | 'AUTH' | 'PERMANENTE' | 'TEMPORAL' => {
  const msg = String(err?.message || ''), code = String(err?.code || '');
  if (/failed to fetch|networkerror|load failed|timeout/i.test(msg)) return 'RED';
  if (err?.status === 401 || code === 'PGRST301' || /jwt/i.test(msg)) return 'AUTH';
  if (code === '23503') return 'TEMPORAL'; 
  if (code.startsWith('23') || code.startsWith('22') || code === '42501') return 'PERMANENTE';
  return 'TEMPORAL';
};

let engineStarted = false;
let engineInterval: any = null;
const listeners = new Set<(estado: any) => void>();
const estadoMotor = { isOnline: true, queueSize: 0, syncing: false, lastSyncAt: null as Date | null, lastError: null as string | null };

const publicarEstado = () => { listeners.forEach((fn) => { try { fn({ ...estadoMotor }); } catch (_) {} }); };

const limpiarPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  const { _localId, barrios_colonias, personas, secciones_electorales, casillas, perfiles, ...limpio } = payload;
  return limpio;
};

const ejecutarOperacion = async (op: any) => {
  const { type, table, payload, recordId } = op;
  if (type === 'INSERT') {
    const { error } = await supabase.from(table).upsert([limpiarPayload(payload)], { onConflict: 'id' });
    if (error) throw error;
  } else if (type === 'UPDATE') {
    const { error } = await supabase.from(table).update(limpiarPayload(payload)).eq('id', recordId);
    if (error) throw error;
  } else if (type === 'DELETE') {
    const { error } = await supabase.from(table).delete().eq('id', recordId);
    if (error) throw error;
  }
};

export const syncNow = async () => {
  if (estadoMotor.syncing) return { ok: false, reason: 'already_syncing' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, reason: 'no_session' };

  const online = await Network.isConnected();
  estadoMotor.isOnline = online;
  if (!online) { publicarEstado(); return { ok: false, reason: 'offline' }; }

  estadoMotor.syncing = true;
  publicarEstado();

  try {
    const queue = await Queue.getAll();
    const pendientes = queue.filter((q: any) => q.status === 'PENDING').sort((a: any, b: any) => a.timestamp - b.timestamp);

    let exitos = 0, fallidos = 0;

    for (const op of pendientes) {
      try {
        await ejecutarOperacion(op);
        await Queue.remove(op.id);
        exitos++;
      } catch (err: any) {
        const tipoError = clasificar(err);
        if (tipoError === 'RED' || tipoError === 'AUTH') {
          estadoMotor.lastError = tipoError === 'RED' ? 'Sin conexión estable' : 'Sesión expirada';
          break; 
        }
        const nuevoStatus = tipoError === 'PERMANENTE' ? 'DEAD' : 'PENDING';
        const attempts = tipoError === 'PERMANENTE' ? MAX_INTENTOS : (op.attempts || 0) + 1;
        
        if (tipoError === 'TEMPORAL' && attempts >= MAX_INTENTOS) await Queue.update(op.id, { attempts, status: 'DEAD', error: err?.message });
        else if (tipoError === 'PERMANENTE') await Queue.update(op.id, { attempts: MAX_INTENTOS, status: 'DEAD', error: err?.message });
        else await Queue.update(op.id, { attempts, status: 'PENDING', error: err?.message });
        fallidos++;
      }
    }
    estadoMotor.queueSize = await Queue.size();
    estadoMotor.lastSyncAt = new Date();
    return { ok: true, exitos, fallidos };
  } catch (error) {
    return { ok: false, reason: 'error_critico' };
  } finally {
    estadoMotor.syncing = false;
    publicarEstado();
  }
};

const iniciarMotorSync = () => {
  if (engineStarted) return;
  engineStarted = true;
  Network.subscribe(async (online) => {
    estadoMotor.isOnline = online; publicarEstado();
    if (online) setTimeout(() => syncNow(), 500);
  });
  setTimeout(() => syncNow(), 1000);
  engineInterval = setInterval(async () => {
    const online = await Network.isConnected();
    estadoMotor.isOnline = online;
    if (online && (await Queue.size()) > 0) syncNow();
  }, 30000);
};

export const offlineInsert = async (table: string, payload: any) => {
  const localId = generateUUID();
  const payloadFinal = { ...payload, id: payload.id || localId, _localId: localId };
  const op = await Queue.add({ type: 'INSERT', table, payload: payloadFinal, localId });
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

export const useSyncStatus = () => {
  const [estado, setEstado] = useState({ ...estadoMotor });
  useEffect(() => {
    const listener = (nuevo: any) => setEstado({ ...nuevo });
    listeners.add(listener);
    Queue.size().then((n) => { estadoMotor.queueSize = n; setEstado({ ...estadoMotor }); });
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
