import { flattenJson, toggleExpanded } from './jsonTree';

const data = {
  data: [
    { id: 'm1', content: 'hi' },
    { id: 'm2', content: 'yo' },
  ],
  count: 2,
};

describe('flattenJson', () => {
  it('shows the root and its first level, folded below that', () => {
    const rows = flattenJson(data, new Set(['$']));
    expect(rows.map((row) => `${row.depth}:${row.key}`)).toEqual(['0:$', '1:data', '1:count']);
    expect(rows[1]).toMatchObject({ kind: 'array', childCount: 2, isExpanded: false });
    expect(rows[2]).toMatchObject({ kind: 'value', preview: '2' });
  });

  it('opens a branch when its path is expanded', () => {
    const rows = flattenJson(data, new Set(['$', '$.data', '$.data[0]']));
    expect(rows.map((row) => row.path)).toEqual([
      '$',
      '$.data',
      '$.data[0]',
      '$.data[0].id',
      '$.data[0].content',
      '$.data[1]',
      '$.count',
    ]);
    expect(rows[4]).toMatchObject({ preview: '"hi"', depth: 3, segments: ['data', 0, 'content'] });
  });

  it('with a search, shows every match with its parents', () => {
    const rows = flattenJson(data, new Set(['$']), 'yo');
    expect(rows.map((row) => row.path)).toEqual(['$', '$.data', '$.data[1]', '$.data[1].content']);
    expect(rows.at(-1).isMatch).toBe(true);
  });

  it('handles plain values and empty containers', () => {
    expect(flattenJson('text', new Set(['$']))[0]).toMatchObject({
      kind: 'value',
      preview: '"text"',
    });
    expect(flattenJson({}, new Set(['$']))[0]).toMatchObject({ kind: 'object', childCount: 0 });
    expect(flattenJson(null, new Set(['$']))[0].preview).toBe('null');
  });
});

describe('toggleExpanded', () => {
  it('returns a new set with the path flipped', () => {
    const before = new Set(['$']);
    const after = toggleExpanded(before, '$.data');
    expect(after.has('$.data')).toBe(true);
    expect(before.has('$.data')).toBe(false);
    expect(toggleExpanded(after, '$.data').has('$.data')).toBe(false);
  });
});
