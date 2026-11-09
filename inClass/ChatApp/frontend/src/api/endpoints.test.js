/**
 * Checks each endpoint function against the swagger contract: path, method,
 * query names (snake_case) and body field names.
 */
import { request } from './client';
import { createConversation, listConversations } from './conversations';
import { fetchServerLogs } from './debugLogs';
import { getFile, uploadFile } from './files';
import { testConnection } from './health';
import { listMessages, sendMessage } from './messages';
import { getProfile, listUsers } from './users';
import { ApiError } from './ApiError';

jest.mock('./client', () => ({ request: jest.fn(() => Promise.resolve('ok')) }));

beforeEach(() => request.mockClear());

describe('endpoints', () => {
  it('users', async () => {
    await getProfile({ userId: 'u2' });
    expect(request).toHaveBeenLastCalledWith('/user/profile', {
      query: { user_id: 'u2' },
      connection: undefined,
    });
    await listUsers({ isPoll: true });
    expect(request).toHaveBeenLastCalledWith('/user', { isPoll: true });
  });

  it('conversations', async () => {
    await listConversations();
    expect(request).toHaveBeenLastCalledWith('/conversation', { isPoll: false });
    await createConversation({ type: 'GROUP', name: 'study', participantIds: ['a', 'b'] });
    expect(request).toHaveBeenLastCalledWith('/conversation', {
      method: 'POST',
      body: { type: 'GROUP', name: 'study', participants_ids: ['a', 'b'] },
    });
  });

  it('messages', async () => {
    await listMessages('c1', { cursor: 'm9', isPoll: true });
    expect(request).toHaveBeenLastCalledWith('/message', {
      query: { conversation_id: 'c1', from_message_cursor: 'm9' },
      isPoll: true,
    });
    await sendMessage({ conversationId: 'c1', content: 'hi', fileId: 'f1' });
    expect(request).toHaveBeenLastCalledWith('/message', {
      method: 'POST',
      body: { conversation_id: 'c1', content: 'hi', file_id: 'f1' },
    });
  });

  it('files', async () => {
    await uploadFile({ fileName: 'a.jpg', mimeType: 'image/jpeg', data: 'xyz' });
    expect(request).toHaveBeenLastCalledWith('/file', {
      method: 'POST',
      body: { file_name: 'a.jpg', mime_type: 'image/jpeg', data: 'xyz' },
    });
    await getFile('id/../x');
    expect(request).toHaveBeenLastCalledWith('/file/id%2F..%2Fx');
  });

  it('server logs are tagged as polls', async () => {
    await fetchServerLogs({ after: 5, limit: 50 });
    expect(request).toHaveBeenLastCalledWith('/debug/logs', {
      query: { after: 5, limit: 50 },
      isPoll: true,
    });
  });
});

describe('testConnection', () => {
  it('is ok when the server answers, even with 401', async () => {
    request.mockRejectedValueOnce(new ApiError({ kind: 'http', status: 401, message: 'no' }));
    expect(await testConnection('http://a:3000')).toEqual({ ok: true });
    expect(request).toHaveBeenLastCalledWith('/user', {
      auth: false,
      connection: { baseUrl: 'http://a:3000' },
    });
  });

  it('fails with a friendly message when unreachable or broken', async () => {
    request.mockRejectedValueOnce(new ApiError({ kind: 'network', message: 'x' }));
    expect(await testConnection('http://a:3000')).toEqual({
      ok: false,
      message: expect.stringMatching(/reach/),
    });
    request.mockRejectedValueOnce(new ApiError({ kind: 'http', status: 503, message: 'x' }));
    expect((await testConnection('http://a:3000')).ok).toBe(false);
  });
});
