/**
 * jsonTree: turns a JSON value into the rows of a collapsible tree view (the
 * network tab's payload and response, like devtools). Pure, so it is tested.
 *
 * Paths look like "$.data[0].content". A branch shows its children only when
 * its path is in `expanded`. With a search term, every matching key or value
 * is shown together with its parents, whatever is folded.
 */

const MAX_PREVIEW = 80;

function kindOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value !== null && typeof value === 'object') return 'object';
  return 'value';
}

function previewOf(value) {
  const text = JSON.stringify(value) ?? String(value);
  return text.length > MAX_PREVIEW ? `${text.slice(0, MAX_PREVIEW)}...` : text;
}

function childrenOf(value, path) {
  if (Array.isArray(value)) {
    return value.map((item, index) => ({
      key: `[${index}]`,
      segment: index,
      value: item,
      path: `${path}[${index}]`,
    }));
  }
  return Object.entries(value).map(([key, item]) => ({
    key,
    segment: key,
    value: item,
    path: `${path}.${key}`,
  }));
}

function matches(key, value, term) {
  const isLeaf = kindOf(value) === 'value';
  return (
    key.toLowerCase().includes(term) || (isLeaf && previewOf(value).toLowerCase().includes(term))
  );
}

/** True when this node or anything under it matches. */
function containsMatch(key, value, term) {
  if (matches(key, value, term)) return true;
  if (kindOf(value) === 'value') return false;
  return childrenOf(value, '').some((child) => containsMatch(child.key, child.value, term));
}

/**
 * @param {unknown} value
 * @param {Set<string>} expanded paths that are open
 * @param {string} [search]
 * @returns {{ path: string, key: string, depth: number, kind: 'object' | 'array' | 'value',
 *   preview: string, childCount: number, isExpanded: boolean, isMatch: boolean,
 *   segments: (string | number)[] }[]} segments: the exact keys from the root (for lookups)
 */
export function flattenJson(value, expanded, search = '') {
  const term = search.trim().toLowerCase();
  const rows = [];

  function visit(key, item, path, depth, segments) {
    if (term && depth > 0 && !containsMatch(key, item, term)) return;
    const kind = kindOf(item);
    const children = kind === 'value' ? [] : childrenOf(item, path);
    const isExpanded = kind !== 'value' && (term ? true : expanded.has(path));
    rows.push({
      path,
      key,
      depth,
      kind,
      preview: kind === 'value' ? previewOf(item) : '',
      childCount: children.length,
      isExpanded,
      isMatch: Boolean(term) && depth > 0 && matches(key, item, term),
      segments,
    });
    if (isExpanded)
      children.forEach((child) =>
        visit(child.key, child.value, child.path, depth + 1, [...segments, child.segment]),
      );
  }

  visit('$', value, '$', 0, []);
  return rows;
}

/**
 * @param {Set<string>} expanded
 * @param {string} path
 * @returns {Set<string>} a new set
 */
export function toggleExpanded(expanded, path) {
  const next = new Set(expanded);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  return next;
}
