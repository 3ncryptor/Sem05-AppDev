/**
 * Haptic feedback with one place to change the feel. Failures (for example
 * on a simulator without a haptic engine) are ignored on purpose: a missing
 * vibration must never break a tap.
 */
import * as Haptics from 'expo-haptics';

function safely(promise) {
  promise?.catch?.(() => {});
}

export const haptics = {
  /** Light tap for ordinary presses. */
  tap: () => safely(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Medium tap for long-press and selection. */
  select: () => safely(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safely(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safely(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
