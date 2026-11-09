/**
 * LogoutSheet: confirms logging out. Your name and server are remembered on
 * the login screen; the password is forgotten.
 */
import { StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { PrimaryButton } from '../ui/PrimaryButton';
import { Sheet } from '../ui/Sheet';

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onCancel
 * @param {() => void} props.onConfirm
 */
export function LogoutSheet({ visible, onCancel, onConfirm }) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <Text style={[type.heading, { color: colors.textOnSlab }]}>log out?</Text>
      <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>
        Your username and server stay filled in. You will need your password to come back.
      </Text>
      <View style={styles.actions}>
        <PrimaryButton label="log out" variant="accent" onPress={onConfirm} />
        <PrimaryButton label="stay" variant="onSlab" onPress={onCancel} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ actions: { gap: space.xs, marginTop: space.xs } });
