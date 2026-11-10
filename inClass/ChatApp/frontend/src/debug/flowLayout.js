/**
 * flowLayout: where every box of the architecture map sits on a phone-width,
 * top-to-bottom diagram (buildPlan.md 15, flow tab). Pure numbers, tested.
 *
 *   FRONTEND   [screen] [store / hook] [api client]
 *   NETWORK            [   HTTP over Wi-Fi   ]
 *   BACKEND    [middleware]        [AuthGuard]
 *              [controller]        [service]
 *                       [ Prisma ]
 *   DATABASE   [users] [conversations] [messages] [files]
 */

export const BAND_LABEL = 22;
const BAND_GAP = 14;
const ROW_GAP = 10;
const COLUMN_GAP = 8;
const NODE_HEIGHT = 46;
const COLLECTION_HEIGHT = 64;

const ROWS = [
  { band: 'frontend', nodes: ['screen', 'store', 'client'] },
  { band: 'network', nodes: ['http'], span: 0.7 },
  { band: 'backend', nodes: ['middleware', 'guard'] },
  { band: 'backend', nodes: ['controller', 'service'] },
  { band: 'backend', nodes: ['prisma'], span: 0.5 },
  { band: 'database', nodes: ['users', 'conversations', 'messages', 'files'], tall: true },
];

/**
 * @param {number} width available width
 * @returns {{ nodes: Record<string, { x: number, y: number, w: number, h: number }>,
 *   bands: { id: string, y: number, h: number }[], height: number }}
 */
export function flowLayout(width) {
  const nodes = {};
  const bands = [];
  let y = 0;
  let currentBand = null;

  ROWS.forEach((row) => {
    if (row.band !== currentBand) {
      if (currentBand) y += BAND_GAP;
      bands.push({ id: row.band, y, h: 0 });
      y += BAND_LABEL;
      currentBand = row.band;
    } else {
      y += ROW_GAP;
    }
    const h = row.tall ? COLLECTION_HEIGHT : NODE_HEIGHT;
    const rowWidth = width * (row.span ?? 1);
    const left = (width - rowWidth) / 2;
    const count = row.nodes.length;
    const w = (rowWidth - COLUMN_GAP * (count - 1)) / count;
    row.nodes.forEach((id, index) => {
      nodes[id] = { x: left + index * (w + COLUMN_GAP), y, w, h };
    });
    y += h;
    const band = bands.at(-1);
    band.h = y - band.y;
  });

  return { nodes, bands, height: y };
}

/**
 * Centre point of a box.
 * @param {{ x: number, y: number, w: number, h: number }} box
 */
export function centerOf(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

/**
 * The polyline a packet follows through these boxes, with the cumulative
 * length at each point (so it can move at an even speed).
 * @param {string[]} route node ids in order
 * @param {Record<string, { x: number, y: number, w: number, h: number }>} nodes
 * @returns {{ xs: number[], ys: number[], lengths: number[], total: number }}
 */
export function routePolyline(route, nodes) {
  const points = route.filter((id) => nodes[id]).map((id) => centerOf(nodes[id]));
  const lengths = [0];
  for (let index = 1; index < points.length; index += 1) {
    const dx = points[index].x - points[index - 1].x;
    const dy = points[index].y - points[index - 1].y;
    lengths.push(lengths[index - 1] + Math.hypot(dx, dy));
  }
  return {
    xs: points.map((point) => point.x),
    ys: points.map((point) => point.y),
    lengths,
    total: lengths.at(-1) ?? 0,
  };
}
