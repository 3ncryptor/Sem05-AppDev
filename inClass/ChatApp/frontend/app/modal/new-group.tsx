import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useChat } from '../../src/context/ChatContext';
import { Avatar } from '../../src/components/Avatar';

export default function NewGroupModalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { users, createGroup } = useChat();

  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const candidateUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users
      .filter((u) => u.id !== currentUser?.id)
      .filter((u) => !q || u.name.toLowerCase().includes(q) || u.id.includes(q));
  }, [currentUser?.id, searchQuery, users]);

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleCreateGroup = async () => {
    setErrorMsg(null);
    if (!groupName.trim()) {
      setErrorMsg('Please enter a group name.');
      return;
    }
    if (selectedIds.length === 0) {
      setErrorMsg('Select at least one person to add.');
      return;
    }

    setIsCreating(true);
    try {
      const created = await createGroup(groupName.trim(), selectedIds);
      router.replace(`/chat/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formSection}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g. Study Group"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>
          Participants ({selectedIds.length} selected)
        </Text>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Filter people"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>

      <FlatList
        data={candidateUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              style={[styles.userRow, isSelected && styles.userRowSelected]}
              onPress={() => toggleUser(item.id)}
              activeOpacity={0.7}
            >
              <Avatar name={item.name} size={42} />
              <View style={styles.userCol}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userBio} numberOfLines={1}>
                  {item.bio || 'Available'}
                </Text>
              </View>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={isSelected ? COLORS.accent : COLORS.borderLight}
              />
            </TouchableOpacity>
          );
        }}
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 12, SPACING.lg) },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.createBtn,
            (!groupName.trim() || selectedIds.length === 0) &&
              styles.createBtnDisabled,
          ]}
          onPress={handleCreateGroup}
          disabled={isCreating}
          activeOpacity={0.85}
        >
          {isCreating ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <Text style={styles.createBtnText}>
              Create Group ({selectedIds.length + 1} members)
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  formSection: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.bgPrimary,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14.5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgPrimary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12.5,
    marginTop: SPACING.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgPrimary,
  },
  userRowSelected: {
    backgroundColor: COLORS.bgTertiary,
  },
  userCol: {
    flex: 1,
    marginLeft: 14,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 14.5,
    fontWeight: '600',
  },
  userBio: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    marginTop: 2,
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  createBtn: {
    backgroundColor: COLORS.accent,
    height: 48,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    color: COLORS.textInverse,
    fontSize: 14.5,
    fontWeight: '600',
  },
});
