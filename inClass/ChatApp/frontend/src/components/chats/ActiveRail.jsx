/**
 * ActiveRail: "recently active" faces under the notch (V6), ordered with
 * unread people first. A gradient ring marks someone with unread messages;
 * tapping a face opens that chat. Hidden until somebody has written.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fonts, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { GradientFill } from '../ui/GradientFill';
import { PressableScale } from '../ui/PressableScale';

const FACE = 52;
const RING = 2.5;
const GAP = 2;

/**
 * @param {object} props
 * @param {{ id: string, name: string, unread: number }[]} props.faces
 * @param {(chatId: string) => void} props.onOpen
 */
export function ActiveRail({ faces, onOpen }) {
  const { colors } = useTheme();
  if (!faces.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {faces.map((face) => {
        const hasUnread = face.unread > 0;
        const ringStyle = [styles.ring, !hasUnread && { backgroundColor: colors.surfaceRaised }];
        const Ring = hasUnread ? GradientFill : View;
        return (
          <PressableScale
            key={face.id}
            onPress={() => onOpen(face.id)}
            accessibilityLabel={
              hasUnread ? `${face.name}, ${face.unread} unread` : `Chat with ${face.name}`
            }
          >
            <View style={styles.item}>
              <Ring style={ringStyle}>
                <View style={[styles.gap, { backgroundColor: colors.surface }]}>
                  <Avatar name={face.name} size={FACE} />
                </View>
              </Ring>
              <Text
                style={[
                  styles.name,
                  {
                    color: hasUnread ? colors.textPrimary : colors.textSecondary,
                    fontFamily: hasUnread ? fonts.semibold : fonts.regular,
                  },
                ]}
                numberOfLines={1}
              >
                {face.name}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const OUTER = FACE + (RING + GAP) * 2;

const styles = StyleSheet.create({
  rail: { paddingHorizontal: space.md, gap: space.sm },
  item: { alignItems: 'center', width: OUTER + 4, gap: space.xxs },
  ring: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    padding: RING,
  },
  gap: {
    flex: 1,
    borderRadius: OUTER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 12, maxWidth: OUTER + 4 },
});
