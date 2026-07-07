// tsconfig.json uses classic "node" module resolution, which doesn't read
// package.json "exports" subpaths, so TS can't see @zcatalyst/auth's "./web"
// entry point on its own (webpack resolves it fine at build time). This
// mirrors the real declarations in node_modules/@zcatalyst/auth/dist-types/web.d.ts.
declare module '@zcatalyst/auth/web' {
  export interface ICatalystSignInConfig {
    signInProvidersOnly?: boolean;
    cssUrl?: string;
    is_customize_forgot_password?: boolean;
    forgotPasswordId?: string;
    forgotPasswordCssUrl?: string;
    serviceUrl?: string;
    redirectUrl?: string;
  }

  export interface ICatalystUser {
    zuid: string;
    org_id: string;
    status: string;
    user_id: string;
    is_confirmed: boolean;
    email_id: string;
    first_name: string;
    last_name: string;
    created_time: string;
    modified_time: string;
    invited_time: string;
    role_details: {
      role_id: string;
      role_name: string;
    };
  }

  export class UserManagement {
    constructor(app?: unknown);
    getCurrentUser(): Promise<ICatalystUser>;
    resetPassword(email: string, resetConfig: { platform_type: string }): Promise<string>;
  }

  export const zcAuth: {
    signIn(id: string, config?: ICatalystSignInConfig): Promise<void>;
    hostedSignIn(redirectUrl?: string): Promise<void>;
    signOut(redirectURL?: string): Promise<void>;
    isUserAuthenticated(org_id?: string): Promise<unknown>;
    getProjectUserDetails(org_id?: string): Promise<Record<string, unknown>>;
    changePassword(oldPassword: string, newPassword: string): Promise<string>;
    signUp(body: {
      first_name?: string;
      last_name: string;
      email_id: string;
      platform_type?: string;
      redirect_url?: string;
    }): Promise<unknown>;
    signinWithJwt(callbackFn: () => void): void;
  };
}
