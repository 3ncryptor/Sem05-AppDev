/**
 * PillInput: the 56-high rounded text field (design.md 6.5 composer shape).
 * Shows a ring while focused, turns red and shakes when `error` changes to a
 * message, and offers a show/hide toggle for passwords.
 */
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { fonts, radius, space, type } from '../../constants/theme';
import { useShake } from '../../hooks/useShake';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { Icon } from './Icon';

const HEIGHT = 56;

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(text: string) => void} props.onChangeText
 * @param {string} props.placeholder also used as the accessibility label
 * @param {import('react').ComponentType<any>} [props.icon] leading lucide icon
 * @param {string} [props.error] message shown under the field; a new message shakes it
 * @param {boolean} [props.secure] password field with a show/hide toggle
 * @param {object} [props.inputProps] extra TextInput props (keyboardType, autoComplete...)
 */
export function PillInput({ value, onChangeText, placeholder, icon, error, secure, inputProps }) {
  const { colors } = useTheme();
  const { animatedStyle, shake } = useShake();
  const [isFocused, setIsFocused] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  useEffect(() => {
    if (error) {
      haptics.error();
      shake();
    }
    // shake is recreated every render; only a new error message should trigger it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const borderColor = error ? colors.danger : isFocused ? colors.textPrimary : 'transparent';

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.pill, { backgroundColor: colors.surfaceRaised, borderColor }, animatedStyle]}
      >
        {icon ? <Icon as={icon} color={colors.textSecondary} size={20} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={placeholder}
          secureTextEntry={secure && isHidden}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, { color: colors.textPrimary }]}
          {...inputProps}
        />
        {secure ? (
          <Pressable
            onPress={() => setIsHidden((hidden) => !hidden)}
            accessibilityRole="button"
            accessibilityLabel={isHidden ? 'Show password' : 'Hide password'}
            hitSlop={12}
          >
            <Icon as={isHidden ? Eye : EyeOff} color={colors.textSecondary} size={20} />
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <Text
          style={[type.caption, styles.error, { color: colors.danger }]}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xxs },
  pill: {
    height: HEIGHT,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, height: HEIGHT },
  error: { paddingHorizontal: space.lg },
});
