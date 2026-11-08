import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const DB_NAME = 'orion_db';
const DB_VERSION = 1;
const STORES = { queue: 'queue', cache: 'cache' };

// ============================================
// 🔑 USUARIO: SOLO RECORDAR, NUNCA OLVIDAR AUTOMÁTICAMENTE
// ============================================
// El auditor señaló que onAuthStateChange dispara SIGNED_OUT también
// cuando falla la renovación de token. Si borrábamos ahí, las operaciones
// quedaban huérfanas y otro usuario las adoptaba. Ahora solo recordamos.
const guardarUsuario = (id?: string | null) => {
  try {
    if (id) localStorage.setItem('orion_last_user', id);
  } catch {}
};

supabase.auth.onAuthStateChange((_e, s) => {
  if (s?.user?.id) guardarUsuario(s.user.id);
  // ⚠️ NO borrar en SIGNED_OUT: puede ser solo token expirado
});

// Olvido explícito: solo cuando el usuario cierra sesión de verdad
export const olvidarUsuario = () => {
  try { localStorage.removeItem('orion_last_user'); } catch {}
};

const idUsuario = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? localStorage.getItem('orion_last_user');
};

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
  // 🚀 NUEVO: solo cuenta pendientes PROPIAS (excluye DEAD y ajenas)
  async sizePendientesPropias(): Promise<number> {
    const all = await this.getAll();
    const uid = await idUsuario();
    return all.filter((o: any) =>
      o.status === 'PENDING' && (!o.userId || o.userId === uid)
    ).length;
  },
};

// ============================================
// LIMPIEZA Y ESTADÍSTICAS
// ============================================
export const borrarBaseLocal = async (): Promise<void> => {
  if (dbPromise) {
    try { const db = await dbPromise; db.close(); } catch (_) {}
    dbPromise = null;
  }
  return new Promise<void>((resolve) => {
    const t = setTimeout(resolve, 2000);
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => { clearTimeout(t); resolve(); };
    req.onerror = req.onblocked = () => { clearTimeout(t); resolve(); };
  });
};

// 🚀 FIX: separa propias vs ajenas, y muertas propias vs ajenas
export const getQueueStats = async () => {
  const all = await Queue.getAll();
  const currentUserId = await idUsuario();

  const propias = all.filter(o => !o.userId || o.userId === currentUserId);
  const ajenas = all.filter(o => o.userId && o.userId !== currentUserId);

  return {
    // Pendientes que YO debo subir
    pending: propias.filter(o => o.status === 'PENDING').length,
    // Fallidas mías (las que el servidor rechazó)
    dead: propias.filter(o => o.status === 'DEAD').length,
    // Pendientes de otro usuario en este dispositivo
    ajenas: ajenas.filter(o => o.status === 'PENDING').length,
    // Total de operaciones en IndexedDB (para debug)
    total: all.length,
  };
};

// 🚀 FIX: solo exporta las DEAD del usuario actual
export const exportarColaMuerta = async () => {
  const all = await Queue.getAll();
  const uid = await idUsuario();
  const dead = all.filter(o => o.status === 'DEAD' && (!o.userId || o.userId === uid));

  if (dead.length === 0) {
    alert('No hay registros fallidos propios para exportar.');
    return;
  }

  const blob = new Blob([JSON.stringify(dead, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orion_datos_fallidos_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ============================================
// CLASIFICACIÓN DE ERRORES
// ============================================
const clasificar = (err: any): 'RED' | 'AUTH' | 'PERMANENTE' | 'TEMPORAL' => {
  const msg = String(err?.message || ''), code = String(err?.code || '');
  if (/failed to fetch|networkerror|load failed|timeout/i.test(msg)) return 'RED';
  if (err?.status === 401 || code === 'PGRST301' || /jwt/i.test(msg)) return 'AUTH';
  if (code === '23503') return 'TEMPORAL';
  if (code.startsWith('23') || code.startsWith('22') || code === '42501') return 'PERMANENTE';
  return 'TEMPORAL';
};

// ============================================
// MOTOR DE SINCRONIZACIÓN
// ============================================
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
  listeners.forEach((fn) => { try { fn({ ...estadoMotor }); } catch (_) {} });
};

const limpiarPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  const { _localId, barrios_colonias, personas, secciones_electorales, casillas, perfiles, ...limpio } = payload;
  return limpio;
};

const ejecutarOperacion = async (op: any) => {
  const { type, table, payload, recordId } = op;
  if (type === 'INSERT') {
    // ignoreDuplicates → idempotente en reintentos
    const { error } = await supabase
      .from(table)
      .upsert([limpiarPayload(payload)], { onConflict: 'id', ignoreDuplicates: true });
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
    const pendientes = queue
      .filter((q: any) => q.status === 'PENDING' && (!q.userId || q.userId === session.user.id))
      .sort((a: any, b: any) => a.timestamp - b.timestamp);

    let exitos = 0, fallidos = 0;

    // 🚀 FIX: capturar el motivo de corte para preservarlo al final
    let corte: 'RED' | 'AUTH' | null = null;

    for (const op of pendientes) {
      try {
        await ejecutarOperacion(op);
        await Queue.remove(op.id);
        exitos++;
      } catch (err: any) {
        const tipoError = clasificar(err);
        if (tipoError === 'RED' || tipoError === 'AUTH') {
          corte = tipoError;
          break;
        }

        const attempts = tipoError === 'PERMANENTE' ? MAX_INTENTOS : (op.attempts || 0) + 1;

        if (tipoError === 'TEMPORAL' && attempts >= MAX_INTENTOS) {
          await Queue.update(op.id, { attempts, status: 'DEAD', error: err?.message });
        } else if (tipoError === 'PERMANENTE') {
          await Queue.update(op.id, { attempts: MAX_INTENTOS, status: 'DEAD', error: err?.message });
        } else {
          await Queue.update(op.id, { attempts, status: 'PENDING', error: err?.message });
        }
        fallidos++;
      }
    }

    estadoMotor.queueSize = await Queue.sizePendientesPropias();
    estadoMotor.lastSyncAt = new Date();

    // 🚀 FIX: NO sobrescribir el error de corte con null
    estadoMotor.lastError =
      corte === 'RED' ? 'Sin conexión estable'
      : corte === 'AUTH' ? 'Sesión expirada'
      : fallidos > 0 ? `${fallidos} operación(es) fallida(s)`
      : null;

    return { ok: true, exitos, fallidos, corte };
  } catch (error) {
    estadoMotor.lastError = 'Error crítico de sincronización';
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
    estadoMotor.isOnline = online;
    publicarEstado();
    if (online) setTimeout(() => syncNow(), 500);
  });
  setTimeout(() => syncNow(), 1000);
  engineInterval = setInterval(async () => {
    const online = await Network.isConnected();
    estadoMotor.isOnline = online;
    if (online && (await Queue.sizePendientesPropias()) > 0) syncNow();
  }, 30000);
};

// ============================================
// API PÚBLICA PARA COMPONENTES
// ============================================
export const offlineInsert = async (table: string, payload: any) => {
  const currentUserId = await idUsuario();
  const localId = generateUUID();
  const payloadFinal = { ...payload, id: payload.id || localId, _localId: localId };

  const op = await Queue.add({ type: 'INSERT', table, payload: payloadFinal, localId, userId: currentUserId });

  estadoMotor.queueSize = await Queue.sizePendientesPropias();
  publicarEstado();
  const online = await Network.isConnected();
  if (online) setTimeout(() => syncNow(), 50);
  return { ok: true, queued: !online, id: localId, queueId: op.id };
};

export const offlineUpdate = async (table: string, recordId: string, payload: any) => {
  const currentUserId = await idUsuario();
  await Queue.add({ type: 'UPDATE', table, recordId, payload, userId: currentUserId });
  estadoMotor.queueSize = await Queue.sizePendientesPropias();
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
    Queue.sizePendientesPropias().then((n) => {
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
