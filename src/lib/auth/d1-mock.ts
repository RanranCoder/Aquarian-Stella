/**
 * 内存模拟 D1，供 rate-limit / otp-store / db / user-admin 单测使用。
 * 只按本模块用到的 SQL 模式做匹配，模拟 SQLite 的条件 UPDATE/DELETE 语义。
 */

type Row = Record<string, string | number | null>;
type Table = Map<string, Row>;

interface RunResult {
  success: boolean;
  meta: { changes: number; last_row_id: number };
}

export class MemoryD1 {
  private tables = new Map<string, Table>();
  private _nextUserId = 1;

  private table(name: string): Table {
    let t = this.tables.get(name);
    if (!t) {
      t = new Map<string, Row>();
      this.tables.set(name, t);
    }
    return t;
  }

  /** 直接向某张表写入一行（用于预置过期窗口/已达上限等测试场景）。 */
  seed(tableName: string, key: string, row: Row): void {
    this.table(tableName).set(key, row);
  }

  prepare(sql: string) {
    let params: unknown[] = [];
    const binder = {
      bind: (...args: unknown[]) => {
        params = args;
        return binder;
      },
      run: async (): Promise<RunResult> => this.execute(sql, params),
      first: async <T>(): Promise<T | null> => this.selectFirst<T>(sql, params),
      all: async <T>(): Promise<{ results: T[] }> => ({ results: this.selectAll<T>(sql, params) }),
    };
    return binder;
  }

  /** 模拟 D1 batch：顺序执行所有 statement */
  async batch(stmts: Array<{ run: () => Promise<RunResult> }>): Promise<RunResult[]> {
    const results: RunResult[] = [];
    for (const stmt of stmts) {
      // batch 中的 statement 已经 bind 过了，直接 run
      results.push(await stmt.run());
    }
    return results;
  }

  private execute(sql: string, params: unknown[]): RunResult {
    if (sql.startsWith("CREATE TABLE")) {
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    if (sql.startsWith("ALTER TABLE")) {
      // 运行时迁移：加列模拟 no-op（已忽略重复列）
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    /* ── rate_limits ── */
    if (sql.includes("INSERT INTO rate_limits")) {
      const [key, windowEnd] = params as [string, number];
      const t = this.table("rate_limits");
      if (t.has(key)) return { success: true, meta: { changes: 0, last_row_id: 0 } };
      t.set(key, { count: 0, window_end: windowEnd });
      return { success: true, meta: { changes: 1, last_row_id: 0 } };
    }
    if (sql.includes("UPDATE rate_limits SET count = 0, window_end = ?")) {
      const [windowEnd, now, key] = params as [number, number, string];
      const row = this.table("rate_limits").get(key);
      if (row && (row.window_end as number) < now) {
        row.count = 0;
        row.window_end = windowEnd;
        return { success: true, meta: { changes: 1, last_row_id: 0 } };
      }
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    if (sql.includes("UPDATE rate_limits SET count = count + 1")) {
      const [key, max] = params as [string, number];
      const row = this.table("rate_limits").get(key);
      if (row && (row.count as number) < max) {
        row.count = (row.count as number) + 1;
        return { success: true, meta: { changes: 1, last_row_id: 0 } };
      }
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    /* ── otp_codes ── */
    if (sql.includes("INSERT INTO otp_codes")) {
      const [email, hash, expiresAt] = params as [string, string, number];
      this.table("otp_codes").set(email, { hash, attempts: 0, expires_at: expiresAt });
      return { success: true, meta: { changes: 1, last_row_id: 0 } };
    }
    if (sql.includes("UPDATE otp_codes SET attempts = attempts + 1")) {
      const [email, max] = params as [string, number];
      const row = this.table("otp_codes").get(email);
      if (row && (row.attempts as number) < max) {
        row.attempts = (row.attempts as number) + 1;
        return { success: true, meta: { changes: 1, last_row_id: 0 } };
      }
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    if (sql.includes("DELETE FROM otp_codes WHERE email = ? AND hash = ?")) {
      const [email, hash] = params as [string, string];
      if (this.table("otp_codes").get(email)?.hash === hash) {
        this.table("otp_codes").delete(email);
        return { success: true, meta: { changes: 1, last_row_id: 0 } };
      }
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    if (sql.includes("DELETE FROM otp_codes WHERE email = ?")) {
      const [email] = params as [string];
      const had = this.table("otp_codes").delete(email);
      return { success: true, meta: { changes: had ? 1 : 0, last_row_id: 0 } };
    }
    /* ── wishes ── */
    if (sql.includes("INSERT INTO wishes")) {
      const [id, userId, title, category, status, createdAt, completedAt, updatedAt] = params as [string, number, string, string, string, string, string | null, number];
      const t = this.table("wishes");
      const existing = t.get(id);
      // upsert（ON CONFLICT DO UPDATE ... WHERE user_id 匹配且 incoming 更新）
      if (existing) {
        if (existing.user_id !== userId) return { success: true, meta: { changes: 0, last_row_id: 0 } };
        if ((existing.updated_at as number) >= updatedAt) return { success: true, meta: { changes: 0, last_row_id: 0 } };
        t.set(id, { ...existing, title, category, status, created_at: createdAt, completed_at: completedAt ?? null, updated_at: updatedAt, deleted_at: null });
        return { success: true, meta: { changes: 1, last_row_id: 0 } };
      }
      t.set(id, { id, user_id: userId, title, category, status, created_at: createdAt, completed_at: completedAt ?? null, updated_at: updatedAt, deleted_at: null });
      return { success: true, meta: { changes: 1, last_row_id: 0 } };
    }
    if (sql.includes("UPDATE wishes SET deleted_at")) {
      // tombstone：SET deleted_at=?, updated_at=? WHERE id=? AND user_id=? AND deleted_at IS NULL
      const [deletedAt, updatedAt, id, userId] = params as [number, number, string, number];
      const t = this.table("wishes");
      const row = t.get(id);
      if (!row || row.user_id !== userId || row.deleted_at !== null) {
        return { success: true, meta: { changes: 0, last_row_id: 0 } };
      }
      t.set(id, { ...row, deleted_at: deletedAt, updated_at: updatedAt });
      return { success: true, meta: { changes: 1, last_row_id: 0 } };
    }
    if (sql.includes("DELETE FROM wishes WHERE user_id")) {
      const [userId] = params as [number];
      const t = this.table("wishes");
      let deleted = 0;
      for (const [key, row] of t.entries()) {
        if (row.user_id === userId) { t.delete(key); deleted++; }
      }
      return { success: true, meta: { changes: deleted, last_row_id: 0 } };
    }
    /* ── profiles ── */
    if (sql.includes("DELETE FROM profiles WHERE user_id")) {
      const [userId] = params as [number];
      const table = this.table("profiles");
      let deleted = 0;
      for (const [key, row] of table.entries()) {
        if (row.user_id === userId) { table.delete(key); deleted++; }
      }
      return { success: true, meta: { changes: deleted, last_row_id: 0 } };
    }
    if (sql.includes("INSERT INTO profiles")) {
      const [userId, nickname, birthDate, birthTime, accuracy, birthCity, interests, updatedAt, createdAt] = params as [number, string, string, string | null, string, string | null, string, number, number];
      this.table("profiles").set(String(userId), {
        user_id: userId,
        nickname,
        birth_date: birthDate,
        birth_time: birthTime,
        birth_time_accuracy: accuracy,
        birth_city: birthCity,
        interests,
        onboarded: 1,
        updated_at: updatedAt,
        created_at: createdAt,
      });
      return { success: true, meta: { changes: 1, last_row_id: 0 } };
    }
    /* ── star_mails ── */
    if (sql.includes("INSERT INTO star_mails")) {
      const [userId, recipient, recipientDomain, title, signature] = params as [number, string, string, string, string];
      const t = this.table("star_mails");
      const id = t.size + 1;
      t.set(String(id), { id, user_id: userId, recipient, recipient_domain: recipientDomain, title, signature, status: "sent" });
      return { success: true, meta: { changes: 1, last_row_id: id } };
    }
    if (sql.includes("DELETE FROM star_mails WHERE user_id")) {
      const [userId] = params as [number];
      const t = this.table("star_mails");
      let deleted = 0;
      for (const [key, row] of t.entries()) {
        if (row.user_id === userId) { t.delete(key); deleted++; }
      }
      return { success: true, meta: { changes: deleted, last_row_id: 0 } };
    }
    /* ── users (admin / password auth) ── */
    if (sql.includes("INSERT INTO users (email, password_hash)")) {
      const [email, passwordHash] = params as [string, string];
      const t = this.table("users");
      // 检查邮箱是否已存在
      for (const row of t.values()) {
        if (row.email === email) {
          // UNIQUE 约束冲突 —— 在真实 SQLite 中会抛错
          throw new Error("UNIQUE constraint failed: users.email");
        }
      }
      const id = this._nextUserId++;
      t.set(String(id), {
        id,
        email,
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
      });
      return { success: true, meta: { changes: 1, last_row_id: id } };
    }
    if (sql.includes("INSERT INTO users (email)") && sql.includes("ON CONFLICT")) {
      const [email] = params as [string];
      const t = this.table("users");
      for (const row of t.values()) {
        if (row.email === email) return { success: true, meta: { changes: 0, last_row_id: 0 } };
      }
      const id = this._nextUserId++;
      t.set(String(id), {
        id,
        email,
        password_hash: null,
        created_at: new Date().toISOString(),
      });
      return { success: true, meta: { changes: 1, last_row_id: id } };
    }
    if (sql.includes("UPDATE users SET password_hash = ?")) {
      const [hash, email] = params as [string, string];
      const t = this.table("users");
      for (const row of t.values()) {
        if (row.email === email) {
          row.password_hash = hash;
          return { success: true, meta: { changes: 1, last_row_id: 0 } };
        }
      }
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    if (sql.includes("DELETE FROM users WHERE email = ?")) {
      const [email] = params as [string];
      const t = this.table("users");
      for (const [key, row] of t.entries()) {
        if (row.email === email) {
          t.delete(key);
          return { success: true, meta: { changes: 1, last_row_id: 0 } };
        }
      }
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    if (sql.includes("DELETE FROM users WHERE id = ?")) {
      const [id] = params as [number];
      const t = this.table("users");
      const had = t.delete(String(id));
      return { success: true, meta: { changes: had ? 1 : 0, last_row_id: 0 } };
    }
    return { success: true, meta: { changes: 0, last_row_id: 0 } };
  }

  private selectAll<T>(sql: string, params: unknown[]): T[] {
    /* ── wishes（未删除） ── */
    if (sql.includes("SELECT") && sql.includes("FROM wishes") && sql.includes("deleted_at IS NULL")) {
      const [userId] = params as [number];
      const t = this.table("wishes");
      const results: T[] = [];
      for (const row of t.values()) {
        if (row.user_id === userId && row.deleted_at === null) results.push(row as T);
      }
      return results;
    }
    /* ── wishes（已删除 tombstone） ── */
    if (sql.includes("SELECT") && sql.includes("FROM wishes") && sql.includes("deleted_at IS NOT NULL")) {
      const [userId] = params as [number];
      const t = this.table("wishes");
      const results: T[] = [];
      for (const row of t.values()) {
        if (row.user_id === userId && row.deleted_at !== null) results.push({ id: row.id, deleted_at: row.deleted_at } as T);
      }
      return results;
    }
    return [];
  }

  private selectFirst<T>(sql: string, params: unknown[]): T | null {
    /* ── profiles ── */
    if (sql.includes("FROM profiles WHERE user_id")) {
      const [userId] = params as [number];
      const row = this.table("profiles").get(String(userId));
      if (!row) return null;
      return {
        user_id: row.user_id,
        nickname: row.nickname,
        birth_date: row.birth_date,
        birth_time: row.birth_time ?? null,
        birth_time_accuracy: row.birth_time_accuracy,
        birth_city: row.birth_city ?? null,
        interests: row.interests,
        onboarded: row.onboarded ?? 1,
        updated_at: row.updated_at,
        created_at: row.created_at,
      } as T;
    }
    /* ── otp_codes ── */
    if (sql.includes("SELECT hash, attempts, expires_at FROM otp_codes")) {
      const [email] = params as [string];
      const row = this.table("otp_codes").get(email);
      if (!row) return null;
      const { hash, attempts, expires_at } = row;
      return { hash, attempts, expires_at } as T;
    }
    if (sql.includes("SELECT hash FROM otp_codes")) {
      const [email] = params as [string];
      const row = this.table("otp_codes").get(email);
      if (!row) return null;
      return { hash: row.hash } as T;
    }
    /* ── users ── */
    if (sql.includes("SELECT id, email, created_at FROM users WHERE id = ?")) {
      const [id] = params as [number];
      const t = this.table("users");
      const row = t.get(String(id));
      if (!row) return null;
      return { id: row.id, email: row.email, created_at: row.created_at } as T;
    }
    if (sql.includes("SELECT id, email, created_at FROM users")) {
      const [email] = params as [string];
      const t = this.table("users");
      for (const row of t.values()) {
        if (row.email === email) {
          return { id: row.id, email: row.email, created_at: row.created_at } as T;
        }
      }
      return null;
    }
    if (sql.includes("SELECT password_hash FROM users")) {
      const [email] = params as [string];
      const t = this.table("users");
      for (const row of t.values()) {
        if (row.email === email) {
          return { password_hash: row.password_hash ?? null } as T;
        }
      }
      return null;
    }
    return null;
  }

  /** 星邮记录查询（仅测试断言用）。 */
  getStarMails(): Array<{ user_id: number; recipient: string; recipient_domain: string; title: string; signature: string; status: string }> {
    return Array.from(this.table("star_mails").values()) as Array<{
      user_id: number;
      recipient: string;
      recipient_domain: string;
      title: string;
      signature: string;
      status: string;
    }>;
  }
}
