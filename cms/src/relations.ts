import { api } from './api';
import { FieldSpec, relationFields, RelationSpec } from './models';
import { buildFolderPathMap, normalizeFileFolderRows } from './utils/fileFolders';

export type LookupMap = Record<string, Record<string, string>>;

function resolveRelationSpec(field: string | FieldSpec) {
  if (typeof field === 'string') return relationFields[field];
  if (field.type === 'file') {
    return { resource: 'files', labelFields: ['title', 'originalName'] };
  }
  return field.relation || relationFields[field.key];
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
  const uniqueResources = Array.from(new Set(relationSpecs.map((spec) => spec.resource)));
  const entries = await Promise.all(
    uniqueResources.map(async (resource) => {
      const response = await api.get(`/records/${resource}`, { params: { pageSize: resource === 'file-folders' ? 500 : 100 } }).catch(() => ({ data: { data: [] } }));
      const spec = relationSpecs.find((item) => item.resource === resource)!;
      if (resource === 'file-folders') {
        const rows = normalizeFileFolderRows(response.data.data || []);
        return [resource, buildFolderPathMap(rows)] as const;
      }
      const byId = Object.fromEntries(
        response.data.data.map((row: Record<string, unknown>) => [
          String(row.id),
          relationLabel(row, spec),
        ]),
      );
      return [resource, byId] as const;
    }),
  );
  return Object.fromEntries(entries) as LookupMap;
}

export function displayValue(field: string | FieldSpec, value: unknown, lookups: LookupMap) {
  if (value === null || value === undefined || value === '') return '-';
  const relation = resolveRelationSpec(field);
  if (Array.isArray(value)) {
    if (relation) return value.map((item) => lookups[relation.resource]?.[String(item)] || String(item)).join(', ');
    return value.join(', ');
  }
  if (relation) return lookups[relation.resource]?.[String(value)] || String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
