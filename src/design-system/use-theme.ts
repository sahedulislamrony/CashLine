import { useColorScheme } from 'react-native';

import { colors, type ColorScheme, type Palette } from './tokens';

export type Theme = { scheme: ColorScheme; colors: Palette };

/** Follows the OS appearance (docs/design-system.md §4). */
export function useTheme(): Theme {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: colors[scheme] };
}
