/**
 * Colours for the architecture figures. One colour per layer, the same in
 * every figure, in a light and a dark version (GitHub shows the one that
 * matches the reader's theme). Text on every fill meets WCAG AA contrast.
 */
export const THEMES = {
  light: {
    name: 'light',
    canvas: '#FFFFFF',
    frame: '#D8DEE4',
    ink: '#1F2328',
    inkSoft: '#57606A',
    edge: '#8C959F',
  },
  dark: {
    name: 'dark',
    canvas: '#0D1117',
    frame: '#30363D',
    ink: '#E6EDF3',
    inkSoft: '#9198A1',
    edge: '#6E7681',
  },
  layers: {
    client: {
      light: { fill: '#EEF4FB', stroke: '#3F6FA6', text: '#1F3A5C' },
      dark: { fill: '#14233A', stroke: '#6EA0DA', text: '#CFE0F5' },
    },
    network: {
      light: { fill: '#F3F4F6', stroke: '#6E7781', text: '#24292F' },
      dark: { fill: '#1C2128', stroke: '#8B949E', text: '#D7DDE3' },
    },
    server: {
      light: { fill: '#EDF6EF', stroke: '#3E7D4F', text: '#1C4429' },
      dark: { fill: '#13261A', stroke: '#6FBF85', text: '#C9EBD3' },
    },
    data: {
      light: { fill: '#FBF3E6', stroke: '#A0661A', text: '#5C3A0C' },
      dark: { fill: '#2B2012', stroke: '#D9A24D', text: '#F2DDB8' },
    },
    jobs: {
      light: { fill: '#F4F0FA', stroke: '#6B55A3', text: '#3B2D63' },
      dark: { fill: '#221B33', stroke: '#A895DD', text: '#E0D8F5' },
    },
    native: {
      light: { fill: '#FBEFEF', stroke: '#A64B4B', text: '#5E2222' },
      dark: { fill: '#2E1717', stroke: '#E08A8A', text: '#F5D3D3' },
    },
  },
};
