// lib/db.ts
import { Pool } from 'pg';

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  // Production settings
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Development settings
  if (!(global as any)._db) {
    (global as any)._db = new Pool({
      connectionString: process.env.POSTGRES_URL,
    });
  }
  pool = (global as any)._db;
}

export { pool };