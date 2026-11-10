/**
 * ArchitectureMap: the whole system on one phone-tall diagram (buildPlan.md
 * 15, flow tab): frontend -> network -> backend -> database, with the real
 * connections drawn as SVG lines. While traffic is on, the lines flow (moving
 * dashes); when it is quiet, they are still. Packets (FlowPacket) are drawn
 * on top by the parent. In replay, one box is lit and the rest are dimmed.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { fonts } from '../../../constants/theme';
import { BAND_LABEL, centerOf } from '../../../debug/flowLayout';
import { ARCHITECTURE } from '../../../debug/flowPath';
import { useTheme } from '../../../hooks/useTheme';
import { FlowBox } from './FlowBox';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LINKS = [
  ['screen', 'store'],
  ['store', 'client'],
  ['client', 'http'],
  ['http', 'middleware'],
  ['middleware', 'guard'],
  ['guard', 'controller'],
  ['controller', 'service'],
  ['service', 'prisma'],
  ['prisma', 'users'],
  ['prisma', 'conversations'],
  ['prisma', 'messages'],
  ['prisma', 'files'],
];
const DASH = 10;
const FLOW_MS = 600;

function linkPath(nodes) {
  return LINKS.map(([from, to]) => {
    const a = centerOf(nodes[from]);
    const b = centerOf(nodes[to]);
    const midY = (a.y + b.y) / 2;
    return `M${a.x} ${a.y} C${a.x} ${midY} ${b.x} ${midY} ${b.x} ${b.y}`;
  }).join(' ');
}

/**
 * @param {object} props
 * @param {number} props.width
 * @param {ReturnType<typeof import('../../../debug/flowLayout').flowLayout>} props.layout
 * @param {boolean} props.isFlowing traffic is on (lines move)
 * @param {boolean} props.fromCode backend and database are known from the code only
 * @param {(id: string) => 'lit' | 'dim' | 'normal'} [props.focusOf]
 * @param {(id: string) => void} props.onPressNode
 * @param {import('react').ReactNode} [props.children] packets, drawn on top
 */
export function ArchitectureMap({
  width,
  layout,
  isFlowing,
  fromCode,
  focusOf,
  onPressNode,
  children,
}) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!isFlowing || reduceMotion) {
      cancelAnimation(offset);
      return undefined;
    }
    offset.set(0);
    offset.set(withRepeat(withTiming(-DASH * 2, { duration: FLOW_MS, easing: Easing.linear }), -1));
    return () => cancelAnimation(offset);
  }, [isFlowing, reduceMotion, offset]);

  const dashProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));

  return (
    <View style={{ width, height: layout.height }}>
      {layout.bands.map((band) => {
        const layer = ARCHITECTURE.find((item) => item.id === band.id);
        const showCode = fromCode && (band.id === 'backend' || band.id === 'database');
        return (
          <View
            key={band.id}
            style={[
              styles.band,
              { top: band.y - 4, height: band.h + 8, borderColor: colors.slabRaised },
            ]}
          >
            <View style={[styles.bandHead, { height: BAND_LABEL }]}>
              <Text style={[styles.bandTitle, { color: colors.textOnSlab }]}>{layer.title}</Text>
              <Text style={[styles.bandSub, { color: colors.textOnSlabMuted }]}>
                {layer.subtitle}
              </Text>
              {showCode ? (
                <Text
                  style={[
                    styles.code,
                    { color: colors.textOnSlabMuted, borderColor: colors.textOnSlabMuted },
                  ]}
                >
                  from the code
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
      <Svg
        width={width}
        height={layout.height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Path d={linkPath(layout.nodes)} stroke={colors.slabRaised} strokeWidth={2} fill="none" />
        <AnimatedPath
          d={linkPath(layout.nodes)}
          stroke={isFlowing ? colors.textOnSlabMuted : 'transparent'}
          strokeWidth={2}
          strokeDasharray={[DASH / 2, DASH * 1.5]}
          fill="none"
          animatedProps={dashProps}
        />
      </Svg>
      {Object.entries(layout.nodes).map(([id, box]) => (
        <FlowBox
          key={id}
          id={id}
          box={box}
          focus={focusOf ? focusOf(id) : 'normal'}
          onPress={onPressNode}
        />
      ))}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: -6, right: -6, borderRadius: 18, borderWidth: 1 },
  bandHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10 },
  bandTitle: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bandSub: { fontFamily: fonts.regular, fontSize: 11 },
  code: {
    marginLeft: 'auto',
    fontFamily: fonts.medium,
    fontSize: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
});
