/**
 * IslandConfirm: the near-square confirmation, like the island's Face ID
 * and Apple Pay moment: a face (signed in) or a drawn check, and one short
 * line under it.
 */
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../constants/theme';
import { Avatar } from '../avatar/Avatar';
import { CheckDraw } from './CheckDraw';
import { island } from './islandTheme';

const MARK = 46;
const BADGE = 20;

/**
 * @param {object} props
 * @param {{ title: string, detail?: string, name?: string }} props.confirm
 * @param {number} props.topGap space kept clear for the camera
 */
export function IslandConfirm({ confirm, topGap }) {
  return (
    <View
      style={[styles.box, { paddingTop: topGap }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={[confirm.title, confirm.detail].filter(Boolean).join(', ')}
    >
      {confirm.name ? (
        <View>
          <Avatar name={confirm.name} size={MARK} />
          <View style={styles.badge}>
            <CheckDraw size={BADGE} color="#FFFFFF" ring={island.success} />
          </View>
        </View>
      ) : (
        <CheckDraw size={MARK} color="#000000" ring={island.success} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {confirm.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  badge: { position: 'absolute', right: -4, bottom: -4 },
  title: { color: island.text, fontFamily: fonts.semibold, fontSize: 12, maxWidth: 100 },
});
