import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Ensure DATABASE_URL is present
if (!process.env.DATABASE_URL) {
    console.error("FATAL: DATABASE_URL is missing in .env");
    process.exit(1);
}

// Connection Pool Configuration
// Optimized for serverless/stateless environments (like Supabase/Lambda) usually requires strict connection limits,
// but for a standard Node.js generic backend, this standard pool configuration is robust.
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Max clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Listener for unexpected errors on idle clients
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle database client', err);
    process.exit(-1);
});

/**
 * Helper to check DB health.
 */
export const checkDatabaseConnection = async () => {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        client.release();
        console.log(`[Database] Connected successfully. Time: ${res.rows[0].now}`);
        return true;
    } catch (err) {
        console.error('[Database] Connection failed:', err);
        return false;
    }
};
