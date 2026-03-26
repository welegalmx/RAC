import { pool } from '../config/db';
import fs from 'fs';
import path from 'path';

async function loadSharedContractsSeed() {
    try {
        console.log("Loading RAC shared contracts seed (9 contracts)...");
        const seedPath = path.resolve(__dirname, '../../seed_rac_shared_contracts_v1.sql');
        const sql = fs.readFileSync(seedPath, 'utf-8');

        await pool.query(sql);
        console.log("✅ Shared contracts seed loaded successfully!");

        const checkBlueprints = await pool.query("SELECT COUNT(*) FROM contract_blueprints");
        const checkClauses = await pool.query("SELECT COUNT(*) FROM clauses WHERE status = 'active'");
        const checkRules = await pool.query("SELECT COUNT(*) FROM clause_rules");
        const checkApproved = await pool.query("SELECT COUNT(*) FROM blueprint_release_gates WHERE approval_status = 'approved'");

        console.log(`📊 Blueprints activos: ${checkBlueprints.rows[0].count}`);
        console.log(`📊 Cláusulas activas: ${checkClauses.rows[0].count}`);
        console.log(`📊 Reglas: ${checkRules.rows[0].count}`);
        console.log(`📊 Blueprints aprobados: ${checkApproved.rows[0].count}`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Shared contracts seed failed:", error);
        process.exit(1);
    }
}

loadSharedContractsSeed();
