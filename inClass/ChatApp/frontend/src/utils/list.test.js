import { appendCapped, updateById } from './list';

describe('appendCapped', () => {
  it('appends without changing the input', () => {
    const list = [1, 2];
    expect(appendCapped(list, 3, 5)).toEqual([1, 2, 3]);
    expect(list).toEqual([1, 2]);
  });

  it('drops the oldest items past the cap', () => {
    expect(appendCapped([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });
});

describe('updateById', () => {
  it('merges the patch into the matching item only', () => {
    const list = [
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'pending' },
    ];
    expect(updateById(list, 'b', { status: 'ok' })).toEqual([
      { id: 'a', status: 'pending' },
      { id: 'b', status: 'ok' },
    ]);
    expect(list[1].status).toBe('pending');
  });

  it('leaves the list as is for an unknown id', () => {
    expect(updateById([{ id: 'a' }], 'z', { x: 1 })).toEqual([{ id: 'a' }]);
  });
});
