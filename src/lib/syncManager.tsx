// @ts-nocheck
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';

// ============================================================
// 1) STORAGE — WEB (localStorage)
// ============================================================
const Storage = {
  async getItem(key: string) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  async setItem(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch (_) {}
  },
  async removeItem(key: string) {
    try { localStorage.removeItem(key); } catch (_) {}
  },
};

// ============================================================
// 2) NETWORK — WEB (navigator.onLine)
// ============================================================
const Network = {
  async isConnected() {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
        return navigator.onLine;
      }
      return true;
    } catch { return true; }
  },
  subscribe(callback: (online: boolean) => void) {
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
// 3) GENERADOR DE UUID
// ============================================================
const generateUUID = () => {
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
// 4) CACHE LOCAL CON TTL
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
    } catch { return null; }
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
    if (typeof localStorage === 'undefined') return;
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  },
};

// ============================================================
// 5) COLA DE OPERACIONES PENDIENTES
// ============================================================
const QUEUE_KEY = 'orion_queue';
const MAX_INTENTOS = 5;

const Queue = {
  async getAll() {
    const raw = await Storage.getItem(QUEUE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw) || []; } catch { return []; }
  },
  async save(queue: any[]) {
    await Storage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },
  async add(op: any) {
    const queue = await Queue.getAll();
    const item = { id: generateUUID(), timestamp: Date.now(), attempts: 0, status: 'PENDING', error: null, ...op };
    queue.push(item);
    await Queue.save(queue);
    return item;
  },
  async remove(id: string) {
    const queue = await Queue.getAll();
    await Queue.save(queue.filter((q: any) => q.id !== id));
  },
  async update(id: string, patch: any) {
    const queue = await Queue.getAll();
    await Queue.save(queue.map((q: any) => (q.id === id ? { ...q, ...patch } : q)));
  },
  async clear() { await Queue.save([]); },
  async size() { return (await Queue.getAll()).length; },
};

// ============================================================
// 6) MOTOR DE SINCRONIZACIÓN
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
  listeners.forEach((fn) => { try { fn({ ...estadoMotor }); } catch (_) {} });
};

const limpiarPayload = (payload: any) => {
  if (!payload || typeof payload !== 'object') return payload;
  const { _localId, ...limpio } = payload;
  return limpio;
};

const ejecutarOperacion = async (op: any) => {
  const { type, table, payload, recordId } = op;
  if (type === 'INSERT') {
    const { error } = await supabase.from(table).insert([limpiarPayload(payload)]);
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
  const online = await Network.isConnected();
  estadoMotor.isOnline = online;
  if (!online) { publicarEstado(); return { ok: false, reason: 'offline' }; }

  estadoMotor.syncing = true;
  publicarEstado();

  const queue = await Queue.getAll();
  const pendientes = queue.filter((q: any) => q.status === 'PENDING' || q.status === 'FAILED');
  let exitos = 0; let fallidos = 0;

  for (const op of pendientes) {
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

  estadoMotor.queueSize = await Queue.size();
  estadoMotor.syncing = false;
  estadoMotor.lastSyncAt = new Date();
  estadoMotor.lastError = fallidos > 0 ? `${fallidos} operación(es) fallida(s)` : null;
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

// ============================================================
// 8) HOOKS DE REACT
// ============================================================
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
