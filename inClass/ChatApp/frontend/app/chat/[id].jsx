/** Chat room. Placeholder until F7; shows the conversation's title. */
import { useLocalSearchParams } from 'expo-router';
import { StubScreen } from '../../src/components/ui/StubScreen';
import { useStore } from '../../src/hooks/useStore';
import { chatsStore } from '../../src/store/chatsStore';
import { directoryStore } from '../../src/store/directoryStore';
import { sessionStore } from '../../src/store/sessionStore';
import { conversationTitle } from '../../src/utils/conversationTitle';

export default function ChatRoom() {
  const { id } = useLocalSearchParams();
  const conversation = useStore(chatsStore, (s) => s.conversations.find((c) => c.id === id));
  const usersById = useStore(directoryStore, (s) => s.byId);
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const title = conversation ? conversationTitle(conversation, myId, usersById) : 'chat';
  return <StubScreen title={title} step="F7" canGoBack />;
}
