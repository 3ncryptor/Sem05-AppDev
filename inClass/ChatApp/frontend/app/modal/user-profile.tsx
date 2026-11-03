import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useChat } from '../../src/context/ChatContext';
import { Avatar } from '../../src/components/Avatar';
import { UserResponseDto } from '../../src/types/api';

export default function UserProfileModalScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const targetId = Array.isArray(userId) ? userId[0] : userId;
  const router = useRouter();

  const { currentUser } = useAuth();
  const { usersById, fetchUserProfileById, startOrGetDm } = useChat();

  const [profile, setProfile] = useState<UserResponseDto | null>(
    targetId ? usersById[targetId] ?? null : null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStartingDm, setIsStartingDm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetId) return;
    setIsLoading(true);
    fetchUserProfileById(targetId)
      .then((res) => {
        setProfile(res);
        setError(null);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load profile');
      })
      .finally(() => setIsLoading(false));
  }, [fetchUserProfileById, targetId]);

  const handleOpenDm = async () => {
    if (!profile) return;
    setIsStartingDm(true);
    try {
      const conv = await startOrGetDm(profile.id);
      router.replace(`/chat/${conv.id}`);
    } catch (err: any) {
      setError(err?.message || 'Could not start conversation');
    } finally {
      setIsStartingDm(false);
    }
  };

  return (
    <View style={styles.container}>
      {isLoading && !profile ? (
        <ActivityIndicator size="large" color={COLORS.accent} />
      ) : profile ? (
        <View style={styles.card}>
          <Avatar name={profile.name} size={80} />
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.bio}>{profile.bio || 'Available'}</Text>

          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>User ID</Text>
            <Text style={styles.metaValue}>{profile.id}</Text>
          </View>

          {profile.id !== currentUser?.id && (
            <TouchableOpacity
              style={styles.dmBtn}
              onPress={handleOpenDm}
              disabled={isStartingDm}
              activeOpacity={0.85}
            >
              {isStartingDm ? (
                <ActivityIndicator color={COLORS.textInverse} />
              ) : (
                <>
                  <Ionicons
                    name="chatbubble-outline"
                    size={17}
                    color={COLORS.textInverse}
                  />
                  <Text style={styles.dmBtnText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={styles.errorText}>{error || 'User not found'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  bio: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  metaBox: {
    width: '100%',
    backgroundColor: COLORS.bgPrimary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  metaLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    marginTop: 4,
  },
  dmBtn: {
    marginTop: SPACING.lg,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    height: 48,
    borderRadius: RADIUS.full,
  },
  dmBtnText: {
    color: COLORS.textInverse,
    fontSize: 14.5,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});
