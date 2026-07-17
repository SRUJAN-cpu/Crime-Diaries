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
// NUMBER>, content: <the inner data object>, message: <text>} — confirmed by
// logging the actual resolved object. Neither the "success"/"failure" string
// nor the "data" key survive that unwrapping.
export interface CatalystProjectUserResponse {
  status: number;
  content: {
    user_id: string;
    email_id: string;
    first_name: string;
    last_name: string;
    [key: string]: unknown;
  };
  message?: string;
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
