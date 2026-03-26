// Active catalog: only blueprints loaded in DB via saas_clauses.xlsx
// Extend this list as more blueprints are added to the Excel and seeded.
export const CONTRACT_CATALOG_VERSION = 'mx-saas-clauses-v1';

export const MX_CONTRACT_CATALOG = [
  {
    intent_code: 'vehiculo_compraventa_mx',
    name: 'Contrato de Compraventa de Vehiculo',
    aliases: [
      'compraventa de vehiculo',
      'compraventa vehiculo',
      'venta de vehiculo',
      'vehiculo',
      'vin',
      'tarjeta de circulacion',
      'vehicle purchase',
      'vehicle sale'
    ]
  },
  {
    intent_code: 'inmueble_compraventa_mx',
    name: 'Contrato de Compraventa de Inmueble (sin reserva)',
    aliases: [
      'compraventa de inmueble',
      'compraventa inmueble',
      'venta de inmueble',
      'inmueble',
      'escritura publica',
      'ad corpus'
    ]
  },
  {
    intent_code: 'real_estate_sale_reserva_dominio',
    name: 'Compraventa de Inmueble con Reserva de Dominio',
    aliases: [
      'reserva de dominio',
      'compraventa con reserva',
      'dominio reservado',
      'reserva dominio'
    ]
  }
] as const;

export const MX_INTENT_CODES = MX_CONTRACT_CATALOG.map(item => item.intent_code) as [
  (typeof MX_CONTRACT_CATALOG)[number]['intent_code'],
  ...(typeof MX_CONTRACT_CATALOG)[number]['intent_code'][]
];

export const MX_INTENT_CODE_SET = new Set<string>(MX_INTENT_CODES);

export function inferIntentFromText(userRequest: string): string | null {
  const normalized = userRequest.toLowerCase();
  for (const item of MX_CONTRACT_CATALOG) {
    if (item.aliases.some(alias => normalized.includes(alias))) {
      return item.intent_code;
    }
  }
  return null;
}
