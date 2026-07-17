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

// 'checking' until the first auth check resolves. After that, whether we're
// signed in is entirely determined by `user` — there's no separate
// "signed-in but no user yet" state to accidentally get stuck in.
type Status = 'checking' | 'signed-out' | 'sdk-unavailable';

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<Status>('checking');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Strip any leftover query params a previous sign-in bounce may have
    // left on the URL.
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
        // Never hang on "Checking..." forever if the SDK call itself never
        // settles — bail to the sign-in screen after a timeout instead.
        const response = await Promise.race([
          auth.getProjectUserDetails(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timed out checking sign-in status')), 6000)
          )
        ]);
        if (cancelled) {
          return;
        }
        if (response.status === 200) {
          setUser(response.data as unknown as CurrentUser);
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

  // No effect auto-triggers signIn() here on purpose. signIn() will redirect
  // the whole page if it thinks you're already signed in — doing that
  // automatically from an effect is what caused the earlier redirect loop.
  // Making it a manual click means the worst case is one redirect, not an
  // automatic cycle.
  const startSignIn = () => {
    setError(null);
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    try {
      // signIn() doesn't reliably return a Promise in this SDK build (it can
      // return undefined), so don't chain .catch() on it directly — that
      // crashed with "Cannot read properties of undefined (reading 'catch')".
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

  if (status === 'sdk-unavailable') {
    return (
      <div className="auth-status">
        Catalyst SDK not found — this app needs to be served through Catalyst (catalyst serve, or
        deployed) for sign-in to work.
      </div>
    );
  }

  if (status === 'checking') {
    return <div className="auth-status">Checking sign-in status...</div>;
  }

  return (
    <div className="auth-screen">
      {error && <p className="chat-error">{error}</p>}
      <button className="new-chat-button" onClick={startSignIn}>
        Sign in
      </button>
      <div id={LOGIN_CONTAINER_ID} className="auth-login-container" />
    </div>
  );
}
