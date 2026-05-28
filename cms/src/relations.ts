import { api } from './api';
import { relationFields, RelationSpec } from './models';

export type LookupMap = Record<string, Record<string, string>>;

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

export async function loadRelationOptions(fieldKeys: string[]) {
  const uniqueResources = Array.from(new Set(fieldKeys.map((key) => relationFields[key]?.resource).filter(Boolean)));
  const entries = await Promise.all(
    uniqueResources.map(async (resource) => {
      const response = await api.get(`/records/${resource}`, { params: { pageSize: 100 } }).catch(() => ({ data: { data: [] } }));
      const byId = Object.fromEntries(
        response.data.data.map((row: Record<string, unknown>) => [
          String(row.id),
          relationLabel(row, relationFields[fieldKeys.find((key) => relationFields[key]?.resource === resource)!]),
        ]),
      );
      return [resource, byId] as const;
    }),
  );
  return Object.fromEntries(entries) as LookupMap;
}

export function displayValue(fieldKey: string, value: unknown, lookups: LookupMap) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '-';
  const relation = relationFields[fieldKey];
  if (relation) return lookups[relation.resource]?.[String(value)] || String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
