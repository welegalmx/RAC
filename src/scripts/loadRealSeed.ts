import { pool } from '../config/db';
import fs from 'fs';
import path from 'path';

async function loadRealSeed() {
    try {
        console.log("Loading RAC Real Seed v2 (MX closed catalog)...");
        const seedPath = path.resolve(__dirname, '../../seed_rac_real_v1.sql');
        const sql = fs.readFileSync(seedPath, 'utf-8');

        await pool.query(sql);
        console.log("✅ Seed real v2 loaded successfully!");

        // Verificación
        const checkClauses = await pool.query("SELECT COUNT(*) FROM clauses WHERE status = 'active'");
        const checkTypes = await pool.query("SELECT COUNT(*) FROM clause_types");
        const checkRules = await pool.query("SELECT COUNT(*) FROM clause_rules");
        const checkBlueprints = await pool.query("SELECT COUNT(*) FROM contract_blueprints");
        const checkApproved = await pool.query("SELECT COUNT(*) FROM blueprint_release_gates WHERE approval_status = 'approved'");

        console.log(`📊 Cláusulas activas: ${checkClauses.rows[0].count}`);
        console.log(`📊 Clause Types: ${checkTypes.rows[0].count}`);
        console.log(`📊 Reglas: ${checkRules.rows[0].count}`);
        console.log(`📊 Blueprints: ${checkBlueprints.rows[0].count}`);
        console.log(`📊 Blueprints aprobados: ${checkApproved.rows[0].count}`);

        process.exit(0);
    } catch (e) {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    }
}

loadRealSeed();
