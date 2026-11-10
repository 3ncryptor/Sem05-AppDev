import { groupByTime } from './logGroups';

const now = new Date(2026, 10, 10, 12, 30, 0).getTime();
const at = (secondsAgo, id) => ({ id, time: now - secondsAgo * 1000 });

describe('groupByTime', () => {
  it('groups newest first under readable headings', () => {
    const groups = groupByTime(
      [at(400, 'e'), at(130, 'd'), at(100, 'c'), at(20, 'b'), at(5, 'a')],
      now,
    );
    expect(groups.map((group) => group.title)).toEqual([
      'just now',
      '1 minute ago',
      '2 minutes ago',
      '12:23',
    ]);
    expect(groups[0].data.map((entry) => entry.id)).toEqual(['a', 'b']);
    expect(groups[1].data.map((entry) => entry.id)).toEqual(['c']);
  });

  it('returns nothing for no entries', () => {
    expect(groupByTime([], now)).toEqual([]);
  });
});
