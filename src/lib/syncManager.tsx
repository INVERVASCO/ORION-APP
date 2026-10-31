// src/lib/syncManager.tsx
// ✅ Motor Offline-First con IndexedDB nativo (sin dependencias)
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// ============================================================
// 1) STORAGE — IndexedDB NATIVO (reemplaza localStorage)
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
        request.onsuccess = () => {
          resolve(request.result ? request.result.value : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      return null;
    }
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
    } catch {
      // Silencioso
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.cache, 'readwrite');
        const store = tx.objectStore(STORES.cache);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Silencioso
    }
  },
};

// ============================================================
// 2) NETWORK
// ============================================================
const Network = {
  async isConnected(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
        return navigator.onLine;
      }
      return true;
    } catch {
      return true;
    }
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
    try {
      return crypto.randomUUID();
    } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ============================================================
// 4) CACHE CON TTL
// ============================================================
const CACHE_PREFIX = 'orion_cache_';
const TTL_POR_TABLA: Record<string, number> = {
  encuestas: 24 * 60 * 60 * 1000,
  personas: 24 * 60 * 60 * 1000,
  default: 12 * 60 * 60 * 1000,
};

const Cache = {
  async get(cacheKey: string, table: string = 'default') {
    const raw = await Storage.getItem(CACHE_PREFIX + cacheKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        await Storage.removeItem(CACHE_PREFIX + cacheKey);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  async set(cacheKey: string, data: any, table: string = 'default', ttlMs: number | null = null) {
    const ttl = ttlMs ?? TTL_POR_TABLA[table] ?? TTL_POR_TABLA.default;
    const payload = { data, updatedAt: Date.now(), expiresAt: Date.now() + ttl };
    await Storage.setItem(CACHE_PREFIX + cacheKey, JSON.stringify(payload));
  },

  async clear(cacheKey: string) {
    await Storage.removeItem(CACHE_PREFIX + cacheKey);
  },

  async clearAll() {
    try {
      const db = await openDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORES.cache, 'readwrite');
        const store = tx.objectStore(STORES.cache);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Silencioso
    }
  },
};

// ============================================================
// 5) COLA DE OPERACIONES (IndexedDB)
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
    } catch {
      return [];
    }
  },

  async saveAll(queue: any[]): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.queue, 'readwrite');
        const store = tx.objectStore(STORES.queue);
        // Limpiar y reinsertar
        const clearReq = store.clear();
        clearReq.onsuccess = () => {
          queue.forEach((item) => store.put(item));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        clearReq.onerror = () => reject(clearReq.error);
      });
    } catch {
      // Silencioso
    }
  },

  async add(op: any) {
    const queue = await Queue.getAll();
    const item = {
      id: generateUUID(),
      timestamp: Date.now(),
      attempts: 0,
      status: 'PENDING',
      error: null,
      ...op,
    };
    queue.push(item);
    await Queue.saveAll(queue);
    return item;
  },

  async remove(id: string) {
    const queue = await Queue.getAll();
    await Queue.saveAll(queue.filter((q: any) => q.id !== id));
  },

  async update(id: string, patch: any) {
    const queue = await Queue.getAll();
    await Queue.saveAll(
      queue.map((q: any) => (q.id === id ? { ...q, ...patch } : q))
    );
  },

  async clear() {
    await Queue.saveAll([]);
  },

  async size(): Promise<number> {
    const queue = await Queue.getAll();
    return queue.length;
  },
};

// ============================================================
// 6) MOTOR DE SINCRONIZACIÓN CON BATCHING
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
    try {
      fn({ ...estadoMotor });
    } catch (_) {}
  });
};

const limpiarPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  const { _localId, ...limpio } = payload;
  return limpio;
};

// ✅ BATCHING: Envía en lotes de 50 para no saturar Supabase
const BATCH_SIZE = 50;

const ejecutarOperacion = async (op: any) => {
  const { type, table, payload, recordId } = op;
  if (type === 'INSERT') {
    const { error } = await supabase.from(table).insert([limpiarPayload(payload)]);
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
  const pendientes = queue.filter(
    (q: any) => q.status === 'PENDING' || q.status === 'FAILED'
  );

  let exitos = 0;
  let fallidos = 0;

  // ✅ Procesar en lotes
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
        await Queue.update(op.id, {
          attempts,
          status: attempts >= MAX_INTENTOS ? 'FAILED' : 'PENDING',
          error: err?.message || String(err),
        });
      }
    }
    // Pequeña pausa entre lotes para no saturar
    if (i + BATCH_SIZE < pendientes.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  estadoMotor.queueSize = await Queue.size();
  estadoMotor.syncing = false;
  estadoMotor.lastSyncAt = new Date();
  estadoMotor.lastError =
    fallidos > 0 ? `${fallidos} operación(es) fallida(s)` : null;
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
// 7) API OFFLINE-AWARE
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

export const offlineUpdate = async (
  table: string,
  recordId: string,
  payload: any
) => {
  await Queue.add({ type: 'UPDATE', table, recordId, payload });
  estadoMotor.queueSize = await Queue.size();
  publicarEstado();
  const online = await Network.isConnected();
  if (online) setTimeout(() => syncNow(), 50);
  return { ok: true, queued: !online };
};

// ============================================================
// 8) HOOKS DE REACT
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
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { ...estado, syncNow };
};

const SyncContext = createContext<any>(null);

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const status = useSyncStatus();
  useEffect(() => {
    iniciarMotorSync();
  }, []);
  return <SyncContext.Provider value={status}>{children}</SyncContext.Provider>;
};

export const useSync = () => useContext(SyncContext);
