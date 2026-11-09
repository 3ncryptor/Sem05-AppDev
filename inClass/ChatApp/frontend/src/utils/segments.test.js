import { segmentWidth, selectedIndex } from './segments';

describe('segmentWidth', () => {
  it('splits the track evenly', () => {
    expect(segmentWidth(300, 3)).toBe(100);
  });

  it('returns 0 before the track is measured or with no options', () => {
    expect(segmentWidth(0, 3)).toBe(0);
    expect(segmentWidth(undefined, 3)).toBe(0);
    expect(segmentWidth(300, 0)).toBe(0);
  });
});

describe('selectedIndex', () => {
  const options = [{ value: 'local' }, { value: 'class' }];

  it('finds the selected option', () => {
    expect(selectedIndex(options, 'class')).toBe(1);
  });

  it('falls back to the first option for an unknown value', () => {
    expect(selectedIndex(options, 'nope')).toBe(0);
  });
});
