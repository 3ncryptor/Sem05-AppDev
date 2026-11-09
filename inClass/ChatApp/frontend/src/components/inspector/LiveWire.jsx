/**
 * LiveWire: the animated picture of the app talking to the server
 * (buildPlan.md 6.3). Phone, server (guard -> controller -> service) and db
 * in a row, two lanes between them, a dot per real request, and ripples on
 * the bot node when the server logs background work.
 *
 *   phone ──•──•──► server ──► db      upper lane: requests
 *   phone ◄──•──── server ◄── db       lower lane: replies
 *                    bot               ripples (needs server logs)
 */
import Bot from 'lucide-react-native/icons/bot';
import Database from 'lucide-react-native/icons/database';
import Server from 'lucide-react-native/icons/server';
import Smartphone from 'lucide-react-native/icons/smartphone';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { FlowDot } from './FlowDot';
import { FlowNode } from './FlowNode';
import { FlowRipple } from './FlowRipple';

const HEIGHT = 220;
const NODE_WIDTH = 80;
const UPPER_Y = 44;
const LOWER_Y = 78;
const BOT_TOP = 150;

const SERVER_LAYERS = [
  { id: 'guard', label: 'guard' },
  { id: 'service', label: 'ctrl -> svc' },
];

/**
 * @param {object} props
 * @param {object[]} props.dots networkStore rows to draw
 * @param {{ id: string, kind: string }[]} props.ripples
 * @param {number} props.speed
 * @param {string | null} props.activeNode node being explained
 * @param {string | null} props.selectedId
 * @param {(id: string) => void} props.onPick
 */
export function LiveWire({ dots, ripples, speed, activeNode, selectedId, onPick }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const fromX = NODE_WIDTH / 2;
  const toX = width - NODE_WIDTH / 2;
  const track = { fromX, toX, upperY: UPPER_Y, lowerY: LOWER_Y };
  const lane = {
    left: fromX,
    width: Math.max(0, toX - fromX),
    backgroundColor: colors.textOnSlabMuted,
  };

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={[styles.lane, lane, { top: UPPER_Y }]} />
      <View style={[styles.lane, lane, { top: LOWER_Y }]} />
      <View
        style={[
          styles.lane,
          styles.botLink,
          { left: width / 2, backgroundColor: colors.textOnSlabMuted },
        ]}
      />

      <View style={styles.row}>
        <FlowNode
          id="phone"
          icon={Smartphone}
          label="phone"
          active={activeNode === 'reply' ? 'phone' : activeNode}
          style={styles.node}
        />
        <FlowNode
          id="wire"
          icon={Server}
          label="server"
          layers={SERVER_LAYERS}
          active={activeNode}
          style={styles.node}
        />
        <FlowNode id="db" icon={Database} label="mongo" active={activeNode} style={styles.node} />
      </View>

      <View style={[styles.bot, { left: width / 2 - NODE_WIDTH / 2 }]}>
        {ripples.map((ripple) => (
          <FlowRipple key={ripple.id} kind={ripple.kind} speed={speed} />
        ))}
        <FlowNode id="bot" icon={Bot} label="background" active={null} style={styles.node} />
      </View>

      {width > 0
        ? dots.map((row) => (
            <FlowDot
              key={row.id}
              row={row}
              track={track}
              speed={speed}
              isSelected={row.id === selectedId}
              onPick={onPick}
            />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: HEIGHT },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  node: { width: NODE_WIDTH },
  lane: { position: 'absolute', height: StyleSheet.hairlineWidth * 2, opacity: 0.4 },
  botLink: { top: 120, width: StyleSheet.hairlineWidth * 2, height: BOT_TOP - 120 },
  bot: {
    position: 'absolute',
    top: BOT_TOP,
    width: NODE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
