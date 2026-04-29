import { Pool, PoolClient, QueryResult } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'zentria',
  password: process.env.DB_PASSWORD || 'zentria_dev',
  database: process.env.DB_NAME || 'zentria_tracking',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
  process.exit(-1);
});

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function closePool(): Promise<void> {
  await pool.end();
}
