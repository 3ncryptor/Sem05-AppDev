/**
 * Wordmark: "huddle." in lowercase Inter with the full stop drawn as a
 * gradient SVG dot (design.md 4.1). The dot is the screen's one accent.
 */
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { fonts, gradient } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const DOT_RATIO = 0.22; // dot diameter relative to font size
const GAP_RATIO = 0.04; // space between "huddle" and the dot
const BASELINE_RATIO = 0.2; // lifts the dot onto the text baseline
const LETTER_SPACING_RATIO = -0.0375; // -1.5 at size 40

/**
 * @param {object} props
 * @param {number} [props.size=40] font size in points
 * @param {string} [props.color] text colour; defaults to the theme's primary text
 */
export function Wordmark({ size = 40, color }) {
  const { colors } = useTheme();
  const dot = size * DOT_RATIO;

  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="huddle">
      <Text
        style={{
          fontFamily: fonts.semibold,
          fontSize: size,
          lineHeight: size * 1.15,
          letterSpacing: size * LETTER_SPACING_RATIO,
          color: color ?? colors.textPrimary,
        }}
      >
        huddle
      </Text>
      <Svg
        width={dot}
        height={dot}
        style={{ marginLeft: size * GAP_RATIO, marginBottom: size * BASELINE_RATIO }}
      >
        <Defs>
          <LinearGradient id="wordmarkDot" x1="0" y1="0.4" x2="1" y2="0.6">
            {gradient.colors.map((stopColor, i) => (
              <Stop key={stopColor} offset={gradient.locations[i]} stopColor={stopColor} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle cx={dot / 2} cy={dot / 2} r={dot / 2} fill="url(#wordmarkDot)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
});
