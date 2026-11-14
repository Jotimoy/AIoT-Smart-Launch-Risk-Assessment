export type UserRole = 'ADMIN' | 'CAPTAIN' | 'AUTHORITY';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserRecord extends AuthUser {}

export interface AuditLogRecord {
  id: number;
  actorUserId: number | null;
  actorEmail: string | null;
  actorRole: UserRole | null;
  targetUserId: number | null;
  targetEmail: string | null;
  eventType: string;
  details: string;
  ipAddress: string | null;
  createdAt: string;
}
