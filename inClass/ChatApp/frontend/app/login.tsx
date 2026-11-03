import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../src/constants/theme';
import {
  CLOUDFLARE_TUNNEL_URL,
  DEFAULT_LAB_SERVER_URL,
  MAC_LAN_SERVER_URL,
  useAuth,
} from '../src/context/AuthContext';
import { ConnectionMode } from '../src/types/api';

const QUICK_ACCOUNTS = [
  {
    label: 'Aryan',
    username: 'aryan.vibhuti2024@nst.rishihood.edu.in',
    password: 'Aryan@1122334455',
  },
  {
    label: 'Ritesh',
    username: 'Ritesh',
    password: 'ritesh123',
  },
  {
    label: 'Abhinay',
    username: 'abhinay',
    password: 'abhinay123',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const { login, mode, isAuthenticating } = useAuth();

  const [username, setUsername] = useState('aryan.vibhuti2024@nst.rishihood.edu.in');
  const [password, setPassword] = useState('Aryan@1122334455');
  const [showPassword, setShowPassword] = useState(false);

  const [selectedMode, setSelectedMode] = useState<ConnectionMode>(mode);
  const [serverInput, setServerInput] = useState<string>(CLOUDFLARE_TUNNEL_URL);
  const [showAdvancedServer, setShowAdvancedServer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleConnect = async (overrideMode?: ConnectionMode) => {
    setErrorMessage(null);
    const activeMode = overrideMode ?? selectedMode;

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      await login(
        { username: username.trim(), password: password.trim() },
        { baseUrl: serverInput.trim(), mode: activeMode },
      );
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed');
    }
  };

  const toggleAdvanced = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdvancedServer((prev) => !prev);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Minimalist Brand Header */}
            <View style={styles.brandSection}>
              <View style={styles.logoMark}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={28}
                  color={COLORS.textPrimary}
                />
              </View>
              <Text style={styles.appTitle}>ChatApp</Text>
              <Text style={styles.appSubtitle}>
                Minimalist Messaging Client
              </Text>
            </View>

            {/* Primary Sign-In Card */}
            <View style={styles.card}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={17}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username or email"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={COLORS.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Quick Fill Profiles */}
              <View style={styles.presetSection}>
                <Text style={styles.presetLabel}>Quick Fill</Text>
                <View style={styles.presetRow}>
                  {QUICK_ACCOUNTS.map((preset) => {
                    const isSelected = username === preset.username;
                    return (
                      <TouchableOpacity
                        key={preset.username}
                        style={[
                          styles.presetPill,
                          isSelected && styles.presetPillActive,
                        ]}
                        onPress={() => {
                          setUsername(preset.username);
                          setPassword(preset.password);
                          setErrorMessage(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.presetPillText,
                            isSelected && styles.presetPillTextActive,
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Error State */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <View style={styles.errorHeader}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={16}
                      color={COLORS.danger}
                    />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                  {selectedMode === 'live' && (
                    <TouchableOpacity
                      style={styles.fallbackButton}
                      onPress={() => {
                        setSelectedMode('mock');
                        handleConnect('mock');
                      }}
                    >
                      <Text style={styles.fallbackButtonText}>
                        Continue in Offline Mode
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Primary CTA */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => handleConnect()}
                disabled={isAuthenticating}
                activeOpacity={0.85}
              >
                {isAuthenticating ? (
                  <ActivityIndicator color={COLORS.textInverse} />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>Continue</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={COLORS.textInverse}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Collapsible Server Configuration Drawer */}
            <View style={styles.serverSection}>
              <TouchableOpacity
                style={styles.serverToggle}
                onPress={toggleAdvanced}
                activeOpacity={0.7}
              >
                <View style={styles.serverToggleLeft}>
                  <Ionicons
                    name="server-outline"
                    size={15}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.serverToggleText}>
                    {selectedMode === 'mock'
                      ? 'Connection: Offline Mock'
                      : serverInput === CLOUDFLARE_TUNNEL_URL
                        ? 'Connection: Cloud Tunnel'
                        : `Connection: ${serverInput.replace(/^https?:\/\//, '')}`}
                  </Text>
                </View>
                <Ionicons
                  name={showAdvancedServer ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              {showAdvancedServer && (
                <View style={styles.serverCard}>
                  <View style={styles.modeGrid}>
                    {[
                      {
                        label: 'Cloud Tunnel',
                        sub: 'HTTPS Bridge',
                        mode: 'live' as ConnectionMode,
                        url: CLOUDFLARE_TUNNEL_URL,
                        icon: 'cloud-outline' as const,
                      },
                      {
                        label: 'Lab Network',
                        sub: '10.7.1.51:3000',
                        mode: 'live' as ConnectionMode,
                        url: DEFAULT_LAB_SERVER_URL,
                        icon: 'wifi-outline' as const,
                      },
                      {
                        label: 'Mac LAN',
                        sub: '10.7.18.178',
                        mode: 'live' as ConnectionMode,
                        url: MAC_LAN_SERVER_URL,
                        icon: 'laptop-outline' as const,
                      },
                      {
                        label: 'Offline Mode',
                        sub: 'Local Simulator',
                        mode: 'mock' as ConnectionMode,
                        url: serverInput,
                        icon: 'layers-outline' as const,
                      },
                    ].map((opt) => {
                      const active =
                        opt.mode === 'mock'
                          ? selectedMode === 'mock'
                          : selectedMode === 'live' && serverInput === opt.url;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[
                            styles.modeOption,
                            active && styles.modeOptionActive,
                          ]}
                          onPress={() => {
                            setSelectedMode(opt.mode);
                            if (opt.mode === 'live') setServerInput(opt.url);
                            setErrorMessage(null);
                          }}
                        >
                          <Ionicons
                            name={opt.icon}
                            size={16}
                            color={active ? COLORS.textPrimary : COLORS.textMuted}
                          />
                          <Text
                            style={[
                              styles.modeOptionTitle,
                              active && styles.modeOptionTitleActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text style={styles.modeOptionSub}>{opt.sub}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {selectedMode === 'live' && (
                    <View style={styles.customUrlBox}>
                      <Text style={styles.label}>Server Endpoint</Text>
                      <TextInput
                        style={styles.urlInput}
                        value={serverInput}
                        onChangeText={setServerInput}
                        placeholder="https://..."
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xxxl,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoMark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  appTitle: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  appSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13.5,
    marginTop: 4,
    letterSpacing: 0.1,
  },
  card: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgPrimary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.sm,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14.5,
    paddingVertical: 0,
  },
  presetSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  presetLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetPill: {
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  presetPillActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  presetPillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  presetPillTextActive: {
    color: COLORS.textInverse,
  },
  errorBox: {
    backgroundColor: COLORS.dangerSoft,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  fallbackButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.bgSecondary,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  fallbackButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    height: 50,
    marginTop: SPACING.xs,
  },
  submitButtonText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '600',
  },
  serverSection: {
    marginTop: SPACING.lg,
  },
  serverToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgTertiary,
  },
  serverToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serverToggleText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
  },
  serverCard: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeOption: {
    width: '48%',
    backgroundColor: COLORS.bgPrimary,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  modeOptionActive: {
    backgroundColor: COLORS.bgTertiary,
    borderColor: COLORS.accentLight,
  },
  modeOptionTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },
  modeOptionTitleActive: {
    color: COLORS.textPrimary,
  },
  modeOptionSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  customUrlBox: {
    marginTop: SPACING.sm,
  },
  urlInput: {
    backgroundColor: COLORS.bgPrimary,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
});
