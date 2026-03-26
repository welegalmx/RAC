import fs from 'fs';
import path from 'path';
import {
    Document, Packer, Paragraph, TextRun, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign, TableLayoutType
} from 'docx';
import { pool } from '../config/db';
import { enrichVariablesWithMoneyFormatting, sanitizeResolvedContractText } from '../utils/legalMoney';

// Spanish ordinal names for clause numbering
const CLAUSE_ORDINALS = [
    'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA',
    'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
    'DÉCIMA PRIMERA', 'DÉCIMA SEGUNDA', 'DÉCIMA TERCERA', 'DÉCIMA CUARTA', 'DÉCIMA QUINTA',
    'DÉCIMA SEXTA', 'DÉCIMA SÉPTIMA', 'DÉCIMA OCTAVA', 'DÉCIMA NOVENA', 'VIGÉSIMA'
];

// 1.15 line spacing in OOXML twips (1.15 × 240 = 276)
const LINE_SPACING = 276;

/** Espacio duro para que Word no parta "de | fecha" ni "de | marzo" al ajustar líneas. */
const NBSP = '\u00A0';

/** Cola del proemio: "de fecha D de mes de AAAA" con NBSP en vínculos débiles. */
function spanishProemioDatePhrase(day: string | number, monthName: string, year: string | number): string {
    const d = String(day);
    const m = String(monthName);
    const y = String(year);
    return `de${NBSP}fecha${NBSP}${d}${NBSP}de${NBSP}${m}${NBSP}de${NBSP}${y}`;
}

// Letters for sub-items inside declarations
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** Hang for declaration incisos: continuation lines align with text after "a) " */
const DECL_INCISO_HANGING = 320;
const DECL_INCISO_LEFT = 400;
/** Space after each inciso (and after last inner bullet) so a), b), c) no queden pegados */
const DECL_INCISO_GAP_AFTER = 240;

/**
 * Etiquetas típicas de datos (Marca, Modelo, VIN) vs. frases narrativas que también llevan ":".
 * Evita partir "Que… características:" como si fuera un campo junto con "Marca:".
 */
function isLikelyDataFieldLabel(labelRaw: string): boolean {
    const label = labelRaw.trim();
    if (!label || label.length > 55) return false;
    if (/^que\s/i.test(label)) return false;
    if (/cuenta con|declara|bajo protesta/i.test(label)) return false;
    if (/siguientes/i.test(label)) return false;
    if (/características/i.test(label)) return false;
    return true;
}

function findDataFieldColonMatches(t: string): RegExpMatchArray[] {
    const fieldHead = /(?:^|\s)([^\s:][^:]*?):\s*/g;
    return [...t.matchAll(fieldHead)].filter((m) => isLikelyDataFieldLabel(m[1]));
}

/** Detect repeated "Etiqueta: valor" tokens in one string (same inciso, list of data fields). */
function extractInlineKeyValueList(tail: string): string[] {
    const matches = findDataFieldColonMatches(tail);
    if (matches.length < 2) return [];
    const items: string[] = [];
    for (let i = 0; i < matches.length; i++) {
        const label = matches[i][1].trim();
        const valueStart = (matches[i].index ?? 0) + matches[i][0].length;
        const valueEnd = i + 1 < matches.length ? (matches[i + 1].index ?? tail.length) : tail.length;
        const value = tail.slice(valueStart, valueEnd).trim();
        items.push(`${label}: ${value}`);
    }
    return items;
}

/** Split leading narrative from an inline list of "Campo: dato" pairs inside the same inciso. */
function splitInlineFieldBullets(text: string): { intro: string; bullets: string[] } {
    const t = text.trim();
    if (!t) return { intro: '', bullets: [] };

    const matches = findDataFieldColonMatches(t);
    if (matches.length < 2) return { intro: t, bullets: [] };

    const firstFieldStart = matches[0].index ?? 0;
    const intro = t.slice(0, firstFieldStart).trim();
    const tail = t.slice(firstFieldStart);
    const items = extractInlineKeyValueList(tail);
    if (items.length < 2) return { intro: t, bullets: [] };
    return { intro, bullets: items };
}

const MIN_CLAUSE_REF_TITLE_LEN = 4;

function isWordCharForRef(ch: string): boolean {
    return ch.length > 0 && /[\p{L}\p{M}\p{N}]/u.test(ch);
}

function refHasWordBoundaries(text: string, start: number, end: number): boolean {
    if (start > 0 && isWordCharForRef(text[start - 1])) return false;
    if (end < text.length && isWordCharForRef(text[end])) return false;
    return true;
}

/** Normaliza para comparar título de cláusula con texto entre comillas. */
function normalizeClauseRefTitle(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** No envolver si ya está entre comillas definicionales (evita doble marcado). */
function refInsideExistingQuotes(text: string, start: number, end: number): boolean {
    if (start === 0 || end >= text.length) return false;
    const open = text[start - 1];
    const close = text[end];
    if (open === '\u201C' && close === '\u201D') return true;
    if (open === '\u00AB' && close === '\u00BB') return true; // « »
    if (open === '"' && close === '"') return true;
    return false;
}

/**
 * Trocea el texto para marcar referencias al título de otras cláusulas del mismo contrato.
 */
function splitTextWithClauseRefs(text: string, titles: string[]): Array<{ kind: 'text' | 'ref'; value: string }> {
    const uniq = [...new Set(titles.map((t) => t.trim()).filter((t) => t.length >= MIN_CLAUSE_REF_TITLE_LEN))]
        .sort((a, b) => b.length - a.length);
    if (uniq.length === 0) return [{ kind: 'text', value: text }];

    const segments: Array<{ kind: 'text' | 'ref'; value: string }> = [];
    const pushText = (s: string) => {
        if (s.length > 0) segments.push({ kind: 'text', value: s });
    };

    let segStart = 0;
    let i = 0;
    while (i < text.length) {
        let matched: string | null = null;
        for (const t of uniq) {
            if (text.length - i < t.length || !text.startsWith(t, i)) continue;
            const end = i + t.length;
            if (!refHasWordBoundaries(text, i, end)) continue;
            if (refInsideExistingQuotes(text, i, end)) continue;
            if (!matched || t.length > matched.length) matched = t;
        }
        if (matched) {
            if (segStart < i) pushText(text.slice(segStart, i));
            segments.push({ kind: 'ref', value: matched });
            i += matched.length;
            segStart = i;
        } else {
            i++;
        }
    }
    if (segStart < text.length) pushText(text.slice(segStart));
    if (segments.length === 0) return [{ kind: 'text', value: text }];
    return segments;
}

function refTitleSetForQuotes(refTitles: string[]): Set<string> {
    const set = new Set<string>();
    for (const t of refTitles) {
        const n = normalizeClauseRefTitle(t);
        if (n.length >= MIN_CLAUSE_REF_TITLE_LEN) set.add(n);
    }
    return set;
}

function quotedTermIsClauseRef(term: string, refNorm: Set<string>): boolean {
    const n = normalizeClauseRefTitle(term);
    if (refNorm.has(n)) return true;
    return false;
}

/**
 * Comillas / «»: términos definidos → negrita + subrayado;
 * si el interior coincide con un título de otra cláusula → solo “título” en cursiva (sin negrita).
 */
function paragraphBodyRunsQuotedAware(text: string, baseBold: boolean, refTitles: string[]): TextRun[] {
    const refNorm = refTitleSetForQuotes(refTitles);
    const runs: TextRun[] = [];
    const re = /(?:\u201C([^\u201D]+)\u201D|"([^"]+)"|«([^»]+)»)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) {
            runs.push(new TextRun({
                text: text.slice(last, m.index),
                font: 'Times New Roman', size: 24, bold: baseBold
            }));
        }
        const term = (m[1] ?? m[2] ?? m[3] ?? '').trim();
        if (quotedTermIsClauseRef(term, refNorm)) {
            runs.push(new TextRun({
                text: `\u201C${term}\u201D`,
                font: 'Times New Roman',
                size: 24,
                italics: true,
                bold: baseBold
            }));
        } else {
            runs.push(new TextRun({
                text: term,
                font: 'Times New Roman', size: 24, bold: true,
                underline: { type: 'single' }
            }));
        }
        last = m.index + m[0].length;
    }
    if (last < text.length) {
        runs.push(new TextRun({
            text: text.slice(last),
            font: 'Times New Roman', size: 24, bold: baseBold
        }));
    }
    return runs.length > 0 ? runs : [new TextRun({ text, font: 'Times New Roman', size: 24, bold: baseBold })];
}

/** Cuerpo con referencias a otras cláusulas en “Título” + cursiva; resto igual que paragraphBodyRuns. */
function paragraphBodyRunsWithRefs(text: string, refTitles: string[], baseBold = false): TextRun[] {
    const segs = splitTextWithClauseRefs(text, refTitles);
    const runs: TextRun[] = [];
    for (const s of segs) {
        if (s.kind === 'ref') {
            runs.push(new TextRun({
                text: `\u201C${s.value}\u201D`,
                font: 'Times New Roman',
                size: 24,
                italics: true,
                bold: baseBold
            }));
        } else {
            runs.push(...paragraphBodyRunsQuotedAware(s.value, baseBold, refTitles));
        }
    }
    return runs.length > 0
        ? runs
        : [new TextRun({ text, font: 'Times New Roman', size: 24, bold: baseBold })];
}

/** Parte en líneas lógicas: saltos \n y corte tras “lo siguiente:” / “siguiente:” antes de La/El… */
function expandClauseBodyParagraphs(content: string): string[] {
    let raw = content.replace(/\r\n/g, '\n');
    // Plantillas/IA a veces guardan la secuencia literal \n (backslash + n), no un salto real.
    raw = raw.replace(/\\n/g, '\n').trim();
    if (!raw) return [];
    const lines = raw.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const out: string[] = [];
    for (const line of lines) {
        out.push(...splitLineAfterIntroColon(line));
    }
    return out;
}

/**
 * Separa “…conforme a lo siguiente: La pena…” en dos párrafos si venían en una sola línea.
 * Acepta `:` ASCII o unicode, y espacio opcional tras `:`.
 */
function splitLineAfterIntroColon(line: string): string[] {
    const startNext = `(?=(?:La|El|Las|Los|Si|En\\s+caso)\\s+)`;
    const reLoSiguiente = new RegExp(`lo\\s+siguiente\\s*[:：]\\s*${startNext}`, 'i');
    const reSiguiente = new RegExp(`\\bsiguiente\\s*[:：]\\s*${startNext}`, 'i');
    for (const re of [reLoSiguiente, reSiguiente]) {
        const m = re.exec(line);
        if (m && m.index !== undefined) {
            const cut = m.index + m[0].length;
            const first = line.slice(0, cut).trim();
            const second = line.slice(cut).trim();
            if (second.length >= 8 && first.length >= 10) return [first, second];
        }
    }
    return [line];
}

/** Split text into TextRuns: términos entre comillas / «» → negrita + subrayado. */
function paragraphBodyRuns(text: string, baseBold = false): TextRun[] {
    const runs: TextRun[] = [];
    const re = /(?:\u201C([^\u201D]+)\u201D|"([^"]+)"|«([^»]+)»)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        if (m.index > last) {
            runs.push(new TextRun({
                text: text.slice(last, m.index),
                font: 'Times New Roman', size: 24, bold: baseBold
            }));
        }
        const term = (m[1] ?? m[2] ?? m[3] ?? '').trim();
        runs.push(new TextRun({
            text: term,
            font: 'Times New Roman', size: 24, bold: true,
            underline: { type: 'single' }
        }));
        last = m.index + m[0].length;
    }
    if (last < text.length) {
        runs.push(new TextRun({
            text: text.slice(last),
            font: 'Times New Roman', size: 24, bold: baseBold
        }));
    }
    return runs.length > 0 ? runs : [new TextRun({ text, font: 'Times New Roman', size: 24, bold: baseBold })];
}

interface StructuredClause {
    version_id: string;
    clause_code: string;
    type_code: string;
    type_name: string;
    clause_description: string;  // Individual clause title (from clauses.description)
    selection_priority: number;
    content_template: string;
}

export class DocxExportService {

    private readonly STORAGE_DIR = path.resolve(__dirname, '../../outputs');

    constructor() {
        if (!fs.existsSync(this.STORAGE_DIR)) {
            fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
        }
    }

    async generateDocx(generationId: string) {
        console.log(`[DocxExportService] Generating DOCX for generation=${generationId}`);

        // 1. Fetch generation context
        const generation = await this.getGeneration(generationId);

        // 2. Parse selected clauses
        const selectedClauses = typeof generation.selected_clauses === 'string'
            ? JSON.parse(generation.selected_clauses)
            : generation.selected_clauses;

        const normalizedClauses = selectedClauses.map((c: any) => ({
            ...c,
            version_id: c.version || c.version_id
        }));

        const versionIds = normalizedClauses.map((c: any) => c.version_id);

        // 3. Fetch structured clause data from DB (type_code, type_name, content_template)
        const clauseRows = await this.fetchStructuredClauseData(versionIds, normalizedClauses);

        // 4. Build flat variables map from diagnosis_output
        const variables = this.buildVariablesMap(generation.diagnosis_output);

        // 5. Resolve placeholders in all clause content
        const resolvedClauses = clauseRows.map(row => ({
            ...row,
            resolved_content: this.replacePlaceholders(row.content_template, variables)
        }));

        // 6. Create structured DOCX
        const doc = this.createStructuredDocument(
            generation.diagnosis_output?.proemio,
            resolvedClauses
        );

        // 7. Save
        const buffer = await Packer.toBuffer(doc);
        const fileName = `contract_${generationId}.docx`;
        const filePath = path.join(this.STORAGE_DIR, fileName);
        fs.writeFileSync(filePath, buffer);
        console.log(`[DocxExportService] Saved DOCX to ${filePath}`);

        const outputId = await this.persistOutputRecord(generationId, filePath);

        return {
            success: true,
            generation_id: generationId,
            output_id: outputId,
            file_path: filePath
        };
    }

    // ─── Private: DB queries ────────────────────────────────────────────────────

    private async fetchStructuredClauseData(
        versionIds: string[],
        orderedClauses: any[]
    ): Promise<StructuredClause[]> {
        if (versionIds.length === 0) return [];

        const res = await pool.query<StructuredClause>(`
            SELECT
                cv.id                   AS version_id,
                c.code                  AS clause_code,
                ct.code                 AS type_code,
                ct.name                 AS type_name,
                COALESCE(c.description, c.code) AS clause_description,
                c.selection_priority,
                cv.content_template
            FROM clause_versions cv
            JOIN clauses      c  ON cv.clause_id    = c.id
            JOIN clause_types ct ON c.clause_type_id = ct.id
            WHERE cv.id = ANY($1::uuid[])
        `, [versionIds]);

        // Sort: first by retrieval order (type position in blueprint), then by selection_priority within type
        const orderMap = new Map(orderedClauses.map((c, i) => [c.version_id, i]));
        return res.rows.sort((a, b) => {
            const typeOrderDiff = (orderMap.get(a.version_id) ?? 999) - (orderMap.get(b.version_id) ?? 999);
            if (typeOrderDiff !== 0) return typeOrderDiff;
            return (a.selection_priority ?? 100) - (b.selection_priority ?? 100);
        });
    }

    // ─── Private: Variables ─────────────────────────────────────────────────────

    private buildVariablesMap(diagnosisOutput: any): Record<string, string> {
        const vars: Record<string, string> = {};

        // 1. Flatten structured variables (commercial_terms, service_terms, etc.)
        const structured = diagnosisOutput?.variables || {};
        const flat = this.flattenObject(structured);
        for (const [k, v] of Object.entries(flat)) {
            if (v !== null && v !== undefined) vars[k] = String(v);
        }

        // 2. Merge contract_specific_variables (exact placeholder keys from templates)
        const csv = diagnosisOutput?.contract_specific_variables;
        if (csv && typeof csv === 'object') {
            for (const [k, v] of Object.entries(csv)) {
                if (v !== null && v !== undefined) vars[k] = String(v);
            }
        }

        // 3. Backfill from proemio for common party placeholders
        const proemio = diagnosisOutput?.proemio;
        if (proemio?.parties) {
            for (const party of proemio.parties) {
                const role = (party.role_label || '').toLowerCase();
                if (role.includes('vendedor') || role.includes('arrendador') || role.includes('proveedor')) {
                    vars['nombre del Vendedor'] = vars['nombre del Vendedor'] || party.legal_name;
                    vars['nombre del Arrendador'] = vars['nombre del Arrendador'] || party.legal_name;
                    vars['nombre del Proveedor'] = vars['nombre del Proveedor'] || party.legal_name;
                }
                if (role.includes('comprador') || role.includes('arrendatario') || role.includes('cliente')) {
                    vars['nombre del Comprador'] = vars['nombre del Comprador'] || party.legal_name;
                    vars['nombre del Arrendatario'] = vars['nombre del Arrendatario'] || party.legal_name;
                    vars['nombre del Cliente'] = vars['nombre del Cliente'] || party.legal_name;
                }
            }
            if (proemio.execution_date) {
                const { day, month, year } = proemio.execution_date;
                vars['fecha'] = `${day || ''} de ${month || ''} de ${year || ''}`.trim();
            }
        }

        // 4. Montos: $X,XXX.XX (Texto en palabras /100 M.N.) — mismo criterio que drafting
        return enrichVariablesWithMoneyFormatting(vars, diagnosisOutput);
    }

    private flattenObject(obj: any, prefix = ''): Record<string, any> {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(obj || {})) {
            const full = prefix ? `${prefix}.${k}` : k;
            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
                Object.assign(out, this.flattenObject(v, full));
            } else {
                out[full] = v;
            }
        }
        return out;
    }

    private resolveVar(variables: Record<string, string>, keyRaw: string): string | undefined {
        const key = keyRaw.trim();
        if (Object.prototype.hasOwnProperty.call(variables, key)) return variables[key];
        const lower = key.toLowerCase();
        for (const [k, v] of Object.entries(variables)) {
            if (k.toLowerCase() === lower) return v;
        }
        return undefined;
    }

    private replacePlaceholders(template: string, variables: Record<string, string>): string {
        let t = template.replace(/\\n/g, '\n');
        let result = t.replace(/\{\{([^}]+)\}\}/g, (_, keyRaw) => {
            const v = this.resolveVar(variables, keyRaw);
            return v !== undefined && v !== null ? v : `[${keyRaw.trim()}]`;
        });
        result = result.replace(/\{([^{}]+)\}/g, (_, keyRaw) => {
            const v = this.resolveVar(variables, keyRaw);
            return v !== undefined && v !== null ? v : `[${keyRaw.trim()}]`;
        });
        return sanitizeResolvedContractText(result);
    }

    // ─── Private: Document structure ────────────────────────────────────────────

    private createStructuredDocument(
        proemio: any,
        resolvedClauses: Array<StructuredClause & { resolved_content: string }>
    ): Document {
        const children: (Paragraph | Table)[] = [];

        // 1. PROEMIO
        if (proemio) {
            children.push(...this.renderProemio(proemio));
        }

        // 2. Split clauses into declarations vs. substantive clauses
        const declClauses = resolvedClauses.filter(r => r.type_code.startsWith('declaraciones'));
        const substClauses = resolvedClauses.filter(r => !r.type_code.startsWith('declaraciones'));

        // 3. DECLARACIONES section (from blueprint templates only, NOT AI-generated)
        if (declClauses.length > 0) {
            children.push(...this.renderDeclarationsSection(declClauses, proemio));
        }

        // 4. Transition line + "CLÁUSULAS" subtitle (solo párrafos; sin saltos de página forzados)
        if (substClauses.length > 0) {
            children.push(new Paragraph({
                children: [
                    new TextRun({
                        text: 'Expuesto lo anterior, las Partes otorgan las siguientes:',
                        font: 'Times New Roman', size: 24
                    })
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 240, after: 200, line: LINE_SPACING }
            }));

            children.push(new Paragraph({
                children: [
                    new TextRun({
                        text: 'CLÁUSULAS',
                        bold: true,
                        font: 'Times New Roman',
                        size: 24
                    })
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 200, line: LINE_SPACING }
            }));
        }

        // 5. CLAUSULAS SUBSTANTIVAS (numbered ordinals)
        children.push(...this.renderSubstantiveClauses(substClauses));

        // 6. Signature block
        children.push(...this.renderSignatureBlock(proemio));

        return new Document({
            sections: [{
                properties: {
                    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
                },
                children,
            }],
        });
    }

    // ─── Declarations section ────────────────────────────────────────────────────

    private renderDeclarationsSection(
        clauses: Array<StructuredClause & { resolved_content: string }>,
        proemio: any
    ): Paragraph[] {
        const paragraphs: Paragraph[] = [];

        // HEADING "DECLARACIONES"
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: 'DECLARACIONES', bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200, line: LINE_SPACING }
        }));

        // Group by type_code to create one section per declaring party
        const grouped = this.groupByTypeCode(clauses);
        let romanIdx = 0;

        for (const [typeCode, items] of grouped) {
            const roman = this.toRoman(++romanIdx);
            const partyLabel = this.partyLabelFromTypeCode(typeCode, proemio);
            const capacity = this.capacityFromProemio(typeCode, proemio);

            // Section header: "I. Declara EL VENDEDOR, por conducto de su representante, que:"
            paragraphs.push(new Paragraph({
                children: [
                    new TextRun({ text: `${roman}. `, bold: true, font: 'Times New Roman', size: 24 }),
                    new TextRun({ text: `Declara ${partyLabel}, ${capacity}, que:`, bold: true, font: 'Times New Roman', size: 24 })
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 160, after: 80, line: LINE_SPACING }
            }));

            // Each clause → lettered inciso: hanging indent (aligned like inciso b); optional inner bullets
            items.forEach((item, idx) => {
                const letter = LETTERS[idx] || String(idx + 1);
                const merged = item.resolved_content
                    .split(/\\n|\n/)
                    .map(l => l.trim())
                    .filter(l => l.length > 0)
                    .join(' ');

                const { intro, bullets } = splitInlineFieldBullets(merged);

                paragraphs.push(new Paragraph({
                    children: [
                        new TextRun({ text: `${letter})  `, font: 'Times New Roman', size: 24 }),
                        ...paragraphBodyRuns(intro)
                    ],
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: {
                        // Si hay bullets debajo, dejamos un poco de aire antes de la primera viñeta;
                        // el salto “entre incisos” va después de la última viñeta.
                        after: bullets.length > 0 ? 72 : DECL_INCISO_GAP_AFTER,
                        line: LINE_SPACING
                    },
                    indent: { left: DECL_INCISO_LEFT + DECL_INCISO_HANGING, hanging: DECL_INCISO_HANGING }
                }));

                const bulletHang = 280;
                const bulletLeft = DECL_INCISO_LEFT + DECL_INCISO_HANGING + 360;
                bullets.forEach((b, bi) => {
                    const isLastBullet = bi === bullets.length - 1;
                    paragraphs.push(new Paragraph({
                        children: [
                            new TextRun({ text: '• ', font: 'Times New Roman', size: 24 }),
                            ...paragraphBodyRuns(b)
                        ],
                        alignment: AlignmentType.JUSTIFIED,
                        spacing: {
                            after: isLastBullet ? DECL_INCISO_GAP_AFTER : 100,
                            line: LINE_SPACING
                        },
                        indent: { left: bulletLeft + bulletHang, hanging: bulletHang }
                    }));
                });
            });

            paragraphs.push(new Paragraph({
                text: '',
                spacing: { after: 100, line: LINE_SPACING }
            }));
        }

        return paragraphs;
    }

    /** Título de referencia (sin forzar mayúsculas) — debe coincidir con lo que redacta la plantilla. */
    private clauseHeadingTitleForRef(c: StructuredClause): string {
        if (
            c.clause_description &&
            c.clause_description !== c.type_code &&
            c.clause_description !== c.clause_code
        ) {
            return c.clause_description.trim();
        }
        return (c.type_name || c.clause_code || '').trim();
    }

    /** Títulos de las demás cláusulas para detectar citas en el cuerpo (mayúsculas y texto mixto). */
    private buildRefTitlesForClause(clauses: StructuredClause[], excludeIndex: number): string[] {
        const selfNorm = this.clauseHeadingTitleForRef(clauses[excludeIndex]).toLowerCase();
        const set = new Set<string>();
        for (let j = 0; j < clauses.length; j++) {
            if (j === excludeIndex) continue;
            const raw = this.clauseHeadingTitleForRef(clauses[j]);
            if (raw.length < MIN_CLAUSE_REF_TITLE_LEN) continue;
            if (raw.toLowerCase() === selfNorm) continue;
            set.add(raw);
            set.add(raw.toUpperCase());
        }
        return [...set];
    }

    // ─── Substantive clauses ─────────────────────────────────────────────────────

    private renderSubstantiveClauses(
        clauses: Array<StructuredClause & { resolved_content: string }>
    ): Paragraph[] {
        const paragraphs: Paragraph[] = [];

        // Each individual clause gets its own ordinal number and its own title.
        // When multiple clauses share the same type_code (e.g. generic "clausulas"),
        // they are still numbered separately using their clause_description as title.
        // When a type has a unique, meaningful name (not the generic type), prefer it.
        clauses.forEach((clause, idx) => {
            const ordinal = CLAUSE_ORDINALS[idx] || `${idx + 1}a`;
            const refTitles = this.buildRefTitlesForClause(clauses, idx);

            // Use clause_description as title when available and it differs from type_name.
            // Falls back to type_name → clause_code.
            const title = (
                clause.clause_description &&
                clause.clause_description !== clause.type_code &&
                clause.clause_description !== clause.clause_code
            )
                ? clause.clause_description.toUpperCase()
                : (clause.type_name?.toUpperCase() || clause.clause_code);

            const bodyLines = expandClauseBodyParagraphs(clause.resolved_content);
            const firstLineRuns =
                bodyLines.length > 0 ? paragraphBodyRunsWithRefs(bodyLines[0], refTitles) : [];

            // Heading: "PRIMERA. OBJETO." (no "CLÁUSULA" prefix, no gap to body)
            paragraphs.push(new Paragraph({
                children: [
                    new TextRun({
                        text: `${ordinal}. ${title}. `,
                        bold: true,
                        font: 'Times New Roman',
                        size: 24
                    }),
                    ...firstLineRuns
                ],
                alignment: AlignmentType.JUSTIFIED,
                spacing: {
                    before: 200,
                    after: bodyLines.length > 1 ? 60 : 0,
                    line: LINE_SPACING
                }
            }));

            for (const line of bodyLines.slice(1)) {
                paragraphs.push(new Paragraph({
                    children: paragraphBodyRunsWithRefs(line, refTitles),
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { before: 180, after: 0, line: LINE_SPACING }
                }));
            }

            paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
        });

        return paragraphs;
    }

    // ─── Signature block ─────────────────────────────────────────────────────────

    private renderSignatureBlock(proemio: any): (Paragraph | Table)[] {
        const out: (Paragraph | Table)[] = [];

        out.push(new Paragraph({
            children: [new TextRun({ text: 'FIRMAS', bold: true, font: 'Times New Roman', size: 24 })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600, after: 400, line: LINE_SPACING }
        }));

        const parties: any[] = proemio?.parties || [];
        if (parties.length === 0) return out;

        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const rows: TableRow[] = [];
        for (let i = 0; i < parties.length; i += 2) {
            const left = parties[i];
            const right = parties[i + 1];
            rows.push(new TableRow({
                children: [
                    this.signatureCell(left),
                    right ? this.signatureCell(right) : this.emptySignatureCell()
                ]
            }));
        }

        out.push(new Table({
            layout: TableLayoutType.FIXED,
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: [4680, 4680],
            borders: {
                top: noBorder,
                bottom: noBorder,
                left: noBorder,
                right: noBorder,
                insideHorizontal: noBorder,
                insideVertical: noBorder,
            },
            rows,
        }));

        return out;
    }

    private signatureCell(party: any): TableCell {
        return new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 120, bottom: 120, left: 200, right: 200 },
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200, after: 280, line: LINE_SPACING },
                    children: [
                        new TextRun({
                            text: `${party.role_label?.toUpperCase() || 'PARTE'}`,
                            bold: true,
                            font: 'Times New Roman',
                            size: 24
                        })
                    ]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 80, line: LINE_SPACING },
                    text: ''
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, line: LINE_SPACING },
                    children: [
                        new TextRun({ text: '___________________________', font: 'Times New Roman', size: 24 })
                    ]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200, line: LINE_SPACING },
                    children: [
                        new TextRun({ text: party.legal_name || '', font: 'Times New Roman', size: 24 })
                    ]
                }),
            ],
        });
    }

    private emptySignatureCell(): TableCell {
        return new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ text: '' })],
        });
    }

    // ─── Proemio (unchanged from original, robust) ───────────────────────────────

    private renderProemio(proemio: any): Paragraph[] {
        const paragraphs: Paragraph[] = [];

        if (!proemio?.contract_title || !proemio?.parties) {
            paragraphs.push(this.p('[ Error: datos del proemio incompletos ]', {}));
            return paragraphs;
        }

        const monthMap: Record<string, string> = {
            '1': 'enero', '01': 'enero', '2': 'febrero', '02': 'febrero',
            '3': 'marzo', '03': 'marzo', '4': 'abril', '04': 'abril',
            '5': 'mayo', '05': 'mayo', '6': 'junio', '06': 'junio',
            '7': 'julio', '07': 'julio', '8': 'agosto', '08': 'agosto',
            '9': 'septiembre', '09': 'septiembre', '10': 'octubre',
            '11': 'noviembre', '12': 'diciembre'
        };

        const now = new Date();
        const ed = proemio.execution_date || {};
        const safeDay = ed.day || now.getDate();
        const safeYear = ed.year || now.getFullYear();
        let month = String(ed.month || (now.getMonth() + 1));
        month = monthMap[month] || month.toLowerCase();

        paragraphs.push(new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200, line: LINE_SPACING },
            children: [
                new TextRun({ text: proemio.contract_title.toUpperCase(), bold: true, font: 'Times New Roman', size: 24 }),
                new TextRun({ text: ` (en lo sucesivo,${NBSP}el${NBSP}\u201c`, font: 'Times New Roman', size: 24 }),
                new TextRun({ text: 'Contrato', bold: true, underline: { type: 'single' }, font: 'Times New Roman', size: 24 }),
                new TextRun({
                    text: `\u201d), ${spanishProemioDatePhrase(safeDay, month, safeYear)},${NBSP}que${NBSP}celebran:`,
                    font: 'Times New Roman',
                    size: 24
                })
            ]
        }));

        proemio.parties.forEach((party: any, index: number) => {
            const isLast = index === proemio.parties.length - 1;
            const runs: TextRun[] = [];

            runs.push(new TextRun({ text: `(${index + 1}) `, font: 'Times New Roman', size: 24 }));
            runs.push(new TextRun({ text: party.legal_name, font: 'Times New Roman', size: 24 }));
            runs.push(new TextRun({ text: ', ', font: 'Times New Roman', size: 24 }));

            const isMoral = party.party_type === 'persona_moral' || (!party.party_type && party.represented_by);

            if (isMoral) {
                const rep = party.represented_by || 'su representante legal';
                runs.push(new TextRun({ text: '(el \u201c', font: 'Times New Roman', size: 24 }));
                runs.push(new TextRun({ text: party.short_name || party.role_label, bold: true, underline: { type: 'single' }, font: 'Times New Roman', size: 24 }));
                runs.push(new TextRun({ text: `\u201d), representada en este acto por ${rep}`, font: 'Times New Roman', size: 24 }));
            } else {
                runs.push(new TextRun({ text: 'por su propio derecho, (el \u201c', font: 'Times New Roman', size: 24 }));
                runs.push(new TextRun({ text: party.short_name || party.role_label, bold: true, underline: { type: 'single' }, font: 'Times New Roman', size: 24 }));
                runs.push(new TextRun({ text: '\u201d)', font: 'Times New Roman', size: 24 }));
            }

            if (!isLast) {
                runs.push(new TextRun({ text: ', y', font: 'Times New Roman', size: 24 }));
            } else {
                const firstAlias = proemio.parties[0]?.short_name || proemio.parties[0]?.role_label || '';
                runs.push(new TextRun({ text: ` y en conjunto con el ${firstAlias} las \u201c`, font: 'Times New Roman', size: 24 }));
                runs.push(new TextRun({ text: 'Partes', bold: true, underline: { type: 'single' }, font: 'Times New Roman', size: 24 }));
                runs.push(new TextRun({ text: '\u201d al tenor de las declaraciones y cl\u00e1usulas siguientes:', font: 'Times New Roman', size: 24 }));
            }

            paragraphs.push(new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                spacing: { after: isLast ? 300 : 160, line: LINE_SPACING },
                children: runs
            }));
        });

        return paragraphs;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private groupByTypeCode<T extends { type_code: string }>(items: T[]): Map<string, T[]> {
        const map = new Map<string, T[]>();
        for (const item of items) {
            const existing = map.get(item.type_code);
            if (existing) existing.push(item);
            else map.set(item.type_code, [item]);
        }
        return map;
    }

    private partyLabelFromTypeCode(typeCode: string, proemio: any): string {
        // e.g. declaraciones_vendedor → look for matching party in proemio
        const suffix = typeCode.replace(/^declaraciones_?/, '').toLowerCase();
        if (!suffix) return 'LA PARTE';

        // Try to match against proemio party role labels
        if (proemio?.parties) {
            for (const p of proemio.parties) {
                const role = (p.role_label || '').toLowerCase();
                if (role.includes(suffix)) {
                    return `EL ${p.role_label.toUpperCase()}`;
                }
            }
        }

        return `EL ${suffix.toUpperCase()}`;
    }

    private capacityFromProemio(typeCode: string, proemio: any): string {
        const suffix = typeCode.replace(/^declaraciones_?/, '').toLowerCase();
        if (!suffix || !proemio?.parties) return 'bajo protesta de decir verdad';

        for (const p of proemio.parties) {
            const role = (p.role_label || '').toLowerCase();
            if (role.includes(suffix)) {
                return p.party_type === 'persona_moral'
                    ? 'por conducto de su representante'
                    : 'bajo protesta de decir verdad';
            }
        }
        return 'por conducto de su representante';
    }

    private toRoman(n: number): string {
        const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
        const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        let result = '';
        let remaining = n;
        for (let i = 0; i < vals.length; i++) {
            while (remaining >= vals[i]) { result += syms[i]; remaining -= vals[i]; }
        }
        return result;
    }

    private p(text: string, opts: { spacing?: any; justify?: boolean }): Paragraph {
        return new Paragraph({
            children: [new TextRun({ text, font: 'Times New Roman', size: 24 })],
            alignment: opts.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
            spacing: opts.spacing
        });
    }

    // ─── DB helpers ──────────────────────────────────────────────────────────────

    private async getGeneration(id: string) {
        const res = await pool.query('SELECT * FROM contract_generations WHERE id = $1', [id]);
        if (res.rows.length === 0) throw new Error('Generation not found');
        return res.rows[0];
    }

    private async persistOutputRecord(generationId: string, storagePath: string) {
        const res = await pool.query(
            `INSERT INTO contract_outputs (generation_id, format, storage_path)
             VALUES ($1, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', $2)
             RETURNING id`,
            [generationId, storagePath]
        );
        return res.rows[0].id;
    }
}
