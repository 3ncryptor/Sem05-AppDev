/**
 * ConnectionStatus: one line under the server picker, e.g.
 * "http://192.168.1.5:3000   (dot) reachable". The dot is a plain view,
 * green when reachable and red when not.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const DOT = 8;
const LABELS = { idle: 'not checked', checking: 'checking', ok: 'reachable', fail: 'unreachable' };

/**
 * @param {object} props
 * @param {string | null} props.url
 * @param {'idle' | 'checking' | 'ok' | 'fail'} props.state
 * @param {string} [props.message] reason shown when the check failed
 */
export function ConnectionStatus({ url, state, message }) {
  const { colors } = useTheme();
  const dotColor =
    state === 'ok' ? colors.success : state === 'fail' ? colors.danger : colors.textTertiary;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[type.caption, styles.url, { color: colors.textSecondary }]} numberOfLines={1}>
          {url ?? 'no address yet'}
        </Text>
        <View style={styles.status} accessibilityLiveRegion="polite">
          {state === 'checking' ? (
            <ActivityIndicator size="small" color={colors.textTertiary} />
          ) : (
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
          )}
          <Text style={[type.caption, { color: colors.textSecondary }]}>{LABELS[state]}</Text>
        </View>
      </View>
      {state === 'fail' && message ? (
        <Text style={[type.caption, { color: colors.danger }]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xxs, paddingHorizontal: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  url: { flex: 1, marginRight: space.sm },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
