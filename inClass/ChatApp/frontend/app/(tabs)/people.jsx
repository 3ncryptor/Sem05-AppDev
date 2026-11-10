/**
 * People tab (buildPlan.md 5.4): everyone on the server as face tiles,
 * with search and pull to refresh. Tapping someone opens your DM with them, creating it the
 * first time. The button in the header starts a new group.
 */
import Search from 'lucide-react-native/icons/search';
import UserRoundX from 'lucide-react-native/icons/user-round-x';
import UsersRound from 'lucide-react-native/icons/users-round';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { TAB_BAR_CLEARANCE } from '../../src/components/navigation/FloatingTabBar';
import { FaceGrid } from '../../src/components/people/FaceGrid';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { PillInput } from '../../src/components/ui/PillInput';
import { RingButton } from '../../src/components/ui/RingButton';
import { Slab } from '../../src/components/ui/Slab';
import { friendlyMessage } from '../../src/api/ApiError';
import { gradient, space, type } from '../../src/constants/theme';
import { useStore } from '../../src/hooks/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { openDirectChat } from '../../src/store/chatsStore';
import { directoryStore, loadUsers } from '../../src/store/directoryStore';
import { sessionStore } from '../../src/store/sessionStore';
import { log } from '../../src/utils/logger';
import { filterPeople } from '../../src/utils/people';

export default function People() {
  const { colors } = useTheme();
  const directory = useStore(directoryStore);
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function refresh() {
    setIsRefreshing(true);
    await loadUsers();
    setIsRefreshing(false);
  }

  async function message(person) {
    if (busyId) return;
    setBusyId(person.id);
    try {
      const id = await openDirectChat(myId, person.id);
      log.nav(`people -> chat/${id} (${person.name})`);
      router.push(`/chat/${id}`);
    } catch (error) {
      Alert.alert('Could not open the chat', friendlyMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  const people = filterPeople(directory.users, query, myId);

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Slab variant="notch">
        <View style={styles.row}>
          <Text style={[type.title, { color: colors.textOnSlab }]}>people</Text>
          <RingButton
            icon={UsersRound}
            variant="slab"
            accessibilityLabel="New group"
            onPress={() => router.push('/new-group')}
          />
        </View>
        <View style={styles.search}>
          <PillInput
            value={query}
            onChangeText={setQuery}
            placeholder="search people"
            icon={Search}
            inputProps={{ returnKeyType: 'search' }}
          />
        </View>
      </Slab>
      <FaceGrid
        people={people}
        myId={myId}
        mode="message"
        busyId={busyId}
        onPress={message}
        bottomPadding={TAB_BAR_CLEARANCE}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={gradient.colors[1]}
            colors={gradient.colors}
          />
        }
        empty={
          directory.status === 'error' ? (
            <EmptyState
              icon={UserRoundX}
              title="can't load people"
              message={directory.error}
              actionLabel="Try again"
              onAction={refresh}
            />
          ) : directory.status === 'ready' ? (
            <EmptyState icon={Search} title="nobody by that name" />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  search: { marginTop: space.md },
});
