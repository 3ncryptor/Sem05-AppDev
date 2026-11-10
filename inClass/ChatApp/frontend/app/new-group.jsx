/**
 * New group (buildPlan.md 5.5): name the group, tap faces to select them,
 * then create from the control bar. "create" stays disabled until there is
 * a name and at least two people; on success it shows a check and the app
 * moves into the new group.
 */
import Pencil from 'lucide-react-native/icons/pencil';
import X from 'lucide-react-native/icons/x';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { friendlyMessage } from '../src/api/ApiError';
import { AvatarStack } from '../src/components/avatar/AvatarStack';
import { FaceGrid } from '../src/components/people/FaceGrid';
import { FloatingBar } from '../src/components/ui/FloatingBar';
import { PillInput } from '../src/components/ui/PillInput';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { RingButton } from '../src/components/ui/RingButton';
import { Slab } from '../src/components/ui/Slab';
import { LOGIN_SUCCESS_HOLD_MS } from '../src/constants/config';
import { space, type } from '../src/constants/theme';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { createGroup } from '../src/store/chatsStore';
import { islandGroupCreated } from '../src/island/islandEvents';
import { directoryStore, loadUsers } from '../src/store/directoryStore';
import { sessionStore } from '../src/store/sessionStore';
import { haptics } from '../src/utils/haptics';
import { log } from '../src/utils/logger';
import { filterPeople, groupFormProblem, MAX_GROUP_NAME, toggleId } from '../src/utils/people';

const BAR_SPACE = 72 + space.xxl * 2;

export default function NewGroup() {
  const { colors } = useTheme();
  const users = useStore(directoryStore, (s) => s.users);
  const usersById = useStore(directoryStore, (s) => s.byId);
  const myId = useStore(sessionStore, (s) => s.user?.id ?? '');
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!users.length) loadUsers();
  }, [users.length]);

  const people = filterPeople(users, '', myId).filter((user) => user.id !== myId);
  const problem = groupFormProblem(name, selectedIds);
  const selectedNames = selectedIds.map((id) => usersById[id]?.name ?? '');

  async function create() {
    if (problem || status !== 'idle') return;
    setStatus('loading');
    setError('');
    try {
      const id = await createGroup(name, selectedIds);
      setStatus('success');
      haptics.success();
      await new Promise((resolve) => setTimeout(resolve, LOGIN_SUCCESS_HOLD_MS));
      islandGroupCreated(name.trim());
      log.nav(`new-group -> chat/${id}`);
      router.replace(`/chat/${id}`);
    } catch (failure) {
      setStatus('idle');
      setError(friendlyMessage(failure));
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.surface }]}
      behavior="padding"
    >
      <Slab variant="notch">
        <View style={styles.row}>
          <RingButton
            icon={X}
            variant="slab"
            accessibilityLabel="Close"
            onPress={() => router.back()}
          />
          <Text style={[type.title, styles.title, { color: colors.textOnSlab }]}>new group</Text>
          <View style={styles.spacer} />
        </View>
      </Slab>
      <FaceGrid
        people={people}
        myId={myId}
        mode="select"
        selectedIds={selectedIds}
        onPress={(person) => setSelectedIds((ids) => toggleId(ids, person.id))}
        bottomPadding={BAR_SPACE}
        header={
          <View style={styles.header}>
            <PillInput
              value={name}
              onChangeText={setName}
              placeholder="group name"
              icon={Pencil}
              error={error}
              inputProps={{ maxLength: MAX_GROUP_NAME, autoCapitalize: 'sentences' }}
            />
            <Text style={[type.caption, styles.hint, { color: colors.textTertiary }]}>
              {problem || 'ready to create'}
            </Text>
          </View>
        }
      />
      <FloatingBar style={styles.bar}>
        <View style={styles.selection}>
          {selectedNames.length ? <AvatarStack names={selectedNames} size={36} on="slab" /> : null}
          <Text style={[type.meta, { color: colors.textOnSlab }]}>
            {selectedIds.length} selected
          </Text>
        </View>
        <View style={styles.create}>
          <PrimaryButton
            label="create"
            variant="accent"
            status={status}
            disabled={Boolean(problem)}
            onPress={create}
          />
        </View>
      </FloatingBar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  title: { flex: 1, textAlign: 'center' },
  spacer: { width: 48 },
  header: { gap: space.xxs, marginBottom: space.md },
  hint: { paddingHorizontal: space.lg },
  bar: { width: '92%', paddingLeft: space.md, justifyContent: 'space-between' },
  selection: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  create: { width: 140 },
});
