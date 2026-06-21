export type UserRole = 'admin' | 'user' | 'moderator';

export interface User {
  catalyst_user_id: string; // Unique Partition Key in Zoho Catalyst NoSQL
  employee_id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string; // Optional
  language_preference: string;
  created_at: string; // ISO DateTime string (e.g. '2026-06-20T22:00:37.000Z')
  updated_at: string; // ISO DateTime string (e.g. '2026-06-20T22:00:37.000Z')
  is_active: boolean;
}
