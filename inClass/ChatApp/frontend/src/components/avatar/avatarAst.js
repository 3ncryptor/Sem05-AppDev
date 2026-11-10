/**
 * avatarAst: the parsed form of a face, cached (buildPlan.md 13, V0).
 *
 * `SvgXml` parses its XML string every time an avatar mounts, so scrolling
 * Chats or People re-parsed the same 4 to 11 KB face again and again. Here
 * each (style, name) is parsed once and `SvgAst` draws the cached tree.
 * React elements are immutable, so one tree can be shared by every avatar.
 */
import { parse } from 'react-native-svg';
import { log } from '../../utils/logger';
import { avatarSvg, DEFAULT_AVATAR_STYLE } from './avatarSvg';

/** Same bound as the string cache: a class of 200 in all three styles. */
const MAX_AST_ENTRIES = 600;

const astCache = new Map();

/**
 * @param {string} name username (the seed)
 * @param {string} [styleId]
 * @returns {object | null} a react-native-svg JSX tree, or null if parsing failed
 */
export function avatarAst(name, styleId = DEFAULT_AVATAR_STYLE) {
  const key = `${styleId}:${name ?? ''}`;
  if (astCache.has(key)) return astCache.get(key);

  let ast = null;
  try {
    ast = parse(avatarSvg(name, styleId));
  } catch (error) {
    log.warn(`avatar for "${name}" could not be drawn: ${String(error)}`);
  }
  if (astCache.size >= MAX_AST_ENTRIES) astCache.clear();
  astCache.set(key, ast);
  return ast;
}

/** Test helper: empties the parsed-face cache. */
export function clearAvatarAstCache() {
  astCache.clear();
}
