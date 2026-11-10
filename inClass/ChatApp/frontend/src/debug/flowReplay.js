/**
 * flowReplay: the story of one request, one step per box it passed through
 * (buildPlan.md 15, flow replay). Each step has a plain sentence anyone can
 * follow and the exact technical fact under it. Never includes the password.
 */
import { describeOutcome, describeRow } from './describeRequest';
import { routeOf } from './flowPath';

function shortJson(value, max = 160) {
  if (value === undefined || value === null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function onScreen(row) {
  if (row.state === 'error') return 'The screen shows the problem and the app tries again later.';
  if (row.isPoll) return 'New items are merged in; if nothing changed, nothing redraws.';
  if (row.method === 'POST' && row.path.startsWith('/message')) {
    return "The message's clock turns into a tick.";
  }
  if (row.method === 'POST') return 'The new item appears on screen.';
  return 'The screen shows the data.';
}

/**
 * @param {object} row networkStore row
 * @param {{ name: string, baseUrl: string, serverLines: object[], hasServerLogs: boolean }} context
 * @returns {{ node: string, plain: string, technical: string, isReturn?: boolean,
 *   fromCode?: boolean }[]}
 */
export function replaySteps(row, { name, baseUrl, serverLines, hasServerLogs }) {
  const route = routeOf(row);
  const what = describeRow(row);
  const serverText = serverLines.map((line) => line.message).join('\n');
  const fromCode = !hasServerLogs;
  const outcome =
    row.state === 'ok'
      ? 'ok'
      : describeOutcome({
          status: row.status,
          kind: row.status ? 'http' : 'network',
          message: row.error,
        });

  const byNode = {
    screen: {
      plain: `You did something on the ${route.starter.screen} screen (or a timer did), so the app ${what}.`,
      technical: `started by ${route.starter.store}${row.isPoll ? ' (background poll)' : ''}`,
    },
    store: {
      plain: 'The store decides it needs fresh data from the server.',
      technical: `${route.starter.store} calls the api module`,
    },
    client: {
      plain: 'The api client writes the request: the address, who you are, and a tracking id.',
      technical: `${row.method} ${row.path} · Authorization: Basic ${name || '-'}:<hidden> · X-Request-Id: ${row.id}`,
    },
    http: {
      plain:
        route.stop === 'http'
          ? 'The request never reached the server (no connection, or it timed out).'
          : `The request travels over Wi-Fi to the server.`,
      technical: `${row.url ?? baseUrl + row.path}${row.requestBody ? ` · body ${shortJson(row.requestBody)}` : ''}`,
    },
    middleware: {
      plain: 'The server notes the tracking id, so its logs match this request.',
      technical: 'RequestContext (AsyncLocalStorage) · request logger',
    },
    guard: {
      plain:
        route.stop === 'guard'
          ? `The server checks the name and password. They are wrong, so it stops here.`
          : `The server checks the name and password. "${name || 'someone'}" is allowed in.`,
      technical: `AuthGuard · Basic auth${route.stop === 'guard' ? ` · ${row.status}` : ''}`,
    },
    controller: {
      plain:
        route.stop === 'controller'
          ? 'The server rejects the request: something in it is not valid.'
          : 'The server finds which feature this is for and checks the input.',
      technical: `${row.method} ${row.path.split('?')[0]} controller · DTO validation`,
    },
    service: {
      plain:
        route.stop === 'service'
          ? 'Something went wrong inside the server.'
          : 'The server does the work: who may see what, and what to save or send back.',
      technical: serverText || 'service layer (business rules)',
    },
    prisma: {
      plain: `The work becomes a database ${route.op === 'read' ? 'read' : 'write'}.`,
      technical: `Prisma Client · ${route.op === 'read' ? 'findMany / findUnique' : 'create / update'}`,
    },
  };

  const steps = route.down.map((node) => {
    if (byNode[node]) {
      const isServerSide = ['middleware', 'guard', 'controller', 'service', 'prisma'].includes(
        node,
      );
      return { node, ...byNode[node], fromCode: fromCode && isServerSide };
    }
    // a database collection
    return {
      node,
      plain:
        route.op === 'read'
          ? `MongoDB reads from ${node}.`
          : `MongoDB saves the new item into ${node}.`,
      technical: `collection ${node}`,
      fromCode,
    };
  });

  steps.push({
    node: 'client',
    isReturn: true,
    plain:
      row.state === 'pending'
        ? 'Waiting for the reply.'
        : row.state === 'ok'
          ? `The reply comes back in ${row.durationMs} ms: ${outcome}.`
          : `The reply is a problem: ${outcome}.`,
    technical: `${row.status ?? 'no status'} · ${row.durationMs ?? '-'} ms${row.responsePreview ? ` · ${shortJson(row.responsePreview)}` : ''}`,
  });
  steps.push({
    node: 'screen',
    isReturn: true,
    plain: onScreen(row),
    technical: 'store updates -> useStore re-renders the screen',
  });
  return steps;
}
