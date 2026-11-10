/** ChatsSkeleton: placeholder card and rows while chats load for the first time. */
import { StyleSheet, View } from 'react-native';
import { radius, space } from '../../constants/theme';
import { Skeleton } from '../ui/Skeleton';

const ROWS = 3;

export function ChatsSkeleton() {
  return (
    <View style={styles.wrap}>
      <Skeleton height={330} radius={radius.card} />
      {Array.from({ length: ROWS }, (_, index) => (
        <Skeleton key={index} height={68} radius={radius.bubble} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { padding: space.md, gap: space.sm } });
