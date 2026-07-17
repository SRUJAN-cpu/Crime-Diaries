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

type Status = 'checking' | 'signed-out' | 'signed-in' | 'sdk-unavailable';

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<Status>('checking');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Strip any PROJECT_ID/service_url query params a previous sign-in
    // bounce may have left on the URL, so redirectUrl below always starts
    // clean instead of compounding across redirects.
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
        const isAuthenticated = await auth.isUserAuthenticated();
        if (cancelled) {
          return;
        }
        if (!isAuthenticated) {
          setStatus('signed-out');
          return;
        }

        const response = await auth.getProjectUserDetails();
        if (cancelled) {
          return;
        }
        if (response.status !== 'success') {
          setStatus('signed-out');
          return;
        }
        setUser(response.data as unknown as CurrentUser);
        setStatus('signed-in');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to check sign-in status');
          setStatus('signed-out');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'signed-out') {
      return;
    }
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.catalyst?.auth
      .signIn(LOGIN_CONTAINER_ID, { redirectUrl: cleanUrl })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load sign-in');
      });
  }, [status]);

  const signOut = () => {
    window.catalyst?.auth.signOut(window.location.origin);
  };

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

  if (status === 'signed-out') {
    return (
      <div className="auth-screen">
        {error && <p className="chat-error">{error}</p>}
        <div id={LOGIN_CONTAINER_ID} className="auth-login-container" />
      </div>
    );
  }

  if (!user) {
    return <div className="auth-status">Loading your profile...</div>;
  }

  return <>{children(user, signOut)}</>;
}
