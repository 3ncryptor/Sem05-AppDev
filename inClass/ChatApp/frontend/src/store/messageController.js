/**
 * createMessageController: everything one open chat needs, in plain JS so
 * it is testable without React (buildPlan.md 8, Messages).
 *   loadInitial()  newest page
 *   poll()         newest page again, merged by id (new messages, new receipts)
 *   loadOlder()    the page before the oldest one shown (cursor)
 *   send(text)     optimistic: shows at once, confirmed or marked failed
 *   sendImage(p)   upload (POST /file) then send with file_id; same optimistic flow
 *   retry(id)      resend a failed message (an uploaded image is not uploaded twice)
 * Its state lives in a createStore store, read with useStore.
 */
import { friendlyMessage } from '../api/ApiError';
import { uploadFile } from '../api/files';
import { listMessages, sendMessage } from '../api/messages';
import {
  addLocal,
  confirmLocal,
  localId,
  mergeMessages,
  setLocalState,
} from '../hooks/messageList';
import { isTooLarge, toDataUri } from '../utils/fileData';
import { log } from '../utils/logger';
import { createRequestId } from '../utils/requestId';
import { createStore } from './createStore';
import { primeImage } from './imageCache';

const initialState = {
  messages: [], // newest first
  status: 'loading', // loading | ready | error
  error: '',
  nextCursor: null,
  isLoadingOlder: false,
  isLive: true, // last request to the server worked
  unseen: 0, // messages from others that arrived since markSeen()
};

/** @param {string} id */
const short = (id) => id.slice(-6);

/**
 * @param {{ conversationId: string, myId: string }} options
 */
export function createMessageController({ conversationId, myId }) {
  const store = createStore(initialState);
  const tag = `chat ${short(conversationId)}`;

  function apply({ list, added }) {
    const fromOthers = added.filter((message) => message.senderId !== myId).length;
    const fresh = added.map((message) => ({ ...message, isFresh: true }));
    const freshIds = new Set(fresh.map((message) => message.id));
    store.set((state) => ({
      messages: list.map((message) =>
        freshIds.has(message.id) ? fresh.find((item) => item.id === message.id) : message,
      ),
      unseen: state.unseen + fromOthers,
      isLive: true,
    }));
    return added.length;
  }

  async function loadInitial() {
    try {
      const page = await listMessages(conversationId);
      const { list } = mergeMessages([], page.data);
      store.set({
        messages: list,
        nextCursor: page.nextCursor ?? null,
        status: 'ready',
        error: '',
      });
      log.state(`${tag}: ${list.length} messages`);
    } catch (error) {
      store.set({ status: 'error', error: friendlyMessage(error), isLive: false });
    }
  }

  async function poll() {
    try {
      const page = await listMessages(conversationId, { isPoll: true });
      const count = apply(mergeMessages(store.get().messages, page.data));
      log.poll(`${tag}: ${count ? `+${count} new` : 'no change'}`, {
        isPoll: true,
        toConsole: count > 0,
      });
      if (store.get().status !== 'ready') store.set({ status: 'ready', error: '' });
    } catch {
      store.set({ isLive: false });
    }
  }

  async function loadOlder() {
    const { nextCursor, isLoadingOlder } = store.get();
    if (!nextCursor || isLoadingOlder) return;
    store.set({ isLoadingOlder: true });
    try {
      const page = await listMessages(conversationId, { cursor: nextCursor });
      const { list } = mergeMessages(store.get().messages, page.data);
      store.set({ messages: list, nextCursor: page.nextCursor ?? null });
      log.state(`${tag}: loaded ${page.data.length} older`);
    } catch (error) {
      log.warn(`${tag}: older messages failed: ${friendlyMessage(error)}`);
    } finally {
      store.set({ isLoadingOlder: false });
    }
  }

  function patchLocal(tempId, patch) {
    store.set((state) => ({
      messages: state.messages.map((message) =>
        message.id === tempId ? { ...message, ...patch } : message,
      ),
    }));
  }

  /** Uploads a local image once and remembers the file id for retries. */
  async function ensureUploaded(local) {
    if (local.fileId || !local.upload) return local.fileId;
    patchLocal(local.id, { uploadStage: 'uploading' });
    const file = await uploadFile(local.upload);
    primeImage(file.id, toDataUri(local.upload.mimeType, local.upload.data));
    patchLocal(local.id, { fileId: file.id, uploadStage: 'sending' });
    log.state(`${tag}: uploaded ${file.name} (${file.size} bytes)`);
    return file.id;
  }

  async function deliver(tempId) {
    const local = store.get().messages.find((message) => message.id === tempId);
    try {
      const fileId = await ensureUploaded(local);
      const saved = await sendMessage({
        conversationId,
        content: local.content || undefined,
        fileId,
      });
      store.set((state) => ({ messages: confirmLocal(state.messages, tempId, saved) }));
      return true;
    } catch (error) {
      store.set((state) => ({ messages: setLocalState(state.messages, tempId, 'failed') }));
      log.warn(`${tag}: send failed: ${friendlyMessage(error)}`);
      return false;
    }
  }

  function addLocalMessage(fields) {
    const local = {
      id: localId(createRequestId()),
      content: '',
      type: 'TEXT',
      senderId: myId,
      conversationId,
      createdAt: new Date().toISOString(),
      status: {},
      localState: 'sending',
      isFresh: true,
      ...fields,
    };
    store.set((state) => ({ messages: addLocal(state.messages, local) }));
    return local.id;
  }

  /**
   * @param {string} text
   * @returns {Promise<boolean>} whether the server accepted it
   */
  function send(text) {
    const content = text.trim();
    if (!content) return Promise.resolve(false);
    return deliver(addLocalMessage({ content }));
  }

  /**
   * @param {{ uri: string, data: string, mimeType: string, fileName: string }} photo
   * @returns {Promise<{ ok: boolean, error?: string }>}
   */
  async function sendImage({ uri, data, mimeType, fileName }) {
    if (isTooLarge(data)) return { ok: false, error: 'That photo is larger than 10 MB.' };
    const tempId = addLocalMessage({
      type: 'IMAGE',
      localUri: uri,
      upload: { fileName, mimeType, data },
      uploadStage: 'uploading',
    });
    return { ok: await deliver(tempId) };
  }

  /** @param {string} tempId a failed local message */
  function retry(tempId) {
    const message = store.get().messages.find((item) => item.id === tempId);
    if (!message || message.localState !== 'failed') return Promise.resolve(false);
    store.set((state) => ({ messages: setLocalState(state.messages, tempId, 'sending') }));
    return deliver(tempId);
  }

  function markSeen() {
    if (store.get().unseen) store.set({ unseen: 0 });
  }

  return { store, loadInitial, poll, loadOlder, send, sendImage, retry, markSeen };
}
