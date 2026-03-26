import type { PoolClient } from 'pg';
import { pool } from '../config/db';

/**
 * Después de importar saas_clauses.xlsx, alinea el orden jurídico esperado en:
 * - inmueble_compraventa_mx: todas las sustantivas comparten type `clausulas` con el mismo
 *   selection_priority (100) → el motor ordenaba alfabéticamente (OBJ quedaba al final).
 * - real_estate_sale_reserva_dominio: reordena tipos (p. ej. impuestos antes que evicción).
 */

const INMUEBLE_SUBSTANTIVE_PRIORITY: Record<string, number> = {
    CL_OBJ_INM_1: 1,
    CL_PRECIO_INM_1: 2,
    CL_ESCRITURA_1: 3,
    CL_EVICCION_1: 4,
    CL_IMPUESTOS_INM_1: 5,
    CL_PENA_INM_1: 6,
    CL_RESCISION_INM_1: 7,
    CL_NOTIF_INM_1: 8,
    CL_CESION_INM: 9,
    CL_INTEGRIDAD_INM: 10,
    CL_NO_RENUNCIA_INM: 11,
    CL_DIVISIBILIDAD_INM: 12,
    CL_EJEMPLARES_INM: 13,
    CL_JURISDICCION_INM: 14
};

const RESERVA_DEFAULT_CLAUSE_ORDER = [
    'declaraciones_vendedor',
    'declaraciones_comprador',
    'declaraciones_partes',
    'objeto',
    'precio',
    'escrituracion',
    'impuestos_gastos',
    'eviccion',
    'rescision',
    'pena_convencional',
    'avisos',
    'no_renuncia',
    'integridad',
    'divisibilidad',
    'cesion',
    'ejemplares',
    'jurisdiccion'
];

export async function applyCanonicalClauseOrdering(client: PoolClient): Promise<void> {
    for (const [code, p] of Object.entries(INMUEBLE_SUBSTANTIVE_PRIORITY)) {
        await client.query(`UPDATE clauses SET selection_priority = $2 WHERE code = $1`, [code, p]);
    }

    await client.query(
        `
        UPDATE contract_blueprints
        SET
            default_clause_order = $1::text[],
            mandatory_clause_types = $1::text[]
        WHERE code = 'real_estate_sale_reserva_dominio';
        `,
        [RESERVA_DEFAULT_CLAUSE_ORDER]
    );
}

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await applyCanonicalClauseOrdering(client);
        await client.query('COMMIT');
        console.log('✅ Orden canónico aplicado (inmueble_compraventa_mx + real_estate_sale_reserva_dominio).');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
        await pool.end();
    }
}

const isMain = require.main === module;
if (isMain) {
    main().catch((err) => {
        console.error('❌ patch orden blueprints:', err);
        process.exit(1);
    });
}
