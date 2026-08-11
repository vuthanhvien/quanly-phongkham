const CODE_PREFIXES: Record<string, string> = {
  appointments: 'APT',
  branches: 'BRA',
  customers: 'CUS',
  departments: 'DEP',
  expenses: 'EXP',
  invoices: 'INV',
  leads: 'LEAD',
  medical_episodes: 'MED',
  'medical-episodes': 'MED',
  products: 'PROD',
  projects: 'PROJ',
  rooms: 'ROOM',
  service_orders: 'SO',
  'service-orders': 'SO',
  staff: 'STF',
  suppliers: 'SUP',
  tasks: 'TASK',
  treatments: 'TRT',
  users: 'USR',
};

/** Default is recognizable per module, e.g. CUS-000001 or LEAD-000001. */
export function defaultCodeFormula(resource: string): string {
  const normalized = String(resource || '').trim().toLowerCase();
  const prefix = CODE_PREFIXES[normalized]
    || normalized.split(/[-_]/).filter(Boolean).map((part) => part.slice(0, 2)).join('').slice(0, 4).toUpperCase()
    || 'REC';
  return `${prefix}-{NUMBER:6}`;
}
