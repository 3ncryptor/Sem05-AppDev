/**
 * useSession: the signed-in session for screens, plus the actions that
 * change it. Thin wrapper over useStore so screens import one thing.
 */
import { completeSignIn, sessionStore, signOut } from '../store/sessionStore';
import { useStore } from './useStore';

export function useSession() {
  const session = useStore(sessionStore);
  return { ...session, completeSignIn, signOut };
}
