import { ReactNode, useEffect, useState } from 'react';
import { UserManagement, zcAuth } from '@zcatalyst/auth/web';

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

type Status = 'checking' | 'signed-out' | 'signed-in';

export function AuthGate({ children }: AuthGateProps) {
  const [status, setStatus] = useState<Status>('checking');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const authResult = await zcAuth.isUserAuthenticated();
        if (cancelled) {
          return;
        }
        if (!authResult) {
          setStatus('signed-out');
          return;
        }

        const currentUser = await new UserManagement().getCurrentUser();
        if (cancelled) {
          return;
        }
        setUser(currentUser as unknown as CurrentUser);
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
    zcAuth.signIn(LOGIN_CONTAINER_ID, { redirectUrl: window.location.href }).catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load sign-in');
    });
  }, [status]);

  const signOut = () => {
    zcAuth.signOut(window.location.origin);
  };

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
