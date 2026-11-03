import React, { useState } from 'react';
import {
  ActivityIndicator,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import {
  CLOUDFLARE_TUNNEL_URL,
  DEFAULT_LAB_SERVER_URL,
  MAC_LAN_SERVER_URL,
  useAuth,
} from '../../src/context/AuthContext';
import { useChat } from '../../src/context/ChatContext';
import { Avatar } from '../../src/components/Avatar';
import { ServerStatusBanner } from '../../src/components/ServerStatusBanner';
import { UserResponseDto } from '../../src/types/api';

export default function ProfileAndDiagnosticsScreen() {
  const router = useRouter();
  const {
    currentUser,
    baseUrl,
    mode,
    setServerConfig,
    logout,
  } = useAuth();
  const {
    users,
    conversations,
    pinnedConvIds,
    starredMessageIds,
    fetchUserProfileById,
    factBotAutoEnabled,
    setFactBotAutoEnabled,
    triggerFactBotNow,
    resetMockData,
  } = useChat();

  const [showDeveloperTools, setShowDeveloperTools] = useState(false);
  const [lookupUserId, setLookupUserId] = useState('');
  const [lookupResult, setLookupResult] = useState<UserResponseDto | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [botToast, setBotToast] = useState<string | null>(null);

  const handleTestLookup = async (idToQuery?: string) => {
    setIsLookingUp(true);
    setLookupError(null);
    try {
      const target = (idToQuery ?? lookupUserId).trim() || undefined;
      const res = await fetchUserProfileById(target);
      setLookupResult(res);
    } catch (err: any) {
      setLookupResult(null);
      setLookupError(err?.message || 'Profile lookup failed');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleTriggerBot = async () => {
    const msg = await triggerFactBotNow();
    if (msg) {
      setBotToast('New FactBot message dispatched');
      setTimeout(() => setBotToast(null), 3500);
    }
  };

  const toggleDevTools = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDeveloperTools((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ServerStatusBanner />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Minimalist Profile Hero Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Avatar name={currentUser?.name} size={64} />
            <View style={styles.profileDetails}>
              <Text style={styles.profileName} numberOfLines={1}>
                {currentUser?.name}
              </Text>
              <Text style={styles.profileBio}>
                {currentUser?.bio || 'Active account'}
              </Text>
              <Text style={styles.profileId}>ID: {currentUser?.id}</Text>
            </View>
          </View>

          <View style={styles.statsStrip}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{conversations.length}</Text>
              <Text style={styles.statLabel}>Chats</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{pinnedConvIds.length}</Text>
              <Text style={styles.statLabel}>Pinned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{starredMessageIds.length}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{users.length}</Text>
              <Text style={styles.statLabel}>People</Text>
            </View>
          </View>
        </View>

        {/* Server Environment Selection */}
        <Text style={styles.groupLabel}>Connection</Text>
        <View style={styles.card}>
          {[
            {
              label: 'Cloudflare HTTPS Tunnel',
              sub: 'Connected to Mac Docker container',
              active: mode === 'live' && baseUrl === CLOUDFLARE_TUNNEL_URL,
              onPress: () => setServerConfig(CLOUDFLARE_TUNNEL_URL, 'live'),
              icon: 'cloud-outline' as const,
            },
            {
              label: 'Campus Lab Server',
              sub: 'http://10.7.1.51:3000',
              active: mode === 'live' && baseUrl === DEFAULT_LAB_SERVER_URL,
              onPress: () => setServerConfig(DEFAULT_LAB_SERVER_URL, 'live'),
              icon: 'wifi-outline' as const,
            },
            {
              label: 'Mac Local Network',
              sub: 'http://10.7.18.178:3000',
              active: mode === 'live' && baseUrl === MAC_LAN_SERVER_URL,
              onPress: () => setServerConfig(MAC_LAN_SERVER_URL, 'live'),
              icon: 'laptop-outline' as const,
            },
            {
              label: 'Offline Simulator',
              sub: 'Local database with FactBot',
              active: mode === 'mock',
              onPress: () => setServerConfig(baseUrl, 'mock'),
              icon: 'layers-outline' as const,
            },
          ].map((item, idx, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.optionRow,
                idx < arr.length - 1 && styles.optionRowBorder,
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.optionIconBox}>
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={item.active ? COLORS.textPrimary : COLORS.textSecondary}
                />
              </View>
              <View style={styles.optionTextCol}>
                <Text style={styles.optionTitle}>{item.label}</Text>
                <Text style={styles.optionSub}>{item.sub}</Text>
              </View>
              {item.active && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.accent}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Collapsible API & Bot Diagnostics */}
        <Text style={styles.groupLabel}>Diagnostics</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={toggleDevTools}
            activeOpacity={0.7}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconBox}>
                <Ionicons
                  name="code-slash-outline"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </View>
              <View>
                <Text style={styles.optionTitle}>API Inspector & FactBot</Text>
                <Text style={styles.optionSub}>
                  Test GET /user/profile and bot messages
                </Text>
              </View>
            </View>
            <Ionicons
              name={showDeveloperTools ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>

          {showDeveloperTools && (
            <View style={styles.devContent}>
              <Text style={styles.devLabel}>Lookup User by ObjectId</Text>
              <View style={styles.lookupRow}>
                <TextInput
                  style={styles.input}
                  value={lookupUserId}
                  onChangeText={setLookupUserId}
                  placeholder="Leave blank for self"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.lookupBtn}
                  onPress={() => handleTestLookup()}
                  disabled={isLookingUp}
                >
                  {isLookingUp ? (
                    <ActivityIndicator size="small" color={COLORS.textInverse} />
                  ) : (
                    <Text style={styles.lookupBtnText}>Query</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.quickPills}>
                <TouchableOpacity
                  style={styles.pill}
                  onPress={() => {
                    setLookupUserId('');
                    handleTestLookup('');
                  }}
                >
                  <Text style={styles.pillText}>Self</Text>
                </TouchableOpacity>
                {users.slice(0, 4).map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.pill}
                    onPress={() => {
                      setLookupUserId(u.id);
                      handleTestLookup(u.id);
                    }}
                  >
                    <Text style={styles.pillText}>{u.name.split('@')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {lookupError && (
                <Text style={styles.errorText}>{lookupError}</Text>
              )}

              {lookupResult && (
                <View style={styles.jsonBox}>
                  <Text style={styles.jsonText}>
                    {JSON.stringify(lookupResult, null, 2)}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>
                  FactBot 10s interval (Offline Mode)
                </Text>
                <Switch
                  value={factBotAutoEnabled}
                  onValueChange={setFactBotAutoEnabled}
                  trackColor={{ false: COLORS.borderLight, true: COLORS.accent }}
                />
              </View>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleTriggerBot}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={15}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.secondaryBtnText}>
                  Dispatch FactBot Message
                </Text>
              </TouchableOpacity>

              {botToast && <Text style={styles.toastText}>{botToast}</Text>}

              {mode === 'mock' && (
                <TouchableOpacity
                  style={[styles.secondaryBtn, { marginTop: SPACING.sm }]}
                  onPress={resetMockData}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={15}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.secondaryBtnText}>
                    Reset Local Mock Data
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await logout();
            router.replace('/login');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.7,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  groupLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: SPACING.sm,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileDetails: {
    flex: 1,
    marginLeft: SPACING.lg,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  profileBio: {
    color: COLORS.textSecondary,
    fontSize: 13.5,
    marginTop: 3,
  },
  profileId: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    marginTop: 6,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 26,
    backgroundColor: COLORS.border,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    color: COLORS.textPrimary,
    fontSize: 14.5,
    fontWeight: '500',
  },
  optionSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  devContent: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  devLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  lookupRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  lookupBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnText: {
    color: COLORS.textInverse,
    fontWeight: '600',
    fontSize: 13,
  },
  quickPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.sm,
  },
  pill: {
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: SPACING.sm,
  },
  jsonBox: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.bgPrimary,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  jsonText: {
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    fontSize: 11.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  switchLabel: {
    color: COLORS.textPrimary,
    fontSize: 13.5,
    flex: 1,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.bgPrimary,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  secondaryBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  toastText: {
    color: COLORS.success,
    fontSize: 12,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.bgSecondary,
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 14.5,
    fontWeight: '600',
  },
});
