import { splitStack } from './splitStack';

describe('splitStack', () => {
  it('shows everyone when there are max or fewer', () => {
    expect(splitStack(['a', 'b'], 3)).toEqual({ shown: ['a', 'b'], extra: 0 });
    expect(splitStack(['a', 'b', 'c'], 3)).toEqual({ shown: ['a', 'b', 'c'], extra: 0 });
  });

  it('counts the rest as extra', () => {
    expect(splitStack(['a', 'b', 'c', 'd', 'e'], 3)).toEqual({ shown: ['a', 'b', 'c'], extra: 2 });
  });

  it('handles an empty or missing list', () => {
    expect(splitStack([], 3)).toEqual({ shown: [], extra: 0 });
    expect(splitStack(undefined, 3)).toEqual({ shown: [], extra: 0 });
  });

  it('does not change the input list', () => {
    const names = ['a', 'b', 'c', 'd'];
    splitStack(names, 3);
    expect(names).toEqual(['a', 'b', 'c', 'd']);
  });
});
