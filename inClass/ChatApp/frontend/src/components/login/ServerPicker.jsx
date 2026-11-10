/**
 * ServerPicker: "this mac" / "class server" switch for the login screen.
 * "this mac" is tested automatically; the class server shows an address
 * field with a test button beside it (buildPlan.md 5.1).
 */
import Globe from 'lucide-react-native/icons/globe';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { riseIn } from '../../constants/motion';
import { resolveBaseUrl } from '../../api/baseUrl';
import { space, type } from '../../constants/theme';
import { useConnectionTest } from '../../hooks/useConnectionTest';
import { useTheme } from '../../hooks/useTheme';
import { PillInput } from '../ui/PillInput';
import { RingButton } from '../ui/RingButton';
import { SegmentedPill } from '../ui/SegmentedPill';
import { ConnectionStatus } from './ConnectionStatus';

const ROW_IN = riseIn();

const OPTIONS = [
  { value: 'lan', label: 'this mac' },
  { value: 'custom', label: 'class server' },
];

/**
 * @param {object} props
 * @param {'lan' | 'custom'} props.mode
 * @param {(mode: 'lan' | 'custom') => void} props.onModeChange
 * @param {string} props.customUrl
 * @param {(url: string) => void} props.onCustomUrlChange
 * @param {string} [props.error] login error about the server
 */
export function ServerPicker({ mode, onModeChange, customUrl, onCustomUrlChange, error }) {
  const { colors } = useTheme();
  const connection = useConnectionTest();
  const url = resolveBaseUrl(mode, customUrl);

  useEffect(() => {
    if (mode === 'lan') connection.check(resolveBaseUrl('lan', ''));
    else connection.reset();
    // Re-test only when the mode changes; typing an address waits for the test button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <View style={styles.wrap}>
      <Text style={[type.caption, styles.label, { color: colors.textTertiary }]}>server</Text>
      <SegmentedPill options={OPTIONS} value={mode} onChange={onModeChange} />
      {mode === 'custom' ? (
        <Animated.View entering={ROW_IN} exiting={FadeOut} style={styles.customRow}>
          <View style={styles.grow}>
            <PillInput
              value={customUrl}
              onChangeText={onCustomUrlChange}
              placeholder="Server address, e.g. 10.7.1.51"
              icon={Globe}
              inputProps={{ keyboardType: 'url', returnKeyType: 'done' }}
            />
          </View>
          <RingButton
            icon={RefreshCw}
            size={56}
            accessibilityLabel="Test connection"
            onPress={() => connection.check(url)}
          />
        </Animated.View>
      ) : null}
      <ConnectionStatus
        url={url}
        state={error ? 'fail' : connection.state}
        message={error || connection.message}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  label: { textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: space.xs },
  customRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  grow: { flex: 1 },
});
