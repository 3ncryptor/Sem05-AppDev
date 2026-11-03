import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { useChat } from '../../src/context/ChatContext';

export default function ImageViewerModalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeViewerImage } = useChat();

  if (!activeViewerImage) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No photo selected.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.imageBox}>
        <Image
          source={{ uri: activeViewerImage.uri }}
          style={styles.fullImage}
          resizeMode="contain"
        />
      </View>

      <View
        style={[
          styles.metaPanel,
          { paddingBottom: Math.max(insets.bottom + 12, SPACING.lg) },
        ]}
      >
        {activeViewerImage.senderName && (
          <Text style={styles.sender}>
            {activeViewerImage.senderName.split('@')[0]}
          </Text>
        )}
        {activeViewerImage.caption ? (
          <Text style={styles.caption}>{activeViewerImage.caption}</Text>
        ) : null}

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="close-outline" size={18} color={COLORS.textPrimary} />
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
  imageBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  metaPanel: {
    backgroundColor: COLORS.bgSecondary,
    padding: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  sender: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  caption: {
    color: COLORS.textPrimary,
    fontSize: 15,
    marginBottom: SPACING.md,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.bgTertiary,
    height: 44,
    borderRadius: RADIUS.full,
  },
  closeBtnText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
});
