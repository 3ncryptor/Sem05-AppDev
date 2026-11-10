/**
 * AvatarLab (temporary, buildPlan.md 13, V0): the same faces drawn the old
 * way (raw DiceBear SVG through SvgXml at 100%) and the new way (cleaned,
 * cached tree at an exact size), side by side. Used once on the Android
 * phone to confirm the fix, then deleted.
 */
import { createAvatar } from '@dicebear/core';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { fonts } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from './Avatar';
import { AVATAR_STYLES, avatarTint } from './avatarSvg';

const LAB_NAMES = [
  'aarav',
  'diya',
  'kabir',
  'meera',
  'rohan',
  'ishaan',
  'anaya',
  'vihaan',
  'saanvi',
  'arjun',
];
const LAB_SIZE = 40;

const RawAvatar = memo(function RawAvatar({ name, styleEntry }) {
  const xml = createAvatar(styleEntry.style, { seed: name }).toString();
  return (
    <View style={[styles.circle, { backgroundColor: avatarTint(name) }]}>
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
});

/** Two rows per style: "before" (raw) over "after" (the app's Avatar). */
export function AvatarLab() {
  const { colors } = useTheme();
  const caption = [styles.caption, { color: colors.textTertiary }];

  return (
    <View style={styles.lab}>
      {AVATAR_STYLES.map((entry) => (
        <View key={entry.id} style={styles.block}>
          <Text style={caption}>{entry.label}: before</Text>
          <View style={styles.row}>
            {LAB_NAMES.map((name) => (
              <RawAvatar key={name} name={name} styleEntry={entry} />
            ))}
          </View>
          <Text style={caption}>{entry.label}: after</Text>
          <View style={styles.row}>
            {LAB_NAMES.map((name) => (
              <Avatar key={name} name={name} size={LAB_SIZE} styleId={entry.id} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lab: { gap: 12 },
  block: { gap: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  caption: { fontFamily: fonts.medium, fontSize: 12 },
  circle: { width: LAB_SIZE, height: LAB_SIZE, borderRadius: LAB_SIZE / 2, overflow: 'hidden' },
});
