/**
 * D1Mock — MemoryD1 的扩展，支持 ai_content_cache 表的 SQL 模式。
 * 供 astrology/ai-cache.test.ts 使用。
 */
import { MemoryD1 } from "./d1-mock";

type Row = Record<string, string | number | null>;

export class D1Mock extends MemoryD1 {
  private cacheTable = new Map<string, Row>();

  // ── execute override ──────────────────────────────────────────
  // 需要将 MemoryD1 的 execute 从 private 改为 protected，
  // 或在此用独立实现。由于 MemoryD1.execute 是 private，
  // 我们通过准备语句拦截器来实现。

  prepare(sql: string) {
    // 拦截 ai_content_cache 相关 SQL
    if (sql.includes("ai_content_cache")) {
      let params: unknown[] = [];
      const self = this;
      const binder = {
        bind(...args: unknown[]) {
          params = args;
          return this;
        },
        run: () => self.runCache(sql, params),
        first: <T>() => self.selectCacheFirst<T>(sql, params),
        all: async <T>(): Promise<{ results: T[] }> => ({ results: [] }),
      };
      return binder;
    }
    // 其余 SQL 委托给父类
    return super.prepare(sql);
  }

  // ── CREATE TABLE / CREATE INDEX ────────────────────────────────
  private runCache(_sql: string, _params: unknown[]) {
    // CREATE TABLE / CREATE INDEX → no-op
    if (_sql.startsWith("CREATE TABLE") || _sql.startsWith("CREATE INDEX")) {
      return Promise.resolve({ success: true, meta: { changes: 0, last_row_id: 0 } });
    }

    const now = Date.now();

    // INSERT … ON CONFLICT DO UPDATE (upsert)
    if (_sql.includes("INSERT INTO ai_content_cache")) {
      const [cacheKey, surface, userId, payload, _createdAt, expiresAt] = _params as [
        string,
        string,
        number,
        string,
        number,
        number,
      ];
      const createdAt = now;
      this.cacheTable.set(cacheKey, {
        cache_key: cacheKey,
        surface,
        user_id: userId,
        payload,
        created_at: createdAt,
        expires_at: expiresAt,
      });
      return Promise.resolve({ success: true, meta: { changes: 1, last_row_id: 0 } });
    }

    // DELETE … WHERE user_id = ?
    if (_sql.includes("DELETE FROM ai_content_cache WHERE user_id")) {
      const [userId] = _params as [number];
      let deleted = 0;
      for (const [key, row] of this.cacheTable.entries()) {
        if (row.user_id === userId) {
          this.cacheTable.delete(key);
          deleted++;
        }
      }
      return Promise.resolve({ success: true, meta: { changes: deleted, last_row_id: 0 } });
    }

    return Promise.resolve({ success: true, meta: { changes: 0, last_row_id: 0 } });
  }

  // ── SELECT … WHERE cache_key = ? AND expires_at > ? ───────────
  private selectCacheFirst<T>(sql: string, params: unknown[]): Promise<T | null> {
    if (sql.includes("FROM ai_content_cache WHERE cache_key") && sql.includes("expires_at")) {
      const [key, now] = params as [string, number];
      const row = this.cacheTable.get(key);
      if (!row) return Promise.resolve(null);
      if ((row.expires_at as number) > now) {
        return Promise.resolve({ payload: row.payload } as T);
      }
      return Promise.resolve(null);
    }
    return Promise.resolve(null);
  }
}
