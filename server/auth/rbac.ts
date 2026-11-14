import type { UserRole } from '../../src/types/auth';

export type Permission =
  | 'telemetry:read'
  | 'alerts:read'
  | 'alerts:acknowledge'
  | 'operations:control'
  | 'config:read'
  | 'config:write'
  | 'users:manage'
  | 'audit:read'
  | 'hardware:admin';

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>([
    'telemetry:read',
    'alerts:read',
    'alerts:acknowledge',
    'operations:control',
    'config:read',
    'config:write',
    'users:manage',
    'audit:read',
    'hardware:admin',
  ]),
  CAPTAIN: new Set<Permission>([
    'telemetry:read',
    'alerts:read',
    'alerts:acknowledge',
    'operations:control',
    'config:read',
  ]),
  AUTHORITY: new Set<Permission>([
    'telemetry:read',
    'alerts:read',
    'config:read',
  ]),
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function getRolePermissions(role: UserRole): Permission[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? []);
}

/**
 * Policy check for role changes by Admin:
 * - Primary ADMIN role cannot be assigned or revoked via standard management API.
 * - CAPTAIN and AUTHORITY may be switched between each other by Admin.
 */
export function isRoleChangeAllowed(currentRole: UserRole, nextRole: UserRole): boolean {
  if (currentRole === 'ADMIN' || nextRole === 'ADMIN') {
    return currentRole === nextRole;
  }
  return (nextRole === 'CAPTAIN' || nextRole === 'AUTHORITY');
}
