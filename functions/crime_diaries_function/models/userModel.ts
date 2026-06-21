export type UserRole = 'admin' | 'user' | 'moderator';

export interface UserJSON {
  catalyst_user_id: { S: string };
  employee_id: { S: string };
  email: { S: string };
  name: { S: string };
  role: { S: string };
  department?: { S: string };
  language_preference: { S: string };
  created_at: { S: string };
  updated_at: { S: string };
  is_active: { BOOL: boolean };
}

export class UserModel {
  public catalyst_user_id: string;
  public employee_id: string;
  public email: string;
  public name: string;
  public role: UserRole;
  public department: string | null;
  public language_preference: string;
  public created_at: string;
  public updated_at: string;
  public is_active: boolean;

  constructor(data: {
    catalyst_user_id: string;
    employee_id: string;
    email: string;
    name: string;
    role?: UserRole;
    department?: string | null;
    language_preference?: string;
    created_at?: string | Date;
    updated_at?: string | Date;
    is_active?: boolean;
  }) {
    this.catalyst_user_id = data.catalyst_user_id;
    this.employee_id = data.employee_id;
    this.email = data.email;
    this.name = data.name;
    this.role = data.role || 'user';
    this.department = data.department || null;
    this.language_preference = data.language_preference || 'en';
    this.created_at = data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString();
    this.updated_at = data.updated_at ? new Date(data.updated_at).toISOString() : new Date().toISOString();
    this.is_active = typeof data.is_active === 'boolean' ? data.is_active : true;
  }

  /**
   * Performs basic validation on the user object
   */
  validate(): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];
    if (!this.catalyst_user_id || typeof this.catalyst_user_id !== 'string' || this.catalyst_user_id.trim() === '') {
      errors.push('catalyst_user_id is required and must be a non-empty string');
    }
    if (!this.employee_id || typeof this.employee_id !== 'string' || this.employee_id.trim() === '') {
      errors.push('employee_id is required and must be a non-empty string');
    }
    if (!this.email || typeof this.email !== 'string' || !this.email.includes('@')) {
      errors.push('email is required and must be a valid email address');
    }
    if (!this.name || typeof this.name !== 'string' || this.name.trim() === '') {
      errors.push('name is required and must be a non-empty string');
    }
    if (!['admin', 'user', 'moderator'].includes(this.role)) {
      errors.push(`invalid role: must be admin, user, or moderator. Received: ${this.role}`);
    }
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Convert the user model to Zoho Catalyst NoSQL Custom JSON format.
   * e.g., String -> S, Boolean -> BOOL
   */
  toCatalystJSON(): UserJSON {
    const customJSON: UserJSON = {
      catalyst_user_id: { S: this.catalyst_user_id },
      employee_id: { S: this.employee_id },
      email: { S: this.email },
      name: { S: this.name },
      role: { S: this.role },
      language_preference: { S: this.language_preference },
      created_at: { S: this.created_at },
      updated_at: { S: this.updated_at },
      is_active: { BOOL: this.is_active }
    };

    if (this.department) {
      customJSON.department = { S: this.department };
    }

    return customJSON;
  }

  /**
   * Parse a Custom JSON document fetched from Zoho Catalyst NoSQL into a standard User instance.
   */
  static fromCatalystJSON(catalystDoc: any): UserModel {
    return new UserModel({
      catalyst_user_id: catalystDoc.catalyst_user_id?.S || '',
      employee_id: catalystDoc.employee_id?.S || '',
      email: catalystDoc.email?.S || '',
      name: catalystDoc.name?.S || '',
      role: (catalystDoc.role?.S as UserRole) || 'user',
      department: catalystDoc.department?.S || null,
      language_preference: catalystDoc.language_preference?.S || 'en',
      created_at: catalystDoc.created_at?.S || new Date().toISOString(),
      updated_at: catalystDoc.updated_at?.S || new Date().toISOString(),
      is_active: catalystDoc.is_active?.BOOL ?? true
    });
  }
}
