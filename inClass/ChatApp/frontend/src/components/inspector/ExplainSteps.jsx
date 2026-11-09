/**
 * ExplainSteps: walks through one real request a step at a time (explain
 * mode). Each step names the node it lights up on the Live Wire and shows
 * the real payload. Back / next move between steps.
 */
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import X from 'lucide-react-native/icons/x';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fonts, gradient, radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { RingButton } from '../ui/RingButton';

/**
 * @param {object} props
 * @param {{ node: string, title: string, detail: string }[]} props.steps
 * @param {number} props.index
 * @param {(index: number) => void} props.onStep
 * @param {() => void} props.onClose
 */
export function ExplainSteps({ steps, index, onStep, onClose }) {
  const { colors } = useTheme();
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <View style={[styles.card, { backgroundColor: colors.slabRaised }]}>
      <View style={styles.header}>
        <Text style={[type.caption, { color: gradient.colors[1] }]}>
          step {index + 1} of {steps.length} · {step.node}
        </Text>
        <RingButton
          icon={X}
          variant="slab"
          size={32}
          onPress={onClose}
          accessibilityLabel="Stop explaining"
        />
      </View>
      <Text style={[type.heading, { color: colors.textOnSlab }]} accessibilityLiveRegion="polite">
        {step.title}
      </Text>
      {step.detail ? (
        <ScrollView style={styles.detailBox}>
          <Text style={[styles.detail, { color: colors.textOnSlabMuted }]} selectable>
            {step.detail}
          </Text>
        </ScrollView>
      ) : null}
      <View style={styles.nav}>
        <RingButton
          icon={ChevronLeft}
          variant="slab"
          size={40}
          disabled={isFirst}
          onPress={() => onStep(index - 1)}
          accessibilityLabel="Previous step"
        />
        <RingButton
          icon={ChevronRight}
          variant={isLast ? 'slab' : 'accent'}
          size={40}
          disabled={isLast}
          onPress={() => onStep(index + 1)}
          accessibilityLabel="Next step"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.bubble, padding: space.md, gap: space.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailBox: { maxHeight: 120 },
  detail: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 15 },
  nav: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.xs },
});
