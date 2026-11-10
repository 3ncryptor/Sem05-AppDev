/**
 * RequestDetail: one request, opened from the network list, like a browser's
 * devtools (buildPlan.md 15, screen 5). Six views: summary, headers, payload,
 * response, timing, server; and actions: replay in flow, copy as cURL (the
 * password is never included), copy response, resend (GET only, so nothing
 * is ever posted twice by accident).
 */
import * as Clipboard from 'expo-clipboard';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { request } from '../../api/client';
import { fonts, gradient, radius, space } from '../../constants/theme';
import { describeOutcome, describeRow } from '../../debug/describeRequest';
import { routeOf } from '../../debug/flowPath';
import { closeRequest, replayInFlow } from '../../debug/inspectorStore';
import { timingParts, toCurl } from '../../debug/networkDetail';
import { useTheme } from '../../hooks/useTheme';
import { islandCopied } from '../../island/islandEvents';
import { formatLogTime } from '../../utils/format';
import { log } from '../../utils/logger';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { InspectorChip } from './InspectorChip';
import { JsonTreeView } from './JsonTreeView';

const VIEWS = ['summary', 'headers', 'payload', 'response', 'timing', 'server'];

function Field({ label, value, mono = true }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textOnSlabMuted }]}>{label}</Text>
      <Text
        style={[
          styles.fieldValue,
          { color: colors.textOnSlab, fontFamily: mono ? fonts.mono : fonts.regular },
        ]}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

function HeaderList({ title, headers }) {
  const { colors } = useTheme();
  const entries = Object.entries(headers ?? {});
  return (
    <View style={[styles.card, { backgroundColor: colors.slabRaised }]}>
      <Text style={[styles.cardTitle, { color: colors.textOnSlab }]}>{title}</Text>
      {entries.length ? (
        entries.map(([key, value]) => <Field key={key} label={key} value={String(value)} />)
      ) : (
        <Text style={[styles.note, { color: colors.textOnSlabMuted }]}>none recorded</Text>
      )}
    </View>
  );
}

function TimingView({ row }) {
  const { colors } = useTheme();
  const { waitingMs, downloadMs } = timingParts(row);
  const total = Math.max(1, waitingMs + downloadMs);
  const bar = (label, ms, color) => (
    <View style={styles.timingRow}>
      <Text style={[styles.timingLabel, { color: colors.textOnSlabMuted }]}>{label}</Text>
      <View style={[styles.timingTrack, { backgroundColor: colors.slab }]}>
        <View
          style={[styles.timingFill, { width: `${(ms / total) * 100}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.timingMs, { color: colors.textOnSlab }]}>{ms} ms</Text>
    </View>
  );
  return (
    <View style={[styles.card, { backgroundColor: colors.slabRaised }]}>
      <Text style={[styles.plain, { color: colors.textOnSlab }]}>
        {row.state === 'pending'
          ? 'Still waiting for the server.'
          : `The server took ${waitingMs} ms to start answering, then the reply took ${downloadMs} ms to arrive.`}
      </Text>
      {bar('waiting for the server', waitingMs, gradient.colors[0])}
      {bar('downloading the reply', downloadMs, gradient.colors[2])}
      <Text style={[styles.note, { color: colors.textOnSlabMuted }]}>
        started {formatLogTime(row.startedAt)} · total {row.durationMs ?? '-'} ms · size{' '}
        {row.bytes === undefined ? '-' : `${(row.bytes / 1024).toFixed(1)} KB`}
      </Text>
    </View>
  );
}

function ServerView({ lines }) {
  const { colors } = useTheme();
  if (!lines.length) {
    return (
      <Text style={[styles.note, { color: colors.textOnSlabMuted }]}>
        No server lines for this request. The local server shares its logs; the class server does
        not.
      </Text>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: colors.slabRaised }]}>
      {lines.map((line) => (
        <Text key={line.id} style={[styles.serverLine, { color: colors.textOnSlab }]} selectable>
          <Text style={{ color: colors.textOnSlabMuted }}>{formatLogTime(line.time)} </Text>
          {line.category.toLowerCase()} {line.message}
        </Text>
      ))}
    </View>
  );
}

/**
 * @param {object} props
 * @param {object} props.row networkStore row
 * @param {object[]} props.serverLines server log lines with this request id
 */
export function RequestDetail({ row, serverLines }) {
  const { colors } = useTheme();
  const [view, setView] = useState('summary');
  const route = routeOf(row);
  const outcome =
    row.state === 'pending'
      ? 'waiting'
      : describeOutcome({
          status: row.status,
          kind: row.state === 'ok' ? undefined : row.status ? 'http' : 'network',
          message: row.error,
        });
  const statusColor =
    row.state === 'error'
      ? colors.dangerOnSlab
      : row.state === 'ok'
        ? colors.success
        : colors.textOnSlabMuted;

  async function copy(text, what) {
    await Clipboard.setStringAsync(text);
    log.app(`inspector: copied ${what} for #${row.id}`);
    islandCopied();
  }

  function resend() {
    log.app(`inspector: resending GET ${row.path}`);
    request(row.path, { query: row.query, initiator: 'inspector resend' }).catch(() => {});
  }

  function renderView() {
    switch (view) {
      case 'headers':
        return (
          <>
            <HeaderList title="request headers" headers={row.requestHeaders} />
            <HeaderList title="response headers" headers={row.responseHeaders} />
          </>
        );
      case 'payload':
        // a key per view: the payload's folds and search must not carry into the response
        return (
          <JsonTreeView
            key="payload"
            value={row.requestBody}
            emptyText="This request sent no body."
          />
        );
      case 'response':
        return (
          <JsonTreeView
            key="response"
            value={row.response ?? (row.responsePreview || undefined)}
            emptyText={row.state === 'pending' ? 'No reply yet.' : 'No body came back.'}
          />
        );
      case 'timing':
        return <TimingView row={row} />;
      case 'server':
        return <ServerView lines={serverLines} />;
      default:
        return (
          <View style={[styles.card, { backgroundColor: colors.slabRaised }]}>
            <Field label="url" value={row.url ?? row.path} />
            <Field label="method" value={row.method} />
            <Field label="status" value={`${row.status ?? '-'} · ${outcome}`} />
            <Field label="time" value={`${row.durationMs ?? '-'} ms`} />
            <Field
              label="started by"
              value={`${route.starter.screen} · ${route.starter.store}${row.isPoll ? ' (background check)' : ''}`}
              mono={false}
            />
            <Field label="request id" value={row.id} />
            {row.error ? <Field label="problem" value={row.error} mono={false} /> : null}
          </View>
        );
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <PressableScale onPress={closeRequest} accessibilityLabel="Back to all requests">
          <View style={[styles.back, { backgroundColor: colors.slabRaised }]}>
            <Icon as={ChevronLeft} color={colors.textOnSlab} size={20} />
          </View>
        </PressableScale>
        <View style={styles.headText}>
          <Text style={[styles.title, { color: colors.textOnSlab }]} numberOfLines={1}>
            {row.method} {row.path}
          </Text>
          <Text style={[styles.plain, { color: colors.textOnSlabMuted }]} numberOfLines={1}>
            {describeRow(row)} · {row.durationMs ?? '...'} ms
          </Text>
        </View>
        <Text style={[styles.status, { color: statusColor }]}>
          {row.status ?? (row.state === 'error' ? 'ERR' : '...')}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.views}
      >
        {VIEWS.map((option) => (
          <InspectorChip
            key={option}
            label={option}
            selected={view === option}
            onPress={() => setView(option)}
          />
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderView()}
      </ScrollView>

      <View style={styles.actions}>
        <Action label="replay in flow" onPress={() => replayInFlow(row.id)} accent />
        <Action label="copy as cURL" onPress={() => copy(toCurl(row), 'cURL')} />
        <Action
          label="copy reply"
          onPress={() =>
            copy(JSON.stringify(row.response ?? row.responsePreview ?? null, null, 2), 'response')
          }
        />
        {/* resend only GETs made with the session's own login (to the session's server) */}
        {row.method === 'GET' && row.state !== 'pending' && row.requestHeaders?.Authorization ? (
          <Action label="resend" onPress={resend} />
        ) : null}
      </View>
    </View>
  );
}

function Action({ label, onPress, accent = false }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label}>
      <View
        style={[styles.action, { backgroundColor: accent ? colors.textOnSlab : colors.slabRaised }]}
      >
        <Text style={[styles.actionText, { color: accent ? '#0A0D0C' : colors.textOnSlab }]}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.mono, fontSize: 14 },
  plain: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  status: { fontFamily: fonts.semibold, fontSize: 16 },
  views: { gap: space.xs },
  content: { gap: space.sm, paddingBottom: space.md },
  card: { borderRadius: radius.bubble, padding: space.md, gap: space.sm },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 13 },
  field: { gap: 2 },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 11 },
  fieldValue: { fontSize: 12, lineHeight: 17 },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
  serverLine: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16 },
  timingRow: { gap: 4 },
  timingLabel: { fontFamily: fonts.regular, fontSize: 12 },
  timingTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  timingFill: { height: 8, borderRadius: 4 },
  timingMs: { fontFamily: fonts.mono, fontSize: 11 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, paddingBottom: space.xs },
  action: { height: 36, paddingHorizontal: space.md, borderRadius: 18, justifyContent: 'center' },
  actionText: { fontFamily: fonts.medium, fontSize: 13 },
});
