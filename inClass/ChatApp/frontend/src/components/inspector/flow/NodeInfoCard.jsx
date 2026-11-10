/**
 * NodeInfoCard: what one box on the flow map does, in plain words and
 * technically, where it lives in the code, and the last requests that went
 * through it (tap one to dive into it in network).
 */
import X from 'lucide-react-native/icons/x';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { durations } from '../../../constants/motion';
import { fonts, radius, space } from '../../../constants/theme';
import { describeRow } from '../../../debug/describeRequest';
import { nodeInfo, routeOf } from '../../../debug/flowPath';
import { openRequest } from '../../../debug/inspectorStore';
import { useTheme } from '../../../hooks/useTheme';
import { Icon } from '../../ui/Icon';

const RECENT = 3;

/**
 * @param {object} props
 * @param {string} props.id node id
 * @param {object[]} props.requests networkStore rows, oldest first
 * @param {() => void} props.onClose
 */
export function NodeInfoCard({ id, requests, onClose }) {
  const { colors } = useTheme();
  const info = nodeInfo(id);
  const recent = [...requests]
    .reverse()
    .filter((row) => row.state !== 'pending' && routeOf(row).down.includes(id))
    .slice(0, RECENT);

  return (
    <Animated.View
      entering={FadeIn.duration(durations.base)}
      exiting={FadeOut.duration(durations.fast)}
      style={[styles.card, { backgroundColor: colors.slabRaised }]}
    >
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.textOnSlab }]}>{info.title}</Text>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
          <Icon as={X} color={colors.textOnSlabMuted} size={18} />
        </Pressable>
      </View>
      <Text style={[styles.plain, { color: colors.textOnSlab }]}>{info.plain}</Text>
      <Text style={[styles.technical, { color: colors.textOnSlabMuted }]}>{info.technical}</Text>
      <Text style={[styles.technical, { color: colors.textOnSlabMuted }]}>{info.file}</Text>
      {recent.length ? (
        <View style={styles.recent}>
          {recent.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => openRequest(row.id)}
              accessibilityLabel={`Open ${describeRow(row)}`}
            >
              <Text style={[styles.request, { color: colors.textOnSlab }]} numberOfLines={1}>
                {describeRow(row)} · {row.status ?? 'failed'} · {row.durationMs} ms
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.bubble, padding: space.md, gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.semibold, fontSize: 15 },
  plain: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  technical: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16 },
  recent: { gap: 6, marginTop: 4 },
  request: { fontFamily: fonts.medium, fontSize: 12, textDecorationLine: 'underline' },
});
