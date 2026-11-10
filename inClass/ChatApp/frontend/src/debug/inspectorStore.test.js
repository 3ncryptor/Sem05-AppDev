import {
  closeInspector,
  closeRequest,
  INSPECTOR_TABS,
  inspectorStore,
  openInspector,
  openRequest,
  replayInFlow,
  setInspectorTab,
  stopReplay,
} from './inspectorStore';

beforeEach(() => {
  inspectorStore.reset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('inspectorStore', () => {
  it('opens on the overview tab, with the five technical tabs', () => {
    expect(INSPECTOR_TABS).toEqual(['overview', 'flow', 'network', 'logs', 'tools']);
    openInspector('profile');
    expect(inspectorStore.get()).toMatchObject({ isOpen: true, tab: 'overview' });
    closeInspector();
    expect(inspectorStore.get().isOpen).toBe(false);
  });

  it('ignores unknown tabs', () => {
    setInspectorTab('nope');
    expect(inspectorStore.get().tab).toBe('overview');
  });

  it('opens a request in network detail and closes it again', () => {
    openRequest('ab12');
    expect(inspectorStore.get()).toMatchObject({ tab: 'network', requestId: 'ab12' });
    closeRequest();
    expect(inspectorStore.get().requestId).toBeNull();
  });

  it('sends a request to the flow replay', () => {
    replayInFlow('ab12');
    expect(inspectorStore.get()).toMatchObject({ tab: 'flow', replayId: 'ab12' });
    stopReplay();
    expect(inspectorStore.get().replayId).toBeNull();
  });
});
