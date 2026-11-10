/**
 * IslandCompact: one live activity in the pill, split around the camera
 * like the Dynamic Island's compact leading / trailing views:
 *
 *   ( (face) diya   [camera]   2 new )
 *
 * The middle stays empty so nothing is drawn under the front camera.
 */
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../constants/theme';
import { IslandGlyph } from './IslandGlyph';
import { island, toneColor } from './islandTheme';

const SIDE_PADDING = 6;

/**
 * @param {object} props
 * @param {object} props.activity
 * @param {number} props.cameraGap width kept clear in the middle
 * @param {number} props.height pill height (the glyph scales with it)
 */
export function IslandCompact({ activity, cameraGap, height }) {
  const glyph = Math.round(height * 0.68);
  const trailing = activity.detail ?? '';
  const titleColor = activity.kind === 'message' ? island.text : toneColor(activity.tone);

  return (
    <View style={[styles.row, { paddingHorizontal: SIDE_PADDING }]}>
      <View style={styles.side}>
        <IslandGlyph activity={activity} size={glyph} />
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {activity.title}
        </Text>
      </View>
      <View style={{ width: cameraGap }} />
      <View style={[styles.side, styles.end]}>
        <Text
          style={[
            styles.detail,
            { color: activity.kind === 'message' ? island.accent : island.muted },
          ]}
          numberOfLines={1}
        >
          {trailing}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  end: { justifyContent: 'flex-end', paddingRight: 6 },
  title: { flexShrink: 1, fontFamily: fonts.semibold, fontSize: 13 },
  detail: { fontFamily: fonts.medium, fontSize: 12 },
});
