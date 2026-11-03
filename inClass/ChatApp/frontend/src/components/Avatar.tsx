import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { getInitials, getUserColor, isFactBotName } from '../utils/format';

interface AvatarProps {
  name?: string | null;
  size?: number;
  isGroup?: boolean;
  showBotBadge?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 46,
  isGroup = false,
  showBotBadge = true,
}) => {
  const isBot = showBotBadge && isFactBotName(name);
  const bg = isGroup
    ? COLORS.accentLight
    : isBot
      ? COLORS.accent
      : getUserColor(name);
  const initials = getInitials(name);
  const iconSize = Math.round(size * 0.44);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      {isBot ? (
        <Ionicons name="sparkles-outline" size={iconSize} color={COLORS.textInverse} />
      ) : isGroup ? (
        <Ionicons name="people-outline" size={iconSize} color={COLORS.textInverse} />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>
          {initials}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  initials: {
    color: COLORS.textInverse,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
