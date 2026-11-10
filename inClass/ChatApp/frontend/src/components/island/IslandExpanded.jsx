/**
 * IslandExpanded: an activity opened as a card under the camera.
 *
 *   ╭──────────────── [camera] ────────────────╮
 *   │ (face) diya                         now   │
 *   │ are you coming to the lab?                │
 *   │ ( reply to diya ............ ) (^) (open) │
 *   ╰───────────────────────────────────────────╯
 *
 * Messages get a quick reply, "read" and "open". Other activities get their one
 * action. Slide the card sideways to mark it read (from anywhere above the
 * bottom row); "read" is the button form of the same thing.
 */
import Check from 'lucide-react-native/icons/check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../constants/theme';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { IslandGlyph } from './IslandGlyph';
import { island, toneColor } from './islandTheme';
import { QuickReply } from './QuickReply';

const ACTIONS = {
  failed: { label: 'retry', intent: 'retry' },
  newChat: { label: 'open', intent: 'open' },
  message: { label: 'open', intent: 'open' },
};

/**
 * @param {object} props
 * @param {object} props.activity
 * @param {number} props.topGap space kept clear for the camera
 * @param {(intent: 'open' | 'retry' | 'markRead') => void} props.onAction
 */
export function IslandExpanded({ activity, topGap, onAction }) {
  const [problem, setProblem] = useState('');
  const isMessage = activity.kind === 'message';
  const heading = activity.title;
  const subline = isMessage
    ? activity.isGroup
      ? `${activity.sender}: ${activity.preview}`
      : activity.preview
    : (activity.detail ?? '');
  const action = ACTIONS[activity.kind];

  return (
    <View style={[styles.card, { paddingTop: topGap }]} accessibilityViewIsModal={false}>
      <View style={styles.head}>
        <IslandGlyph activity={activity} size={38} />
        <View style={styles.headText}>
          <Text
            style={[styles.title, { color: isMessage ? island.text : toneColor(activity.tone) }]}
            numberOfLines={1}
          >
            {heading}
          </Text>
          {isMessage && activity.count > 1 ? (
            <Text style={styles.meta}>{activity.count} new messages</Text>
          ) : null}
        </View>
        <Text style={styles.meta}>now</Text>
      </View>
      <Text style={styles.body} numberOfLines={2}>
        {problem || subline}
      </Text>
      <View style={styles.actions}>
        {isMessage ? (
          <QuickReply activity={activity} onError={setProblem} />
        ) : (
          <View style={styles.grow} />
        )}
        {isMessage ? (
          <PressableScale onPress={() => onAction('markRead')} accessibilityLabel="Mark as read">
            <View style={styles.round}>
              <Icon as={Check} color={island.text} size={18} />
            </View>
          </PressableScale>
        ) : null}
        {action ? (
          <PressableScale
            onPress={() => onAction(action.intent)}
            accessibilityLabel={`${action.label} ${heading}`}
          >
            <View style={styles.action}>
              <Text style={styles.actionText}>{action.label}</Text>
              <Icon as={ChevronRight} color={island.text} size={16} />
            </View>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headText: { flex: 1 },
  title: { fontFamily: fonts.semibold, fontSize: 15 },
  meta: { color: island.muted, fontFamily: fonts.regular, fontSize: 12 },
  body: { color: island.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 'auto' },
  grow: { flex: 1 },
  action: {
    height: 40,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 20,
    backgroundColor: island.raised,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: island.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: island.text, fontFamily: fonts.medium, fontSize: 14 },
});
