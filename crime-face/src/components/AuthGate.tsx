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
const SIGN_IN_ATTEMPTED_KEY = 'catalyst-sign-in-attempted';

type Status = 'checking' | 'signed-out' | 'signed-in' | 'sdk-unavailable' | 'loop-detected';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<Status>('checking');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Strip any leftover query params a previous sign-in bounce may have
    // left on the URL, so redirectUrl below always starts clean.
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

      // Only worth retrying if we just came back from a signIn() redirect —
      // the app-domain session cookie can take a moment to become usable
      // right after that. A first-ever check has nothing to wait for, so
      // fail fast instead of stalling every fresh visitor for ~10s.
      const justAttemptedSignIn = sessionStorage.getItem(SIGN_IN_ATTEMPTED_KEY);
      const delays = justAttemptedSignIn ? [0, 1000, 2000] : [0];

      for (let i = 0; i < delays.length; i++) {
        if (delays[i] > 0) {
          await sleep(delays[i]);
        }
        if (cancelled) {
          return;
        }

        try {
          const response = await auth.getProjectUserDetails();
          if (cancelled) {
            return;
          }
          if (response.status === 'success') {
            sessionStorage.removeItem(SIGN_IN_ATTEMPTED_KEY);
            setUser(response.data as unknown as CurrentUser);
            setStatus('signed-in');
            return;
          }
        } catch (err) {
          if (i === delays.length - 1 && !cancelled) {
            setError(err instanceof Error ? err.message : 'Failed to check sign-in status');
          }
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

  useEffect(() => {
    if (status !== 'signed-out') {
      return;
    }

    // Circuit breaker: if we've already redirected into signIn() once this
    // session and landed right back on "signed-out" again, stop — looping
    // forever is worse than showing an error.
    if (sessionStorage.getItem(SIGN_IN_ATTEMPTED_KEY)) {
      setStatus('loop-detected');
      return;
    }
    sessionStorage.setItem(SIGN_IN_ATTEMPTED_KEY, '1');

    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    try {
      // signIn() doesn't reliably return a Promise in this SDK build (it can
      // return undefined), so don't chain .catch() on it directly — that
      // crashed with "Cannot read properties of undefined (reading 'catch')"
      // and took the React tree down with it.
      const result = window.catalyst?.auth.signIn(LOGIN_CONTAINER_ID, { redirectUrl: cleanUrl });
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch((err: unknown) => {
          setError(err instanceof Error ? err.message : 'Failed to load sign-in');
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sign-in');
    }
  }, [status]);

  const signOut = () => {
    sessionStorage.removeItem(SIGN_IN_ATTEMPTED_KEY);
    window.catalyst?.auth.signOut(window.location.origin);
  };

  const retry = () => {
    sessionStorage.removeItem(SIGN_IN_ATTEMPTED_KEY);
    setError(null);
    setStatus('checking');
    window.location.reload();
  };

  if (status === 'sdk-unavailable') {
    return (
      <div className="auth-status">
        Catalyst SDK not found — this app needs to be served through Catalyst (catalyst serve, or
        deployed) for sign-in to work.
      </div>
    );
  }

  if (status === 'loop-detected') {
    return (
      <div className="auth-screen">
        <p className="chat-error">
          Sign-in got stuck in a redirect loop. This has been stopped automatically — click below
          to try again.
        </p>
        <button className="new-chat-button" onClick={retry}>
          Try again
        </button>
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
