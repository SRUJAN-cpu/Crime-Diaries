// Populated by the two <script> tags in public/index.html:
// catalystWebSDK.js (the global SDK) + /__catalyst/sdk/init.js (project
// credentials, served by Catalyst hosting). Only available when the app is
// actually served through Catalyst (catalyst serve, or deployed) — plain
// `npm start` won't have this.
export interface CatalystSignInConfig {
  redirectUrl?: string;
  serviceUrl?: string;
  cssUrl?: string;
  signInProvidersOnly?: boolean;
  forgotPasswordId?: string;
  forgotPasswordCssUrl?: string;
}

// The SDK's wrapResponse() unwraps the raw server body ({status: "success"|
// "failure", data: {...}}) and re-wraps it as {status: <HTTP status code
// NUMBER>, data: <the inner data object>} — the "success"/"failure" string
// only exists in the raw response body, not in what this method resolves to.
export interface CatalystProjectUserResponse {
  status: number;
  data: {
    user_id: string;
    email_id: string;
    first_name: string;
    last_name: string;
    [key: string]: unknown;
  };
}

export interface CatalystAuth {
  signIn(id: string, config?: CatalystSignInConfig): Promise<void>;
  isUserAuthenticated(org_id?: string): Promise<unknown>;
  getProjectUserDetails(org_id?: string): Promise<CatalystProjectUserResponse>;
  signOut(redirectUrl?: string): Promise<void>;
}

declare global {
  interface Window {
    catalyst?: {
      auth: CatalystAuth;
    };
  }
}
