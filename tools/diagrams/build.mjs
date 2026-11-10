#!/usr/bin/env node
/**
 * Builds the animated architecture figures used in the READMEs.
 *
 *   node tools/diagrams/build.mjs          writes every figure (light and dark SVG)
 *
 * Each spec in ./specs describes boxes, groups, edges and the dots that travel
 * along edges. This script turns one spec into two self-contained SVG files:
 * <out>-light.svg and <out>-dark.svg. The animation is SMIL (<animateMotion>)
 * inside the SVG, so it plays when GitHub shows the file through an <img> tag.
 * Under prefers-reduced-motion the dots are hidden and the still figure stays.
 *
 * No dependencies: plain Node.js (18 or newer).
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { THEMES } from './theme.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const SPEC_DIR = join(HERE, 'specs');
// Optional filter: `node tools/diagrams/build.mjs chat-system` builds one spec.
const only = process.argv[2];
const SPECS = await Promise.all(
  readdirSync(SPEC_DIR)
    .filter((file) => file.endsWith('.mjs') && (!only || file === `${only}.mjs`))
    .sort()
    .map(async (file) => (await import(pathToFileURL(join(SPEC_DIR, file)).href)).default),
);

const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const escapeXml = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pathFromPoints = (points) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');

function styleBlock(theme, layers) {
  const layerRules = Object.entries(layers)
    .map(([name, colours]) => {
      const c = colours[theme.name];
      return [
        `.box.${name}{fill:${c.fill};stroke:${c.stroke}}`,
        `.group.${name}{stroke:${c.stroke}}`,
        `.title.${name}{fill:${c.text}}`,
        `.dot.${name}{fill:${c.stroke}}`,
        `.swatch.${name}{fill:${c.fill};stroke:${c.stroke}}`,
      ].join('');
    })
    .join('');
  return `<style>
.bg{fill:${theme.canvas};stroke:${theme.frame}}
.box{stroke-width:1.4}
.box.dashed,.edge.dashed,.group.dashed{stroke-dasharray:6 5}
.group{fill:none;stroke-width:1.2}
.glabel{font:600 13px ${FONT_SANS};fill:${theme.ink}}
.gsub{font:400 11.5px ${FONT_SANS};fill:${theme.inkSoft}}
.title{font:600 13.5px ${FONT_SANS}}
.line{font:400 11.5px ${FONT_MONO};fill:${theme.inkSoft}}
.heading{font:700 17px ${FONT_SANS};fill:${theme.ink}}
.caption{font:400 12.5px ${FONT_SANS};fill:${theme.inkSoft}}
.edge{fill:none;stroke:${theme.edge};stroke-width:1.5}
.elabel{font:400 11px ${FONT_MONO};fill:${theme.ink}}
.elabel-bg{fill:${theme.canvas};opacity:.92}
.arrow{fill:${theme.edge}}
.legend{font:400 11.5px ${FONT_SANS};fill:${theme.inkSoft}}
.dot{stroke:${theme.canvas};stroke-width:1.5}
${layerRules}
@media (prefers-reduced-motion: reduce){.dot{display:none}}
</style>`;
}

function renderGroup(group) {
  const cls = ['group', group.layer ?? 'network', group.dashed ? 'dashed' : ''].join(' ').trim();
  // labelOffset moves the label right when an edge enters the group at its top-left corner.
  const lx = group.x + (group.labelOffset ?? 14);
  const sub = group.sub
    ? `<text class="gsub" x="${lx}" y="${group.y + 38}">${escapeXml(group.sub)}</text>`
    : '';
  return `<g><rect class="${cls}" x="${group.x}" y="${group.y}" width="${group.w}" height="${group.h}" rx="14"/>
<text class="glabel" x="${lx}" y="${group.y + 21}">${escapeXml(group.label)}</text>${sub}</g>`;
}

function renderNode(node) {
  const cls = ['box', node.layer, node.dashed ? 'dashed' : ''].join(' ').trim();
  const lines = (node.lines ?? [])
    .map(
      (line, i) =>
        `<text class="line" x="${node.x + 12}" y="${node.y + 42 + i * 16}">${escapeXml(line)}</text>`,
    )
    .join('');
  return `<g><rect class="${cls}" x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="9"/>
<text class="title ${node.layer}" x="${node.x + 12}" y="${node.y + 22}">${escapeXml(node.title)}</text>${lines}</g>`;
}

function renderEdgeLabel(edge) {
  if (!edge.label) return '';
  const labels = Array.isArray(edge.label) ? edge.label : [edge.label];
  const [x, y] = edge.labelAt;
  const width = Math.max(...labels.map((l) => l.length)) * 6.7 + 10;
  const height = labels.length * 14 + 6;
  const anchorX = edge.labelAlign === 'start' ? x : x - width / 2;
  const textX = edge.labelAlign === 'start' ? x + 5 : x;
  const anchor = edge.labelAlign === 'start' ? 'start' : 'middle';
  const texts = labels
    .map(
      (label, i) =>
        `<text class="elabel" text-anchor="${anchor}" x="${textX}" y="${y + 13 + i * 14}">${escapeXml(label)}</text>`,
    )
    .join('');
  return `<rect class="elabel-bg" x="${anchorX}" y="${y}" width="${width}" height="${height}" rx="4"/>${texts}`;
}

function renderEdge(edge, markerId) {
  const d = edge.d ?? pathFromPoints(edge.points);
  const cls = ['edge', edge.dashed ? 'dashed' : ''].join(' ').trim();
  const start = edge.arrow === 'both' ? ` marker-start="url(#${markerId}-start)"` : '';
  const end = edge.arrow === 'none' ? '' : ` marker-end="url(#${markerId})"`;
  return `<path id="${edge.id}" class="${cls}" d="${d}"${start}${end}/>`;
}

/**
 * A dot that travels one edge, then waits, then repeats every `period` seconds.
 * `travel` is how long the trip takes; `begin` offsets the first trip.
 */
function renderFlow(flow) {
  const period = flow.period;
  const travel = Math.min(flow.travel ?? 1.6, period);
  const t = (travel / period).toFixed(4);
  const tHide = Math.min(1, travel / period + 0.0001).toFixed(4);
  const points = flow.reverse ? '1;0;0' : '0;1;1';
  const href = `#${flow.edge}`;
  // A one-off event (the bundle download) plays once and then stays hidden.
  const repeat = flow.once ? '1' : 'indefinite';
  const fill = flow.once ? ' fill="freeze"' : '';
  return `<circle class="dot ${flow.layer}" r="${flow.r ?? 5.5}" cx="0" cy="0" opacity="0">
<animateMotion dur="${period}s" begin="${flow.begin ?? 0}s" repeatCount="${repeat}"${fill} calcMode="spline" keyPoints="${points}" keyTimes="0;${t};1" keySplines="0.45 0 0.25 1;0 0 1 1"><mpath href="${href}" xlink:href="${href}"/></animateMotion>
<animate attributeName="opacity" dur="${period}s" begin="${flow.begin ?? 0}s" repeatCount="${repeat}"${fill} values="1;1;0;0" keyTimes="0;${t};${tHide};1"/>
</circle>`;
}

function renderLegend(spec, theme) {
  const y = spec.height - 30;
  let x = 28;
  const parts = [];
  for (const [layer, label] of spec.legend) {
    parts.push(
      `<rect class="swatch ${layer}" x="${x}" y="${y - 10}" width="14" height="14" rx="3" stroke-width="1.3"/>`,
      `<text class="legend" x="${x + 20}" y="${y + 1.5}">${escapeXml(label)}</text>`,
    );
    x += 30 + label.length * 6.6;
  }
  parts.push(
    `<line x1="${x}" y1="${y - 3}" x2="${x + 26}" y2="${y - 3}" stroke="${theme.edge}" stroke-width="1.5" stroke-dasharray="6 5"/>`,
    `<text class="legend" x="${x + 32}" y="${y + 1.5}">${escapeXml(spec.dashedMeaning ?? 'optional or local only')}</text>`,
  );
  x += 50 + (spec.dashedMeaning ?? 'optional or local only').length * 6.6;
  parts.push(
    `<circle cx="${x + 6}" cy="${y - 3}" r="5" fill="${theme.edge}"/>`,
    `<text class="legend" x="${x + 18}" y="${y + 1.5}">${escapeXml(spec.dotMeaning ?? 'data in flight')}</text>`,
  );
  return parts.join('');
}

function render(spec, theme) {
  const markerId = `arrow-${spec.id}`;
  const heading = spec.heading
    ? `<text class="heading" x="28" y="40">${escapeXml(spec.heading)}</text>`
    : '';
  const caption = spec.caption
    ? `<text class="caption" x="28" y="62">${escapeXml(spec.caption)}</text>`
    : '';
  const extraText = (spec.notes ?? [])
    .map(
      (note) =>
        `<text class="${note.mono ? 'line' : 'caption'}" x="${note.x}" y="${note.y}"${note.anchor ? ` text-anchor="${note.anchor}"` : ''}>${escapeXml(note.text)}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${spec.width} ${spec.height}" width="${spec.width}" height="${spec.height}" role="img" aria-labelledby="title-${spec.id} desc-${spec.id}">
<title id="title-${spec.id}">${escapeXml(spec.title)}</title>
<desc id="desc-${spec.id}">${escapeXml(spec.desc)}</desc>
${styleBlock(theme, THEMES.layers)}
<defs>
<marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0 0 L10 5 L0 10 z"/></marker>
<marker id="${markerId}-start" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0 0 L10 5 L0 10 z"/></marker>
</defs>
<rect class="bg" x="0.5" y="0.5" width="${spec.width - 1}" height="${spec.height - 1}" rx="16"/>
${heading}${caption}
${spec.groups.map(renderGroup).join('\n')}
${spec.edges.map((edge) => renderEdge(edge, markerId)).join('\n')}
${spec.nodes.map(renderNode).join('\n')}
${spec.edges.map(renderEdgeLabel).join('\n')}
${extraText}
${spec.flows.map(renderFlow).join('\n')}
${renderLegend(spec, theme)}
</svg>
`;
}

function checkSpec(spec) {
  const edgeIds = new Set(spec.edges.map((edge) => edge.id));
  for (const flow of spec.flows) {
    if (!edgeIds.has(flow.edge)) throw new Error(`${spec.id}: flow uses unknown edge ${flow.edge}`);
  }
  for (const node of spec.nodes) {
    const right = node.x + node.w;
    const bottom = node.y + node.h;
    if (right > spec.width || bottom > spec.height) throw new Error(`${spec.id}: node ${node.title} is outside the canvas`);
  }
}

for (const spec of SPECS) {
  checkSpec(spec);
  for (const theme of [THEMES.light, THEMES.dark]) {
    const file = join(ROOT, `${spec.out}-${theme.name}.svg`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, render(spec, theme));
    console.log(`wrote ${relative(ROOT, file)}`);
  }
}
