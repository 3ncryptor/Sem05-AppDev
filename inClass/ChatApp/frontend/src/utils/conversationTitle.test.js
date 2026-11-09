import {
  conversationTitle,
  indexById,
  listSignature,
  memberNames,
  otherParticipantId,
  splitConversations,
} from './conversationTitle';

const usersById = indexById([
  { id: 'me', name: 'aarav' },
  { id: 'u2', name: 'diya' },
  { id: 'u3', name: 'kabir' },
]);

const dm = {
  id: 'c1',
  type: 'DM',
  name: null,
  participants_ids: ['me', 'u2'],
  createdAt: '2026-01-01T00:00:00Z',
};
const group = {
  id: 'c2',
  type: 'GROUP',
  name: 'study',
  participants_ids: ['me', 'u2', 'u3'],
  createdAt: '2026-01-03T00:00:00Z',
};

describe('conversationTitle', () => {
  it('titles a DM after the other person', () => {
    expect(otherParticipantId(dm, 'me')).toBe('u2');
    expect(conversationTitle(dm, 'me', usersById)).toBe('diya');
  });

  it('uses the group name, or a fallback', () => {
    expect(conversationTitle(group, 'me', usersById)).toBe('study');
    expect(conversationTitle({ ...group, name: '  ' }, 'me', usersById)).toBe('untitled group');
  });

  it('falls back for unknown users and handles a DM with yourself', () => {
    expect(conversationTitle({ ...dm, participants_ids: ['me', 'zz'] }, 'me', usersById)).toBe(
      'unknown user',
    );
    expect(conversationTitle({ ...dm, participants_ids: ['me'] }, 'me', usersById)).toBe('aarav');
  });
});

describe('memberNames', () => {
  it('lists others first and me last', () => {
    expect(memberNames(group, 'me', usersById)).toEqual(['diya', 'kabir', 'aarav']);
  });
});

describe('splitConversations', () => {
  it('separates groups and DMs, newest first, without changing the input', () => {
    const older = { ...group, id: 'c0', createdAt: '2025-12-01T00:00:00Z' };
    const input = [older, dm, group];
    const { groups, dms } = splitConversations(input);
    expect(groups.map((g) => g.id)).toEqual(['c2', 'c0']);
    expect(dms.map((d) => d.id)).toEqual(['c1']);
    expect(input.map((c) => c.id)).toEqual(['c0', 'c1', 'c2']);
  });
});

describe('listSignature', () => {
  it('changes when a conversation is added or renamed', () => {
    const base = listSignature([dm, group]);
    expect(listSignature([dm, group])).toBe(base);
    expect(listSignature([dm])).not.toBe(base);
    expect(listSignature([dm, { ...group, name: 'other' }])).not.toBe(base);
  });
});
