import type { CmsRole } from './fixtures/auth';

export type RoleExpectation = {
  role: CmsRole;
  /** Main system role expected in the JWT response. */
  roleMain: 'ADMIN' | 'STAFF' | 'DOCTOR';
  visiblePaths: string[];
  restrictedPaths: string[];
};

/**
 * Contract to maintain as modules evolve. Dynamic roles intentionally inherit
 * from their main role; their tenant-specific module/action overrides are
 * asserted separately in permission tests.
 */
export const roleMatrix: RoleExpectation[] = [
  { role: 'ADMIN', roleMain: 'ADMIN', visiblePaths: ['/customers', '/roles', '/audit-logs'], restrictedPaths: [] },
  { role: 'STAFF', roleMain: 'STAFF', visiblePaths: ['/customers', '/calendar'], restrictedPaths: ['/roles', '/audit-logs'] },
  { role: 'DOCTOR', roleMain: 'DOCTOR', visiblePaths: ['/customers', '/calendar'], restrictedPaths: ['/roles', '/audit-logs'] },
  { role: 'STAFF_SALES', roleMain: 'STAFF', visiblePaths: ['/leads', '/customers'], restrictedPaths: ['/roles', '/audit-logs'] },
  { role: 'STAFF_CS', roleMain: 'STAFF', visiblePaths: ['/customers', '/calendar'], restrictedPaths: ['/roles', '/audit-logs'] },
  { role: 'DOCTOR_LEAD', roleMain: 'DOCTOR', visiblePaths: ['/appointments', '/medical-episodes'], restrictedPaths: ['/roles', '/audit-logs'] },
];
