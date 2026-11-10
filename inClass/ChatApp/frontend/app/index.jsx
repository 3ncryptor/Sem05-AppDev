/**
 * Start route: sends the user to chats when signed in, otherwise to login.
 * The root layout keeps the splash screen up until the saved session has
 * been read, so this never flashes the wrong screen.
 */
import { Redirect } from 'expo-router';
import { sessionStore } from '../src/store/sessionStore';
import { useStore } from '../src/hooks/useStore';

export default function Index() {
  const status = useStore(sessionStore, (state) => state.status);
  return <Redirect href={status === 'signedIn' ? '/chats' : '/login'} />;
}
