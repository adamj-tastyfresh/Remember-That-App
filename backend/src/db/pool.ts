import sql from 'mssql';
import { env } from '../config/env';

let pool: sql.ConnectionPool | null = null;

// Reuses a single connection pool for the lifetime of the server process.
export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool;
  }

  pool = await new sql.ConnectionPool({
    server: env.db.server,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password,
    port: env.db.port,
    options: {
      encrypt: env.db.encrypt,
      trustServerCertificate: env.db.trustServerCertificate,
    },
  }).connect();

  return pool;
}
