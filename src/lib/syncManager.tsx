import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const DB_NAME = 'orion_db';
const DB_VERSION = 1;
const STORES = { queue: 'queue', cache: 'cache' };
const MAX_INTENTOS = 5;

// ============================================
// USUARIO
// ============================================
const guardarUsuario = (id?: string | null) => {
  try { if (id) localStorage.setItem('orion_last_user', id); } catch { /* sin storage */ }
};

export const olvidarUsuario = () => {
  try { localStorage.removeItem('orion_last_user'); } catch { /* sin storage */ }
};

const idUsuario = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  let respaldo: string | null = null;
  try { respaldo = localStorage.getItem('orion_last_user'); } catch { /* sin storage */ }
  return data.session?.user?.id ?? respaldo;
};

supabase.auth.onAuthStateChange((evento, sesion) => {
  if (sesion?.user?.id) guardarUsuario(sesion.user.id);
  if (evento === 'SIGNED_IN') setTimeout(() => { void syncNow(); }, 500);
});

// ============================================
// INDEXEDDB
// ============================================
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
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  },
};

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch { /* usa el respaldo */ }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getAllStrict = async (): Promise<any[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORES.queue, 'readonly').objectStore(STORES.queue).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
};

const Queue = {
  async add(op: any): Promise<any> {
    const item = { id: generateUUID(), timestamp: Date.now(), attempts: 0, status: 'PENDING', error: null, ...op };
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORES.queue, 'readwrite').objectStore(STORES.queue).add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  },
  async remove(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORES.queue, 'readwrite').objectStore(STORES.queue).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  async update(id: string, patch: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const store = db.transaction(STORES.queue, 'readwrite').objectStore(STORES.queue);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (!getReq.result) { resolve(); return; }
        const putReq = store.put({ ...getReq.result, ...patch });
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  },
};

const esPropia = (op: any, uid: string | null) => !op.userId || op.userId === uid;

// ============================================
// LIMPIEZA Y ESTADÍSTICAS
// ============================================
export const borrarBaseLocal = async (): Promise<void> => {
  if (dbPromise) {
    try { const db = await dbPromise; db.close(); } catch { /* ya cerrada */ }
    dbPromise = null;
  }
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, 2000);
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => { clearTimeout(t); resolve(); };
    req.onerror = req.onblocked = () => { clearTimeout(t); resolve(); };
  });
};

// 🚀 AQUÍ ESTÁ LA FUNCIÓN QUE VERCEL DICE QUE NO EXISTE
export const limpiarColaPropia = async (uid?: string | null): Promise<void> => {
  const id = uid ?? (await idUsuario());
  const todas = await getAllStrict();
  const propias = todas.filter((o) => esPropia(o, id));
  if (propias.length > 0) {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.queue, 'readwrite');
      const store = tx.objectStore(STORES.queue);
      propias.forEach((o) => store.delete(o.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  if (todas.length === propias.length) await borrarBaseLocal();
};

export const getQueueStats = async () => {
  const todas = await getAllStrict();
  const uid = await idUsuario();
  const propias = todas.filter((o) => esPropia(o, uid));
  const ajenas = todas.filter((o) => !esPropia(o, uid));
  return {
    pending: propias.filter((o) => o.status === 'PENDING').length,
    dead: propias.filter((o) => o.status === 'DEAD').length,
    ajenas: ajenas.filter((o) => o.status === 'PENDING').length,
    total: todas.length,
  };
};

export const exportarColaMuerta = async (): Promise<number> => {
  const todas = await getAllStrict();
  const uid = await idUsuario();
  const muertas = todas.filter((o) => o.status === 'DEAD' && esPropia(o, uid));
  if (muertas.length === 0) return 0;

  const blob = new Blob([JSON.stringify(muertas, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orion_datos_fallidos_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return muertas.length;
};

export const reintentarMuertas = async (): Promise<number> => {
  const uid = await idUsuario();
  const todas = await getAllStrict();
  const muertas = todas.filter((o) => o.status === 'DEAD' && esPropia(o, uid));
  for (const o of muertas) await Queue.update(o.id, { status: 'PENDING', attempts: 0, error: null });
  await refrescarConteos();
  publicarEstado();
  if (muertas.length > 0) setTimeout(() => { void syncNow(); }, 0);
  return muertas.length;
};

// ============================================
// CLASIFICACIÓN DE ERRORES
// ============================================
type TipoError = 'RED' | 'AUTH' | 'PERMANENTE' | 'TEMPORAL';

const clasificar = (err: any): TipoError => {
  const msg = String(err?.message || '');
  const code = String(err?.code || '');
  const st = Number(err?.status || 0);

  if (st === 401 || code === 'PGRST301' || /jwt/i.test(msg)) return 'AUTH';
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg) || [408, 429, 502, 503, 504].includes(st)) return 'RED';
  if (code === '23503' || code === '57014') return 'TEMPORAL';
  if (code.startsWith('23') || code.startsWith('22') || code === '42501' || code === '42703' || code === 'PGRST204') return 'PERMANENTE';
  return 'TEMPORAL';
};

// ============================================
// MOTOR DE SINCRONIZACIÓN
// ============================================
let engineStarted = false;
const listeners = new Set<(estado: any) => void>();

const estadoMotor = {
  isOnline: true,
  queueSize: 0,
  deadSize: 0,
  syncing: false,
  lastSyncAt: null as Date | null,
  lastError: null as string | null,
};

const publicarEstado = () => {
  listeners.forEach((fn) => { try { fn({ ...estadoMotor }); } catch { /* listener roto */ } });
};

const refrescarConteos = async () => {
  try {
    const todas = await getAllStrict();
    const uid = await idUsuario();
    const propias = todas.filter((o) => esPropia(o, uid));
    estadoMotor.queueSize = propias.filter((o) => o.status === 'PENDING').length;
    estadoMotor.deadSize = propias.filter((o) => o.status === 'DEAD').length;
  } catch { /* conserva el último valor */ }
};

const limpiarPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  const { _localId, barrios_colonias, personas, secciones_electorales, casillas, perfiles, ...limpio } = payload;
  return limpio;
};

const ejecutarOperacion = async (op: any) => {
  const { type, table, payload, recordId } = op;
  let res: { error: any; status: number } | null = null;

  if (type === 'INSERT') {
    res = await supabase.from(table).upsert([limpiarPayload(payload)], { onConflict: 'id', ignoreDuplicates: true });
  } else if (type === 'UPDATE') {
    res = await supabase.from(table).update(limpiarPayload(payload)).eq('id', recordId);
  } else if (type === 'DELETE') {
    res = await supabase.from(table).delete().eq('id', recordId);
  }
  if (res?.error) throw Object.assign(res.error, { status: res.status });
};

async function conLock<T>(fn: () => Promise<T>): Promise<T | null> {
  const locks = typeof navigator !== 'undefined' ? (navigator as any).locks : undefined;
  if (!locks?.request) return fn();
  return locks.request('orion-sync', { ifAvailable: true }, async (lock: any) => (lock ? fn() : null));
}

const ejecutarSync = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, reason: 'no_session' };

  const online = await Network.isConnected();
  estadoMotor.isOnline = online;
  if (!online) { publicarEstado(); return { ok: false, reason: 'offline' }; }

  estadoMotor.syncing = true;
  publicarEstado();

  try {
    const todas = await getAllStrict();
    const pendientes = todas
      .filter((q) => q.status === 'PENDING' && esPropia(q, session.user.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    let exitos = 0;
    let fallidos = 0;
    let corte: 'RED' | 'AUTH' | null = null;

    for (const op of pendientes) {
      try {
        await ejecutarOperacion(op);
        await Queue.remove(op.id);
        exitos++;
      } catch (err: any) {
        const tipo = clasificar(err);
        if (tipo === 'RED' || tipo === 'AUTH') { corte = tipo; break; }

        const intentos = tipo === 'PERMANENTE' ? MAX_INTENTOS : (op.attempts || 0) + 1;
        const muerta = tipo === 'PERMANENTE' || intentos >= MAX_INTENTOS;
        await Queue.update(op.id, {
          attempts: intentos,
          status: muerta ? 'DEAD' : 'PENDING',
          error: err?.message || String(err),
        });
        fallidos++;
      }
    }

    await refrescarConteos();
    estadoMotor.lastSyncAt = new Date();
    estadoMotor.lastError =
      corte === 'RED' ? 'Sin conexión estable'
      : corte === 'AUTH' ? 'Sesión expirada'
      : fallidos > 0 ? `${fallidos} operación(es) fallida(s)`
      : null;

    return { ok: true, exitos, fallidos, corte };
  } catch (error) {
    console.error('[sync] error crítico', error);
    estadoMotor.lastError = 'Error crítico de sincronización';
    return { ok: false, reason: 'error_critico' };
  } finally {
    estadoMotor.syncing = false;
    publicarEstado();
  }
};

export const syncNow = async () => {
  if (estadoMotor.syncing) return { ok: false, reason: 'already_syncing' };
  const resultado = await conLock(ejecutarSync);
  return resultado ?? { ok: false, reason: 'otra_pestana' };
};

const iniciarMotorSync = () => {
  if (engineStarted) return;
  engineStarted = true;

  Network.subscribe((online) => {
    estadoMotor.isOnline = online;
    publicarEstado();
    if (online) setTimeout(() => { void syncNow(); }, 500);
  });

  setTimeout(() => { void syncNow(); }, 1000);

  setInterval(async () => {
    const online = await Network.isConnected();
    estadoMotor.isOnline = online;
    await refrescarConteos();
    if (online && estadoMotor.queueSize > 0) void syncNow();
    publicarEstado();
  }, 30000);
};

// ============================================
// API PÚBLICA
// ============================================
export const offlineInsert = async (table: string, payload: any) => {
  const userId = await idUsuario();
  const localId = generateUUID();
  const payloadFinal = { ...payload, id: payload.id || localId, _localId: localId };

  const op = await Queue.add({ type: 'INSERT', table, payload: payloadFinal, localId, userId });

  await refrescarConteos();
  publicarEstado();
  const online = await Network.isConnected();
  if (online) setTimeout(() => { void syncNow(); }, 50);
  return { ok: true, queued: !online, id: localId, queueId: op.id };
};

export const offlineUpdate = async (table: string, recordId: string, payload: any) => {
  const userId = await idUsuario();
  await Queue.add({ type: 'UPDATE', table, recordId, payload, userId });

  await refrescarConteos();
  publicarEstado();
  const online = await Network.isConnected();
  if (online) setTimeout(() => { void syncNow(); }, 50);
  return { ok: true, queued: !online };
};

// ============================================
// HOOKS DE REACT
// ============================================
export const useSyncStatus = () => {
  const [estado, setEstado] = useState({ ...estadoMotor });

  useEffect(() => {
    const listener = (nuevo: any) => setEstado({ ...nuevo });
    listeners.add(listener);
    void refrescarConteos().then(() => setEstado({ ...estadoMotor }));
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
