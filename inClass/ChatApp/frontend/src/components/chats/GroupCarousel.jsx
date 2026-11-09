/**
 * GroupCarousel: swipeable group cards with page dots (buildPlan.md 5.2).
 * Cards snap one at a time; the active dot stretches into a gradient pill.
 */
import { useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { GradientFill } from '../ui/GradientFill';
import { GroupCard } from './GroupCard';

const DOT = 6;
const ACTIVE_DOT = 18;

/**
 * @param {object} props
 * @param {{ id: string, title: string, names: string[] }[]} props.groups
 * @param {(id: string) => void} props.onOpen
 * @param {(id: string) => void} props.onShowMembers
 */
export function GroupCarousel({ groups, onOpen, onShowMembers }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = width - space.md * 2;
  const step = cardWidth + space.sm;
  const [page, setPage] = useState(0);

  return (
    <View style={styles.wrap}>
      <FlatList
        data={groups}
        keyExtractor={(group) => group.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        contentContainerStyle={styles.track}
        onMomentumScrollEnd={(event) =>
          setPage(Math.round(event.nativeEvent.contentOffset.x / step))
        }
        renderItem={({ item }) => (
          <GroupCard
            title={item.title}
            names={item.names}
            width={cardWidth}
            onOpen={() => onOpen(item.id)}
            onShowMembers={() => onShowMembers(item.id)}
          />
        )}
      />
      {groups.length > 1 ? (
        <View style={styles.dots} accessibilityLabel={`Group ${page + 1} of ${groups.length}`}>
          {groups.map((group, index) =>
            index === page ? (
              <GradientFill key={group.id} style={[styles.dot, { width: ACTIVE_DOT }]} />
            ) : (
              <View key={group.id} style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  track: { paddingHorizontal: space.md, gap: space.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.xxs },
  dot: { width: DOT, height: DOT, borderRadius: radius.pill },
});
