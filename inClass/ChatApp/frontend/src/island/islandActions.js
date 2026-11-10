/**
 * islandActions: carries out what a touch on the island meant (the intent
 * from islandGestures). One place, so taps, swipes and TalkBack actions all
 * do exactly the same thing. Haptics fire here, once per committed action.
 */
import { router } from 'expo-router';
import { openInspector, setInspectorTab } from '../debug/inspectorStore';
import { markChatRead } from '../inbox/inboxStore';
import { haptics } from '../utils/haptics';
import { log } from '../utils/logger';
import {
  clearConfirm,
  closeGlance,
  collapseIsland,
  dismissActivity,
  expandIsland,
  openGlance,
} from './islandStore';

/** @param {string} chatId */
export function openChatFromIsland(chatId) {
  closeGlance();
  log.nav(`island -> chat/${chatId}`);
  router.push(`/chat/${chatId}`);
}

/**
 * @param {string | null} intent from swipeIntent / tapIntent, or 'inspector'
 * @param {object | null} main the main activity, if any
 */
export function runIslandIntent(intent, main) {
  switch (intent) {
    case 'glance':
      haptics.tap();
      openGlance();
      return;
    case 'closeGlance':
      closeGlance();
      return;
    case 'skip':
      clearConfirm();
      return;
    case 'inspector':
      haptics.select();
      openInspector('island');
      return;
    case 'network':
      openInspector('island');
      setInspectorTab('network');
      return;
    case 'collapse':
      collapseIsland();
      return;
    case 'expand':
      haptics.tap();
      if (main) expandIsland(main.key);
      return;
    default:
      break;
  }
  if (main) runActivityIntent(intent, main);
}

function runActivityIntent(intent, main) {
  switch (intent) {
    case 'open':
      if (!main.chatId) return;
      dismissActivity(main.key);
      openChatFromIsland(main.chatId);
      return;
    case 'retry':
      main.onPress?.();
      dismissActivity(main.key);
      return;
    case 'markRead':
      haptics.tap();
      if (main.chatId) markChatRead(main.chatId);
      dismissActivity(main.key);
      log.state(`island: marked ${main.title} read`);
      return;
    case 'dismiss':
      dismissActivity(main.key);
      return;
    default:
  }
}
