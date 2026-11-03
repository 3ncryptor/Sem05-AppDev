import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export const ServerStatusBanner: React.FC = () => {
  const { mode, baseUrl, setServerConfig } = useAuth();

  // Only show the banner when in Offline Mock Mode so Live Mode remains ultra-clean and minimalist
  if (mode === 'live') {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.leftRow}>
        <Ionicons name="cloud-offline-outline" size={14} color={COLORS.warning} />
        <Text style={styles.statusText} numberOfLines={1}>
          Offline Mock Mode Active
        </Text>
      </View>

      <TouchableOpacity
        style={styles.switchBtn}
        onPress={() => setServerConfig(baseUrl, 'live')}
        activeOpacity={0.7}
      >
        <Text style={styles.switchBtnText}>Connect Live</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    backgroundColor: COLORS.warningSoft,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  switchBtn: {
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  switchBtnText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
});
