/**
 * GradientFill: the app's single accent gradient (apricot -> rose -> orchid)
 * as a container. Use on one or two elements per screen at most.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { gradient } from '../../constants/theme';

/**
 * @param {object} props
 * @param {object} [props.style]
 * @param {import('react').ReactNode} [props.children]
 */
export function GradientFill({ style, children }) {
  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={gradient.start}
      end={gradient.end}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
