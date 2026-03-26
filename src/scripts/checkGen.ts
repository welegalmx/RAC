import { pool } from '../config/db';

async function checkGeneration() {
    const genId = 'f8fc4dd1-6aa1-4971-a33c-9a46121d2701';
    const res = await pool.query(
        'SELECT id, status, selected_clauses::text FROM contract_generations WHERE id = $1',
        [genId]
    );
    console.log('Result:', JSON.stringify(res.rows, null, 2));
    process.exit(0);
}

checkGeneration().catch(e => {
    console.error(e);
    process.exit(1);
});
