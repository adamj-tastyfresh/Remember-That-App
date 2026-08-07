import 'dotenv/config';

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  db: {
    server: requireEnv('DB_SERVER', 'localhost'),
    database: requireEnv('DB_NAME', 'RememberThat'),
    user: process.env.DB_USER ?? '',
    password: process.env.DB_PASSWORD ?? '',
    port: Number(process.env.DB_PORT ?? 1433),
    encrypt: (process.env.DB_ENCRYPT ?? 'true') === 'true',
    trustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE ?? 'false') === 'true',
  },
};
