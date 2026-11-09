import {
  addLocal,
  confirmLocal,
  isLocal,
  localId,
  mergeMessages,
  runPosition,
  setLocalState,
} from './messageList';

const msg = (id, minute, senderId = 'a', extra = {}) => ({
  id,
  senderId,
  createdAt: `2026-01-01T10:${String(minute).padStart(2, '0')}:00Z`,
  ...extra,
});

describe('mergeMessages', () => {
  it('adds new messages newest first and reports them', () => {
    const { list, added } = mergeMessages(
      [msg('m1', 1)],
      [msg('m1', 1), msg('m3', 3), msg('m2', 2)],
    );
    expect(list.map((m) => m.id)).toEqual(['m3', 'm2', 'm1']);
    expect(added.map((m) => m.id)).toEqual(['m3', 'm2']);
  });

  it('never duplicates and replaces known messages (new receipts)', () => {
    const old = msg('m1', 1, 'a', { status: { b: { read: false } } });
    const fresh = msg('m1', 1, 'a', { status: { b: { read: true } } });
    const { list, added } = mergeMessages([old], [fresh]);
    expect(list).toEqual([fresh]);
    expect(added).toEqual([]);
  });

  it('keeps local messages', () => {
    const local = msg(localId('x'), 9, 'me', { localState: 'sending' });
    const { list } = mergeMessages([local], [msg('m1', 1)]);
    expect(list.map((m) => m.id)).toEqual([local.id, 'm1']);
  });

  it('merges an older page below the current one', () => {
    const { list } = mergeMessages([msg('m5', 5), msg('m4', 4)], [msg('m1', 1), msg('m2', 2)]);
    expect(list.map((m) => m.id)).toEqual(['m5', 'm4', 'm2', 'm1']);
  });
});

describe('local messages', () => {
  const temp = msg(localId('t1'), 5, 'me', { localState: 'sending' });

  it('adds at the bottom, then gets confirmed by the server copy', () => {
    const list = addLocal([msg('m1', 1)], temp);
    expect(list[0]).toBe(temp);
    expect(isLocal(temp)).toBe(true);
    const confirmed = confirmLocal(list, temp.id, msg('m9', 5, 'me'));
    expect(confirmed.map((m) => m.id)).toEqual(['m9', 'm1']);
  });

  it('drops the local copy when a poll already delivered the server copy', () => {
    const list = [msg('m9', 5, 'me'), temp, msg('m1', 1)];
    expect(confirmLocal(list, temp.id, msg('m9', 5, 'me')).map((m) => m.id)).toEqual(['m9', 'm1']);
  });

  it('marks a failed send', () => {
    expect(setLocalState([temp], temp.id, 'failed')[0].localState).toBe('failed');
    expect(temp.localState).toBe('sending');
  });
});

describe('runPosition', () => {
  // newest first: b2 (bottom), b1, a2, a1 (top)
  const list = [msg('b2', 4, 'b'), msg('b1', 3, 'b'), msg('a2', 2, 'a'), msg('a1', 1, 'a')];

  it('marks the bottom bubble of a run as last and the top as first', () => {
    expect(runPosition(list, 0)).toEqual({ isLastInRun: true, isFirstInRun: false });
    expect(runPosition(list, 1)).toEqual({ isLastInRun: false, isFirstInRun: true });
    expect(runPosition(list, 2)).toEqual({ isLastInRun: true, isFirstInRun: false });
    expect(runPosition(list, 3)).toEqual({ isLastInRun: false, isFirstInRun: true });
  });
});
