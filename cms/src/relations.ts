import dayjs from 'dayjs';
import { api } from './api';
import { FieldSpec, relationFields, RelationSpec } from './models';
import { formatClinicDateTime, normalizeDateValueForInput } from './utils/datetime';
import { buildFolderPathMap, normalizeFileFolderRows } from './utils/fileFolders';

export type LookupMap = Record<string, Record<string, string>>;
export interface RelationLookupRecord extends Record<string, unknown> {
  id: string
  label: string
  code?: string
  fullName?: string
  name?: string
  avatarUrl?: string
  display_title?: string
}
export interface FileLookupItem {
  id: string;
  title: string;
  originalName?: string;
  publicUrl: string;
  mimeType?: string;
  extension?: string;
}

export type FileLookupMap = Record<string, FileLookupItem>;

function formatDisplayNumber(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return new Intl.NumberFormat('vi-VN').format(numeric)
}

function formatDisplayCurrency(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return `${new Intl.NumberFormat('vi-VN').format(numeric)} đ`
}

function formatDisplayPercent(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return `${new Intl.NumberFormat('vi-VN').format(numeric)}%`
}

function resolveRelationSpec(field: string | FieldSpec) {
  if (typeof field === 'string') return relationFields[field];
  if (field.type === 'file') {
    return { resource: 'files', labelFields: ['title', 'originalName'] };
  }
  return field.relation || relationFields[field.key];
}

export function getRelationSpec(field: string | FieldSpec) {
  return resolveRelationSpec(field);
}

export function getRelationMetaMapKey(key: string) {
  return `${key}__meta`
}

export function getRelationMetaMap(lookups: LookupMap, key: string) {
  return ((lookups as unknown as Record<string, Record<string, RelationLookupRecord>>)[getRelationMetaMapKey(key)]) || {}
}

export function getRelationMeta(lookups: LookupMap, field: string | FieldSpec, value: unknown) {
  const relation = resolveRelationSpec(field)
  if (!relation || value === null || value === undefined || value === '') return undefined
  const itemId = String(value)
  const lookupKey = relation.lookupKey || relation.resource
  const primary = getRelationMetaMap(lookups, lookupKey)[itemId]
  if (primary) return primary
  if (lookupKey !== relation.resource) {
    return getRelationMetaMap(lookups, relation.resource)[itemId]
  }
  return undefined
}

export function isRelationField(key: string) {
  return Boolean(relationFields[key]);
}

export function relationLabel(record: Record<string, unknown>, spec: RelationSpec) {
  const parts = spec.labelFields
    .map((field) => record[field])
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(String);
  return parts.length ? parts.join(' - ') : String(record.id || '');
}

export async function loadRelationOptions(fields: Array<string | FieldSpec>) {
  const relationSpecs = fields
    .map((field) => resolveRelationSpec(field))
    .filter(Boolean) as RelationSpec[];
  const requestSpecs = [
    ...relationSpecs,
    ...relationSpecs
      .filter((spec) => spec.lookupKey && spec.lookupKey !== spec.resource)
      .map((spec) => ({
        ...spec,
        lookupKey: spec.resource,
        params: undefined,
      })),
  ]
  const uniqueKeys = Array.from(new Set(requestSpecs.map((spec) => spec.lookupKey || spec.resource)));
  const entryGroups = await Promise.all(
    uniqueKeys.map(async (key) => {
      const spec = requestSpecs.find((item) => (item.lookupKey || item.resource) === key)!;
      const response = await api
        .get(`/records/${spec.resource}`, { params: { pageSize: 500, ...spec.params } })
        .catch(() => ({ data: { data: [] } }));
      if (spec.resource === 'file-folders') {
        const rows = normalizeFileFolderRows(response.data.data || []);
        return [[key, buildFolderPathMap(rows)]] as const;
      }
      const rows = response.data.data || []
      const byId = Object.fromEntries(
        rows.map((row: Record<string, unknown>) => [
          String(row.id),
          relationLabel(row, spec),
        ]),
      );
      const metaById = Object.fromEntries(
        rows.map((row: Record<string, unknown>) => [
          String(row.id),
          {
            ...row,
            id: String(row.id),
            label: relationLabel(row, spec),
          } satisfies RelationLookupRecord,
        ]),
      )
      return [
        [key, byId],
        [getRelationMetaMapKey(key), metaById],
      ] as const;
    }),
  );
  return Object.fromEntries(entryGroups.flat()) as LookupMap;
}

export async function loadFileLookupMap(pageSize = 500) {
  const response = await api.get('/records/files', { params: { pageSize } }).catch(() => ({ data: { data: [] } }));
  const entries = (response.data.data || []).map((row: Record<string, unknown>) => [
    String(row.id),
    {
      id: String(row.id),
      title: String(row.title || row.originalName || row.id),
      originalName: row.originalName ? String(row.originalName) : undefined,
      publicUrl: String(row.publicUrl || ''),
      mimeType: row.mimeType ? String(row.mimeType) : undefined,
      extension: row.extension ? String(row.extension) : undefined,
    } satisfies FileLookupItem,
  ] as const);
  return Object.fromEntries(entries) as FileLookupMap;
}

const DATETIME_KEYS = new Set(['createdAt', 'updatedAt', 'deletedAt']);

export function displayValue(field: string | FieldSpec, value: unknown, lookups: LookupMap) {
  if (value === null || value === undefined || value === '') return '-';

  // Resolve label from select options when available
  if (typeof field !== 'string' && (field.type === 'select' || field.type === 'multi-select') && field.options?.length) {
    const optionMap = new Map(
      field.options.map((opt) => (typeof opt === 'string' ? [opt, opt] : [opt.value, opt.label])),
    );
    if (Array.isArray(value)) return value.map((item) => optionMap.get(String(item)) ?? String(item)).join(', ');
    const label = optionMap.get(String(value));
    if (label !== undefined) return label;
  }

  // Date / datetime formatting
  const fieldType = typeof field === 'string' ? undefined : field.type;
  const fieldKey = typeof field === 'string' ? field : field.key;
  if (fieldType === 'date') {
    const normalized = normalizeDateValueForInput(value)
    const parsed = normalized ? dayjs(normalized) : dayjs(String(value))
    if (parsed.isValid()) return parsed.format('DD/MM/YYYY');
  }
  if (fieldType === 'datetime' || DATETIME_KEYS.has(fieldKey)) {
    return formatClinicDateTime(value);
  }

  const relation = resolveRelationSpec(field);
  if (Array.isArray(value)) {
    if (relation) return value.map((item) => lookups[relation.resource]?.[String(item)] || String(item)).join(', ');
    return value.join(', ');
  }
  if (relation) return lookups[relation.lookupKey || relation.resource]?.[String(value)] || lookups[relation.resource]?.[String(value)] || String(value);
  if (typeof field !== 'string') {
    if (field.displayFormat === 'currency') return formatDisplayCurrency(value);
    if (field.displayFormat === 'number') return formatDisplayNumber(value);
    if (field.displayFormat === 'percent') return formatDisplayPercent(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
