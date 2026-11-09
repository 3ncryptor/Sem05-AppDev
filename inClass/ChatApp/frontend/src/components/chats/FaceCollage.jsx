/**
 * FaceCollage: up to four member faces scattered over a group card's
 * gradient wash (buildPlan.md 5.2), each a little tilted.
 */
import { StyleSheet, View } from 'react-native';
import { Avatar } from '../avatar/Avatar';

const SPOTS = [
  { top: 18, right: 22, size: 72, rotate: '-6deg' },
  { top: 60, right: 104, size: 56, rotate: '8deg' },
  { top: 104, right: 30, size: 52, rotate: '4deg' },
  { top: 12, right: 150, size: 44, rotate: '-10deg' },
];

/** @param {{ names: string[], ringColor: string }} props */
export function FaceCollage({ names, ringColor }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {names.slice(0, SPOTS.length).map((name, index) => {
        const spot = SPOTS[index];
        return (
          <View
            key={`${name}-${index}`}
            style={[
              styles.face,
              { top: spot.top, right: spot.right, transform: [{ rotate: spot.rotate }] },
            ]}
          >
            <Avatar name={name} size={spot.size} ringColor={ringColor} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({ face: { position: 'absolute' } });
