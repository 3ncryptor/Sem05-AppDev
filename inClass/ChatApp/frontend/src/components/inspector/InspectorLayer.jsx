/**
 * InspectorLayer: everything the root layout needs for debugging, in one
 * place: the floating orb (Profile > show debug orb), shake to open
 * (Profile > shake to open) and the Inspector sheet itself.
 */
import { inspectorStore, openInspector } from '../../debug/inspectorStore';
import { useShakeToOpen } from '../../hooks/useShakeToOpen';
import { useStore } from '../../hooks/useStore';
import { settingsStore } from '../../store/settingsStore';
import { DebugOrb } from './DebugOrb';
import { Inspector } from './Inspector';

const openFromShake = () => openInspector('shake');

export function InspectorLayer() {
  const showOrb = useStore(settingsStore, (state) => state.showOrb);
  const shakeToOpen = useStore(settingsStore, (state) => state.shakeToOpen);
  const isOpen = useStore(inspectorStore, (state) => state.isOpen);

  useShakeToOpen(shakeToOpen && !isOpen, openFromShake);

  return (
    <>
      {showOrb && !isOpen ? <DebugOrb /> : null}
      <Inspector />
    </>
  );
}
