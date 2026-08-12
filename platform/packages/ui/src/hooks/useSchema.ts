import { useState, useEffect, useRef } from 'react';
import { batchGetFn } from '@/api/admin/data/schemaForm';

// ---- IndexedDB 工具 ----
const DB_NAME = 'hodor_schema_cache';
const STORE_NAME = 'schemas';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---- 缓存结构 ----
interface SchemaCacheEntry {
  version: string;
  schemas: Record<string, Record<string, unknown>>;
}

// ---- 内存级缓存（避免同一会话内重复读 IndexedDB）----
let memoryCache: SchemaCacheEntry | null = null;

// 请求去重：同一批 names 只发一次请求
const pendingRequests = new Map<string, Promise<SchemaCacheEntry | null>>();

function getPrefixFromCode(code: string): string {
  const lastDotIndex = code.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return code;
  }
  return code.slice(0, lastDotIndex);
}

async function fetchSchemas(
  names: string[],
  cachedVersion?: string,
): Promise<SchemaCacheEntry | null> {
  const sortedNames = [...names].sort();
  const cacheKey = `${cachedVersion ?? '<full>'}:${sortedNames.join(',')}`;
  const existing = pendingRequests.get(cacheKey);
  if (existing) return existing;

  const prefixes = [...new Set(sortedNames.map(getPrefixFromCode))].filter(Boolean);
  const promise = Promise.all(
    prefixes.map(async (prefix) => {
      try {
        const res = await batchGetFn({
          data: { prefix, version: cachedVersion },
        });
        return res.data?.data ?? null;
      } catch {
        return null;
      }
    }),
  )
    .then((responses) => {
      const availableResponses = responses.filter((response) => response !== null);
      if (availableResponses.length === 0 || availableResponses.every((data) => data.notModified)) {
        return null;
      }

      const parsed: Record<string, Record<string, unknown>> = {};
      for (const data of availableResponses) {
        if (data.notModified) continue;
        for (const [key, val] of Object.entries(data.schemas || {})) {
          try {
            parsed[key] =
              typeof val === 'string' ? JSON.parse(val) : (val as Record<string, unknown>);
          } catch {
            // 单条无效 Schema 视为缺失，由调用方进入明确的缺失/降级状态。
          }
        }
      }

      const version = availableResponses.find((data) => !data.notModified)?.version;
      if (!version) return null;

      return {
        version,
        schemas: parsed,
      } satisfies SchemaCacheEntry;
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });

  pendingRequests.set(cacheKey, promise);
  return promise;
}

/** 从后端动态获取 JSON Schema，支持 IndexedDB 缓存 + 版本号比对 */
export function useSchema(config: { schema: string; updateSchema?: string }): {
  schema: Record<string, unknown> | null;
  updateSchema: Record<string, unknown> | null;
  loading: boolean;
} {
  const [schemas, setSchemas] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { schema: schemaName, updateSchema: updateSchemaName } = configRef.current;
      if (!schemaName) {
        if (!cancelled) {
          setSchemas({});
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(true);
      const names = [schemaName];
      if (updateSchemaName) names.push(updateSchemaName);

      // 1. 尝试内存缓存
      if (memoryCache) {
        const allHit = names.every((n) => n in memoryCache!.schemas);
        if (allHit) {
          if (!cancelled) {
            setSchemas(memoryCache.schemas);
            setLoading(false);
          }
          // 后台静默刷新
          fetchSchemas(names, memoryCache.version).then((fresh) => {
            if (fresh && !cancelled) {
              memoryCache = {
                version: fresh.version,
                schemas: { ...(memoryCache?.schemas || {}), ...fresh.schemas },
              };
              idbSet('cache', memoryCache).catch(() => {});
              setSchemas(memoryCache.schemas);
            }
          });
          return;
        }
      }

      // 2. 尝试 IndexedDB 缓存
      try {
        const cached = await idbGet<SchemaCacheEntry>('cache');
        if (cached) {
          memoryCache = cached;
          const allHit = names.every((n) => n in cached.schemas);
          if (allHit && !cancelled) {
            setSchemas(cached.schemas);
            setLoading(false);
          }

          // 带版本号请求
          const fresh = await fetchSchemas(names, cached.version);
          if (fresh && !cancelled) {
            memoryCache = {
              version: fresh.version,
              schemas: { ...cached.schemas, ...fresh.schemas },
            };
            await idbSet('cache', memoryCache);
            setSchemas(memoryCache.schemas);
            setLoading(false);
          } else if (!allHit && !cancelled) {
            // 缓存不完整但服务端说没变，说明是新 schema 名
            const freshFull = await fetchSchemas(names);
            if (freshFull && !cancelled) {
              memoryCache = {
                version: freshFull.version,
                schemas: { ...cached.schemas, ...freshFull.schemas },
              };
              await idbSet('cache', memoryCache);
              setSchemas(memoryCache.schemas);
            }
            setLoading(false);
          } else if (!cancelled) {
            setLoading(false);
          }
          return;
        }
      } catch {
        // IndexedDB 不可用，降级
      }

      // 3. 无缓存，直接请求
      const fresh = await fetchSchemas(names);
      if (fresh && !cancelled) {
        memoryCache = {
          version: fresh.version,
          schemas: { ...(memoryCache?.schemas || {}), ...fresh.schemas },
        };
        idbSet('cache', memoryCache).catch(() => {});
        setSchemas(memoryCache.schemas);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [config.schema, config.updateSchema]);

  return {
    schema: schemas[config.schema] || null,
    updateSchema: config.updateSchema ? schemas[config.updateSchema] || null : null,
    loading,
  };
}
