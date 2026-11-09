/**
 * ChatsHeader: the notch slab on the Chats tab with the wordmark and the
 * signed-in user's face (tap for Profile).
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { PressableScale } from '../ui/PressableScale';
import { Slab } from '../ui/Slab';
import { Wordmark } from '../ui/Wordmark';

/** @param {{ myName: string }} props */
export function ChatsHeader({ myName }) {
  const { colors } = useTheme();
  return (
    <Slab variant="notch">
      <View style={styles.row}>
        <Wordmark size={26} color={colors.textOnSlab} />
        <PressableScale onPress={() => router.navigate('/profile')} accessibilityLabel="Profile">
          <Avatar name={myName} size={44} ringColor={colors.ringOnSlab} />
        </PressableScale>
      </View>
    </Slab>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
});
