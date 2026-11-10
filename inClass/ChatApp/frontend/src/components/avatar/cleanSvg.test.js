import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';
import * as notionists from '@dicebear/notionists';
import * as openPeeps from '@dicebear/open-peeps';
import { cleanAvatarSvg } from './cleanSvg';

const STYLES = { lorelei, notionists, 'open-peeps': openPeeps };

function countPaths(svg) {
  return (svg.match(/<path/g) ?? []).length;
}

describe('cleanAvatarSvg', () => {
  it.each(Object.keys(STYLES))('removes the mask and metadata from %s faces', (id) => {
    const raw = createAvatar(STYLES[id], { seed: 'aarav' }).toString();
    const clean = cleanAvatarSvg(raw);

    expect(raw).toMatch(/<mask/);
    expect(clean).not.toMatch(/<mask|mask=|<metadata|rdf:/);
    expect(clean.length).toBeLessThan(raw.length);
  });

  it.each(Object.keys(STYLES))('keeps every drawn path in %s faces', (id) => {
    const raw = createAvatar(STYLES[id], { seed: 'diya' }).toString();
    expect(countPaths(cleanAvatarSvg(raw))).toBe(countPaths(raw));
  });

  it('keeps the tags balanced, so the SVG still parses', () => {
    const clean = cleanAvatarSvg(createAvatar(lorelei, { seed: 'kabir' }).toString());
    const opened = (clean.match(/<g[\s>]/g) ?? []).length;
    const closed = (clean.match(/<\/g>/g) ?? []).length;
    expect(opened).toBe(closed);
    expect(clean).toMatch(/^<svg[\s\S]*<\/svg>$/);
  });

  it('is idempotent and leaves other SVGs alone', () => {
    const plain = '<svg viewBox="0 0 1 1"><path d="M0 0h1v1z"/></svg>';
    expect(cleanAvatarSvg(plain)).toBe(plain);
    const once = cleanAvatarSvg(createAvatar(notionists, { seed: 'meera' }).toString());
    expect(cleanAvatarSvg(once)).toBe(once);
  });
});
