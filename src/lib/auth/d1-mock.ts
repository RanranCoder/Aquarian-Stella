/**
 * 内存模拟 D1，供 rate-limit / otp-store 单测使用。
 * 只按本模块用到的 SQL 模式做匹配，模拟 SQLite 的条件 UPDATE/DELETE 语义。
 */

type Row = Record<string, string | number>;
type Table = Map<string, Row>;

interface RunResult {
  success: boolean;
  meta: { changes: number; last_row_id: number };
}

export class MemoryD1 {
  private tables = new Map<string, Table>();

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
    };
    return binder;
  }

  private execute(sql: string, params: unknown[]): RunResult {
    if (sql.startsWith("CREATE TABLE")) {
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    if (sql.includes("INSERT INTO rate_limits")) {
      const [key, windowEnd] = params as [string, number];
      const t = this.table("rate_limits");
      if (t.has(key)) return { success: true, meta: { changes: 0, last_row_id: 0 } };
      t.set(key, { count: 0, window_end: windowEnd });
      return { success: true, meta: { changes: 1, last_row_id: 0 } };
    }
    if (sql.includes("UPDATE rate_limits SET count = 0, window_end = ?")) {
      const [key, windowEnd, now] = params as [string, number, number];
      const row = this.table("rate_limits").get(key);
      if (row && (row.window_end as number) < now) {
        row.count = 0;
        row.window_end = windowEnd;
        return { success: true, meta: { changes: 1, last_row_id: 0 } };
      }
      return { success: true, meta: { changes: 0, last_row_id: 0 } };
    }
    if (sql.includes("INSERT INTO star_mails")) {
      const [userId, recipient, recipientDomain, title, signature] = params as [number, string, string, string, string];
      const t = this.table("star_mails");
      const id = t.size + 1;
      t.set(String(id), { id, user_id: userId, recipient, recipient_domain: recipientDomain, title, signature, status: "sent" });
      return { success: true, meta: { changes: 1, last_row_id: id } };
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
    return { success: true, meta: { changes: 0, last_row_id: 0 } };
  }

  private selectFirst<T>(sql: string, params: unknown[]): T | null {
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
