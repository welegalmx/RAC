/**
 * Formato legal de montos para plantillas RAC (DOCX y texto plano).
 */

export function integerToSpanishWords(n: number): string {
    if (!Number.isFinite(n) || n < 0) return '';
    if (n === 0) return 'cero';

    const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];

    function chunkHundreds(num: number): string {
        let s = '';
        const h = Math.floor(num / 100);
        const rest = num % 100;
        if (h === 1) s += (rest === 0 ? 'cien' : 'ciento ');
        else if (h === 5) s += 'quinientos ';
        else if (h === 7) s += 'setecientos ';
        else if (h === 9) s += 'novecientos ';
        else if (h > 1) s += units[h] + 'cientos ';
        if (rest < 10) s += units[rest];
        else if (rest < 20) s += teens[rest - 10];
        else {
            const t = Math.floor(rest / 10);
            const u = rest % 10;
            if (t === 2) s += (u === 0 ? 'veinte' : `veinti${units[u]}`);
            else s += (u === 0 ? tens[t] : `${tens[t]} y ${units[u]}`);
        }
        return s.trim();
    }

    const billions = Math.floor(n / 1_000_000_000);
    const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
    const thousands = Math.floor((n % 1_000_000) / 1000);
    const remainder = n % 1000;

    const parts: string[] = [];
    if (billions > 0) {
        parts.push(billions === 1 ? 'mil millones' : `${chunkHundreds(billions)} mil millones`);
    }
    if (millions > 0) {
        parts.push(millions === 1 ? 'un millón' : `${chunkHundreds(millions)} millones`);
    }
    if (thousands > 0) {
        if (thousands === 1) parts.push('mil');
        else parts.push(`${chunkHundreds(thousands)} mil`);
    }
    if (remainder > 0) parts.push(chunkHundreds(remainder));
    return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function capitalizeSpanishSentence(s: string): string {
    const t = s.trim();
    if (!t) return t;
    return t.charAt(0).toUpperCase() + t.slice(1);
}

export function formatMonetaryAmountPesos(amount: number): string {
    const decPart = Math.round((Math.abs(amount) * 100) % 100);
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    const words = capitalizeSpanishSentence(integerToSpanishWords(Math.floor(Math.abs(amount))));
    return `$${formatted} (${words} pesos ${String(decPart).padStart(2, '0')}/100 M.N.)`;
}

export function formatMonetaryAmountUsd(amount: number): string {
    const decPart = Math.round((Math.abs(amount) * 100) % 100);
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    const words = capitalizeSpanishSentence(integerToSpanishWords(Math.floor(Math.abs(amount))));
    return `USD ${formatted} (${words} dólares ${String(decPart).padStart(2, '0')}/100 USD)`;
}

export function formatMonetaryAmountEur(amount: number): string {
    const decPart = Math.round((Math.abs(amount) * 100) % 100);
    const formatted = new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    const words = capitalizeSpanishSentence(integerToSpanishWords(Math.floor(Math.abs(amount))));
    return `EUR ${formatted} (${words} euros ${String(decPart).padStart(2, '0')}/100 EUR)`;
}

export function formatAmountByCurrency(amount: number, currency: string): string {
    const c = String(currency || 'MXN').toUpperCase();
    if (c === 'USD') return formatMonetaryAmountUsd(amount);
    if (c === 'EUR') return formatMonetaryAmountEur(amount);
    return formatMonetaryAmountPesos(amount);
}

/** Claves que jamás deben recibir formato de cantidad monetaria (años, tenencias, datos del vehículo, etc.). */
function isNonMoneyPlaceholderKey(key: string): boolean {
    const k = key.toLowerCase();
    if (/\baño\b|\banio\b|último año|tenencias|verificaciones/.test(k)) return true;
    if (/^incluir (el )?(último )?año/.test(k)) return true;
    if (/\bvin\b|\bserie\b|\bplaca\b|\bcolor\b|\bmodelo\b|\bmarca\b|características|kilometraje/.test(k)) return true;
    // Plazos, vigencias y calendario (no importes)
    if (/\btimeline\.|term_terms\.|effective_date|delivery_date|start_date|end_date|\bfecha\b|fecha_|\b_fechar_|\bvigencia\b|vencimiento|deadline/.test(k)) {
        return true;
    }
    if (/\b_days\b|_meses\b|_months\b|contract_duration|signing_max|payment_term_days|plazo.*d[ií]as|d[ií]as.*plazo/i.test(k)) {
        return true;
    }
    if (/\bd[ií]as\b|\bmeses\b|\bhoras\b|\baños?\b|\byears?\b|\bmonths?\b/.test(k) && !/\b(monto|precio|importe|amount|anticipo|remanente)\b/i.test(k)) {
        return true;
    }
    if (/\bpena\b.*\b(d[ií]as|meses|porcent|tasa|punto)|\bmulta\b.*\b(d[ií]as|meses|porcent|tasa)|\b(d[ií]as|meses)\b.*\b(pena|multa)\b/i.test(k)) {
        return true;
    }
    if (/\bcosto\b.*\bfiscal\b|\bcosto\b.*\bcatastral\b|\bvalor\b.*\b(catastral|nominal|fiscal|contable)\b/i.test(k)) {
        return true;
    }
    if (/\btotal\b.*\b(horas|d[ií]as|meses|años|unidades|metros|kilos|volumen)\b/i.test(k)) {
        return true;
    }
    if (/\b(tel|telefono|teleféfono|celular|rfc|curp|clave|account|cuenta)\b/i.test(k)) return true;
    if (/\bporcentaje\b|\btasa\b|\biva\b(?!\s*monto)/i.test(k) && !/\b(monto|precio|importe|cuota)\b/i.test(k)) return true;
    return false;
}

/** Claves con subcadena ambigua que solían activar dinero sin serlo (p. ej. solo "total" en contexto no monetario). */
function isAmbiguousMoneySubstringKey(key: string): boolean {
    const k = key.toLowerCase();
    if (/\bvalor\b/.test(k)) {
        if (/\bcatastral\b|\bnominal\b|\bfiscal\b|\bcontable\b|\ben\s+libros\b/i.test(k)) return true;
    }
    if (/\btotal\b/.test(k)) {
        const clearlyMoney =
            /\b(monto|precio|cantidad|importe|anticipo|remanente|renta|cuota|saldo|honorarios|contraprest|adeudo|pagadero|suma|pago|contrato|operaci[oó]n)\b|\.amount\b|_amount\b|\.monto\b|_monto\b|_total_amount|grand_total|total_price/i.test(k);
        if (!clearlyMoney) return true;
    }
    return false;
}

export function looksLikeMoneyPlaceholderKey(key: string): boolean {
    const k = key.toLowerCase();
    // "en letra" / precio en letra: solo texto en palabras, sin duplicar símbolo $
    if (/\ben letra\b|monto en letra|precio en letra|importe en letra|cantidad en letra/.test(k)) {
        return true;
    }
    if (/\bletra\b/.test(k) && !/\ben letra\b/.test(k)) return false;
    if (isNonMoneyPlaceholderKey(k)) return false;
    const moneyWord = /amount|currency|monto|precio|importe|valor|total|anticipo|remanente|honorarios|renta|cuota|saldo|costo|pena|multa|price|fee|forma de pago|medios? de pago/.test(k);
    if (!moneyWord) return false;
    if (isAmbiguousMoneySubstringKey(k)) return false;
    return true;
}

export function parseAmountFromString(raw: string): number | null {
    const s = raw
        .replace(/pesos|mxn|usd|eur|mn|m\.n\.|\$/gi, ' ')
        .replace(/,/g, '')
        .trim();
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : null;
}

/** Cadena de fecha / calendario: no aplicar formato monetario al valor. */
export function isDateLikeString(raw: string): boolean {
    const t = raw.trim();
    if (!t) return false;
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return true;
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(t)) return true;
    if (/^\d{1,2}\s+de\s+[a-záéíóúñü]+(?:\s+de\s+\d{4})?/i.test(t)) return true;
    if (/^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}\s*$/.test(t)) return true;
    if (/^\d{1,2}\s*-\s*\d{1,2}\s*-\s*\d{4}\s*$/.test(t)) return true;
    const digits = t.replace(/\D/g, '');
    if (digits.length === 8) {
        const d = Number.parseInt(digits.slice(0, 2), 10);
        const m = Number.parseInt(digits.slice(2, 4), 10);
        const y = Number.parseInt(digits.slice(4, 8), 10);
        if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) return true;
    }
    return false;
}

/** Evita formatear años (p. ej. 2025) como moneda cuando el valor es solo el año. */
export function isLikelyYearNotMoney(raw: string, n: number): boolean {
    const intg = Math.floor(Math.abs(n));
    if (intg < 1900 || intg > 2100) return false;
    const t = raw.replace(/,/g, '').trim();
    if (/^\d{4}$/.test(t)) return true;
    if (/^\d{4}\.0+$/.test(t)) return true;
    return false;
}

/**
 * No enriquecer como dinero: fechas, años, teléfonos/cuentas largas, porcentajes “puros”, etc.
 * (Aunque la clave suene a monto, el valor puede ser otro dato.)
 */
export function shouldSkipMoneyFormatting(raw: string, key: string): boolean {
    const k = key.toLowerCase();
    const t = raw.trim();
    if (isDateLikeString(t)) return true;
    const n = parseAmountFromString(raw);
    if (n !== null && isLikelyYearNotMoney(raw, n)) return true;
    if (isNonMoneyPlaceholderKey(k)) return true;

    // Plazos y conteos: entero pequeño sin decimales típicos de moneda
    if (Number.isFinite(n) && n !== null) {
        const intg = Math.floor(Math.abs(n));
        const fract = Math.abs(n) % 1;
        const looksLikeCount =
            fract < 1e-9 &&
            intg >= 0 &&
            intg <= 500 &&
            /d[ií]as|meses|horas|años|mes\b|plazo|duration|timeline|term|deadline|vigencia|porcent|tasa|iva\b|numero|número|folio|unidades/i.test(k);
        if (looksLikeCount && intg <= 366) return true;

        // Porcentaje explícito en el valor
        if (/\d+%\s*$/.test(t) || /^\s*\d{1,2}(?:[.,]\d+)?\s*%\s*$/.test(t)) return true;

        // Entero 1–31 con clave de fecha/parte de fecha
        if (intg >= 1 && intg <= 31 && /\b(d[ií]a|mes)(\s|_|\b|$)/i.test(k)) return true;
    }

    // Solo dígitos largos (CLABE, teléfono), no formato tipo 1,234.56
    const digitsOnly = t.replace(/\D/g, '');
    if (digitsOnly.length >= 10 && !/[.,]\d{2}\s*$/.test(t) && !/\$|usd|eur|mxn|pesos|m\.n\./i.test(t)) {
        if (digitsOnly.length <= 18 && !k.includes('amount') && !k.includes('monto') && !k.includes('precio') && !k.includes('importe')) {
            return true;
        }
    }

    return false;
}

/**
 * Solo la cantidad en palabras (sin "pesos 00/100 M.N.").
 * Para plantillas del tipo: ({{precio en letra}} pesos 00/100 M.N.)
 */
export function formatAmountLetterWordsOnly(amount: number): string {
    return capitalizeSpanishSentence(integerToSpanishWords(Math.floor(Math.abs(amount))));
}

/** Solo parte en palabras + centavos, para placeholders "en letra" (plantilla sin sufijo de pesos). */
export function formatAmountWordsOnlyPesos(amount: number): string {
    const decPart = Math.round((Math.abs(amount) * 100) % 100);
    const words = capitalizeSpanishSentence(integerToSpanishWords(Math.floor(Math.abs(amount))));
    return `${words} pesos ${String(decPart).padStart(2, '0')}/100 M.N.`;
}

export function formatAmountWordsOnlyUsd(amount: number): string {
    const decPart = Math.round((Math.abs(amount) * 100) % 100);
    const words = capitalizeSpanishSentence(integerToSpanishWords(Math.floor(Math.abs(amount))));
    return `${words} dólares ${String(decPart).padStart(2, '0')}/100 USD`;
}

export function formatAmountWordsOnlyEur(amount: number): string {
    const decPart = Math.round((Math.abs(amount) * 100) % 100);
    const words = capitalizeSpanishSentence(integerToSpanishWords(Math.floor(Math.abs(amount))));
    return `${words} euros ${String(decPart).padStart(2, '0')}/100 EUR`;
}

/**
 * Aplana solo valores string y aplica formato legal de dinero a claves reconocibles.
 */
export function enrichVariablesWithMoneyFormatting(
    vars: Record<string, string>,
    diagnosisOutput: { variables?: any }
): Record<string, string> {
    const structured = diagnosisOutput?.variables || {};
    const currency = (structured.commercial_terms as any)?.currency || 'MXN';
    const next = { ...vars };

    for (const [k, val] of Object.entries(vars)) {
        if (!looksLikeMoneyPlaceholderKey(k)) continue;
        if (shouldSkipMoneyFormatting(val, k)) continue;
        const n = parseAmountFromString(val);
        if (n === null) continue;
        if (isLikelyYearNotMoney(val, n)) continue;

        if (/\ben letra\b|monto en letra|precio en letra|importe en letra|cantidad en letra/i.test(k)) {
            next[k] = formatAmountLetterWordsOnly(n);
            continue;
        }

        if (isNonMoneyPlaceholderKey(k)) continue;
        next[k] = formatAmountByCurrency(n, String(currency));
    }

    const amt = (structured.commercial_terms as any)?.amount;
    if (typeof amt === 'number' && Number.isFinite(amt)) {
        next['commercial_terms.amount'] = formatAmountByCurrency(amt, String(currency));
    }

    const enLetraBad = (v: unknown): boolean => {
        const t = String(v ?? '').trim();
        if (!t) return true;
        if (/^n\/?d$/i.test(t) || /^\[.*\]$/.test(t)) return true;
        return false;
    };
    if (typeof amt === 'number' && Number.isFinite(amt)) {
        for (const [k, v] of Object.entries({ ...next })) {
            if (!/\ben letra\b/i.test(k)) continue;
            if (!enLetraBad(v)) continue;
            next[k] = formatAmountLetterWordsOnly(amt);
        }
        const backfillKeys = [
            'precio del vehículo en letra',
            'precio del Vehículo en letra',
            'monto en letra del precio',
        ];
        for (const bk of backfillKeys) {
            if (enLetraBad(next[bk])) {
                next[bk] = formatAmountLetterWordsOnly(amt);
            }
        }
    }

    for (const [k, v] of Object.entries(next)) {
        const low = k.trim().toLowerCase();
        if (low !== k) next[low] = v;
    }
    return next;
}

/**
 * Colapsa "(… pesos 00/100 M.N.) (… idéntico …)" que deja la plantilla con dos placeholders al mismo monto.
 * También corrige triples repeticiones; compara texto normalizado (mayúsculas / espacios).
 */
function collapseDuplicateAdjacentPesoWordParens(t: string): string {
    let prev = '';
    while (prev !== t) {
        prev = t;
        t = t.replace(/\(([^)]+)\)\s*\(([^)]+)\)/gi, (full, a, b) => {
            const na = a.replace(/\s+/g, ' ').trim().toLowerCase();
            const nb = b.replace(/\s+/g, ' ').trim().toLowerCase();
            if (na !== nb) return full;
            if (!/\bpesos\s+00\/100\s+m\.n\./i.test(na)) return full;
            return `(${a.trim()})`;
        });
    }
    return t;
}

/** Tras sustituir variables: quita MXN$$, paréntesis N/D, "\\n" literal y duplicados típicos de “en letra”. */
export function sanitizeResolvedContractText(s: string): string {
    let t = s.replace(/\\n/g, '\n');
    t = t.replace(/MXN\s*\$+/gi, 'MXN ');
    t = t.replace(/USD\s*\$+/gi, 'USD ');
    t = t.replace(/EUR\s*\$+/gi, 'EUR ');
    t = t.replace(/\(\s*N\/?D\s+pesos\s+00\/100\s+M\.N\.\s*\)/gi, '');
    t = t.replace(/\(\s*\[[^\]]*en\s+letra[^\]]*]\s+pesos\s+00\/100\s+M\.N\.\s*\)/gi, '');
    t = t.replace(/\(\s*N\/?D\s+dólares[^)]*\)/gi, '');
    t = t.replace(/(pesos\s+00\/100\s+M\.N\.)\s+pesos\s+00\/100\s+M\.N\./gi, '$1');
    t = t.replace(
        /((?:\$|MXN\s*|USD\s*|EUR\s*)[\d,]+\.\d{2}\s*\(\s*[^)]+\bpesos\s+00\/100\s+M\.N\.\s*\))\s*\(\s*([^)]+?)\s+pesos\s+00\/100\s+M\.N\.\s*\)/gi,
        (full, firstBlock, secondInner) => {
            const a = firstBlock.toLowerCase().replace(/\s+/g, ' ');
            const b = secondInner.toLowerCase().replace(/\s+/g, ' ').trim();
            if (!b || b.length < 6) return full;
            if (a.includes(b) || (b.length > 12 && a.includes(b.slice(0, 24)))) return firstBlock;
            return full;
        }
    );
    // Duplicado idéntico: "MXN 620,000.00 (…) (…)" — el regex con \$ no aplicaba.
    t = collapseDuplicateAdjacentPesoWordParens(t);
    t = t.replace(/\s+,/g, ',');
    return t.trim();
}
