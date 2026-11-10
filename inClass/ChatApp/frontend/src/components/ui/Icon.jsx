/**
 * Icon: renders a Lucide SVG icon with the app's 1.5 px stroke.
 * Usage: <Icon as={ArrowLeft} color={colors.textPrimary} />
 * Import icons one per file (lucide-react-native/icons/<name>) so only those are bundled.
 */
const DEFAULT_SIZE = 22;
const STROKE_WIDTH = 1.5;

/**
 * @param {object} props
 * @param {import('react').ComponentType<any>} props.as a lucide-react-native icon component
 * @param {string} props.color
 * @param {number} [props.size=22]
 */
export function Icon({ as: LucideIcon, color, size = DEFAULT_SIZE }) {
  return <LucideIcon color={color} size={size} strokeWidth={STROKE_WIDTH} absoluteStrokeWidth />;
}
