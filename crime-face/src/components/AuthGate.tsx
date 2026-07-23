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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-on-surface font-body">
      <div className="max-w-md w-full bg-surface border border-outline-variant p-8 rounded-lg text-center shadow-lg space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-2">
          <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: '"FILL" 1' }}>
            security
          </span>
          <h1 className="font-headline text-3xl font-bold text-primary">Crime Diaries</h1>
          <p className="text-xs text-on-surface-variant font-label uppercase tracking-widest">
            Intelligence Command Center
          </p>
        </div>

        <p className="text-sm text-on-surface-variant leading-relaxed">
          Access to this terminal is restricted. Please authenticate with your official credentials to proceed.
        </p>

        {error && (
          <div className="p-3 text-xs bg-error-container text-on-error-container border border-error/20 rounded-lg font-medium text-left flex items-start gap-2">
            <span className="material-symbols-outlined text-error text-sm mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={startSignIn}
          className="w-full py-3 px-6 bg-primary text-on-primary rounded-lg font-label font-bold shadow-md hover:opacity-95 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">login</span>
          Authenticate
        </button>

        <div id={LOGIN_CONTAINER_ID} className="auth-login-container w-full mt-4" />
      </div>
    </div>
  );
}
