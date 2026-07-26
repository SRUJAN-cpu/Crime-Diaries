import { ReactNode, useEffect, useState } from 'react';

export interface CurrentUser {
  user_id: string;
  email_id: string;
  first_name: string;
  last_name: string;
}

interface AuthGateProps {
  children: (user: CurrentUser, signOut: () => void) => ReactNode;
}

const LOGIN_CONTAINER_ID = 'catalyst-login-container';

type Status = 'checking' | 'signed-out' | 'sdk-unavailable';

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<Status>('checking');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    (async () => {
      const auth = window.catalyst?.auth;
      if (!auth) {
        if (!cancelled) {
          setStatus('sdk-unavailable');
        }
        return;
      }

      try {
        const response = await Promise.race([
          auth.getProjectUserDetails(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timed out checking sign-in status')), 6000)
          )
        ]);
        if (cancelled) {
          return;
        }
        if (response && response.status === 200 && response.content) {
          setUser(response.content as unknown as CurrentUser);
          return;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to check sign-in status');
        }
      }

      if (!cancelled) {
        setStatus('signed-out');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const startSignIn = () => {
    setError(null);
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    try {
      const result = window.catalyst?.auth.signIn(LOGIN_CONTAINER_ID, { redirectUrl: cleanUrl });
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load sign-in');
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sign-in');
    }
  };

  const signOut = () => {
    window.catalyst?.auth.signOut(window.location.origin);
  };

  if (user) {
    return <>{children(user, signOut)}</>;
  }

  // Visual status and screens wrapped in Sahara design theme
  if (status === 'sdk-unavailable') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-on-surface font-body">
        <div className="max-w-md w-full bg-surface border border-outline-variant p-8 rounded-lg text-center shadow-lg space-y-4">
          <span className="material-symbols-outlined text-error text-5xl">warning</span>
          <h1 className="font-headline text-2xl font-bold text-error">SDK Unavailable</h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Catalyst SDK not found. This application must be served through Zoho Catalyst CLI or deployed environment to support secure authentication.
          </p>
          <div className="text-xs text-outline font-label bg-surface-container p-3 rounded-lg border border-outline-variant/30 select-all">
            catalyst serve
          </div>
        </div>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-on-surface font-body">
        <div className="flex flex-col items-center space-y-4">
          <span className="animate-spin material-symbols-outlined text-primary text-4xl">sync</span>
          <p className="text-sm text-on-surface-variant font-medium">Checking sign-in status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-background via-background to-secondary/5 flex flex-col items-center justify-center p-4 text-on-surface font-body">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl h-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 relative z-10 overflow-y-auto lg:overflow-y-hidden lg:max-h-full">
        
        {/* Left Side: Branding & Welcome Message */}
        <div className="hidden lg:flex lg:w-1/2 flex-col items-start space-y-6 justify-center">
          <div className="space-y-4">
            <span className="material-symbols-outlined text-primary text-7xl" style={{ fontVariationSettings: '"FILL" 1' }}>
              security
            </span>
            <div>
              <h1 className="font-headline text-5xl font-bold text-primary leading-tight">Crime Diaries</h1>
              <p className="text-lg text-on-surface-variant font-label uppercase tracking-widest mt-2">
                Intelligence Command Center
              </p>
            </div>
          </div>

          <div className="space-y-3 text-on-surface-variant">
            <p className="text-base leading-relaxed">
              Advanced AI-powered crime analysis and investigation support system. Access real-time intelligence, predictive analytics, and case management tools.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-5 text-sm">check_circle</span>
                Secure Role-Based Access Control
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                Real-Time Crime Analytics
              </li>
              <li className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                AI-Powered Insights & Forecasting
              </li>
            </ul>
          </div>
        </div>

        {/* Right Side: Auth Form Container */}
        <div className="w-full lg:w-1/2 max-w-lg">
          <div className="bg-surface border border-outline-variant p-6 lg:p-8 rounded-2xl shadow-2xl space-y-5 backdrop-blur-sm bg-surface/95">
            
            {/* Mobile Branding (visible on small screens) */}
            <div className="lg:hidden flex flex-col items-center space-y-2 text-center pb-3 border-b border-outline-variant/30">
              <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: '"FILL" 1' }}>
                security
              </span>
              <div>
                <h1 className="font-headline text-2xl font-bold text-primary">Crime Diaries</h1>
                <p className="text-xs text-on-surface-variant font-label uppercase tracking-widest mt-1">
                  Intelligence Command Center
                </p>
              </div>
            </div>

            {/* Form Title */}
            <div className="space-y-2 text-center">
              <h2 className="font-headline text-2xl font-bold text-on-surface">Authenticate</h2>
              <p className="text-sm text-on-surface-variant">
                Access to this terminal is restricted. Please authenticate with your official credentials to proceed.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 text-sm bg-error-container text-on-error-container border border-error/30 rounded-lg font-medium text-left flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="material-symbols-outlined text-error flex-shrink-0 mt-0.5">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Button */}
            <button
              onClick={startSignIn}
              className="w-full py-3 px-6 bg-gradient-to-r from-primary to-primary/90 text-on-primary rounded-lg font-label font-bold shadow-lg hover:shadow-xl hover:to-primary/80 active:scale-95 transition-all text-base flex items-center justify-center gap-2 duration-200"
            >
              <span className="material-symbols-outlined text-xl">login</span>
              Authenticate with Zoho
            </button>

            {/* Auth Form Container - Now with plenty of space */}
            <div id={LOGIN_CONTAINER_ID} className="auth-login-container w-full rounded-lg bg-surface-container/30" />

            {/* Footer Info */}
            <div className="text-center space-y-1 pt-3 border-t border-outline-variant/30">
              <p className="text-xs text-on-surface-variant">
                Protected by Zoho Catalyst Security
              </p>
              <p className="text-xs text-on-surface-variant/60">
                For support, contact your administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
