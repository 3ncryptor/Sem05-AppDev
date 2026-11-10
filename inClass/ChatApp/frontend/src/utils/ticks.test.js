import { receiptRows, tickState } from './ticks';

const base = { senderId: 'me' };
const status = (others) => ({ me: { delivered: true, read: true }, ...others });

describe('tickState', () => {
  it('passes local sending and failed states through', () => {
    expect(tickState({ ...base, localState: 'sending' })).toBe('sending');
    expect(tickState({ ...base, localState: 'failed' })).toBe('failed');
  });

  it('is sent while anyone has not received it', () => {
    const message = {
      ...base,
      status: status({ a: { delivered: true, read: false }, b: { delivered: false, read: false } }),
    };
    expect(tickState(message)).toBe('sent');
  });

  it('is delivered when everyone has it and read when everyone read it', () => {
    expect(tickState({ ...base, status: status({ a: { delivered: true, read: false } }) })).toBe(
      'delivered',
    );
    expect(
      tickState({
        ...base,
        status: status({ a: { delivered: true, read: true }, b: { delivered: true, read: true } }),
      }),
    ).toBe('read');
  });

  it('is sent with no other members or no status (class server edge cases)', () => {
    expect(tickState({ ...base, status: status({}) })).toBe('sent');
    expect(tickState(base)).toBe('sent');
  });
});

describe('receiptRows', () => {
  it('lists every other member with a name and state', () => {
    const message = {
      ...base,
      status: status({
        a: { delivered: true, read: true },
        b: { delivered: true, read: false },
        c: {},
      }),
    };
    expect(receiptRows(message, { a: { name: 'diya' }, b: { name: 'kabir' } })).toEqual([
      { id: 'a', name: 'diya', state: 'read' },
      { id: 'b', name: 'kabir', state: 'delivered' },
      { id: 'c', name: 'unknown user', state: 'sent' },
    ]);
  });
});

describe('bubbleLabel', () => {
  const { bubbleLabel } = jest.requireActual('./ticks');

  it('speaks who, what, when and the tick state', () => {
    expect(
      bubbleLabel({
        isMine: true,
        senderName: 'aarav',
        content: 'hi',
        type: 'TEXT',
        time: '7:55 pm',
        ticks: 'read',
      }),
    ).toBe('you: hi, 7:55 pm, read');
    expect(
      bubbleLabel({
        isMine: false,
        senderName: 'diya',
        content: '',
        type: 'IMAGE',
        time: '8:00 am',
        ticks: null,
      }),
    ).toBe('diya: photo, 8:00 am');
    expect(bubbleLabel({ isMine: true, senderName: 'x', time: '', ticks: 'failed' })).toBe(
      'you: message, not sent',
    );
  });
});
