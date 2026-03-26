import { pool } from '../config/db';
import fs from 'fs';
import path from 'path';

async function runSeed() {
    try {
        console.log("Running RAC Minimal Seed...");
        const seedPath = path.resolve(__dirname, '../../seed_rac_minimal.sql');
        const sql = fs.readFileSync(seedPath, 'utf-8');

        await pool.query(sql);
        console.log("Seed completed successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Seed failed:", e);
        process.exit(1);
    }
}

runSeed();
