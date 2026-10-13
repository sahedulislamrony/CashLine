import { render, screen } from '@testing-library/react-native';
import { StyleSheet, useColorScheme } from 'react-native';

import { colors } from '../tokens';
import { PlaceholderScreen } from './placeholder-screen';

jest.mock('react-native/Libraries/Utilities/useColorScheme');

const mockScheme = jest.mocked(useColorScheme);

describe('PlaceholderScreen', () => {
  it('shows the title as a header and the description', async () => {
    await render(<PlaceholderScreen title="Ledger" description="Coming in Phase 3." />);

    expect(screen.getByRole('header', { name: 'Ledger' })).toBeOnTheScreen();
    expect(screen.getByText('Coming in Phase 3.')).toBeOnTheScreen();
  });

  it.each([
    ['dark', colors.dark.textPrimary],
    ['light', colors.light.textPrimary],
    ['unspecified', colors.light.textPrimary],
  ] as const)('uses the %s palette', async (scheme, expected) => {
    mockScheme.mockReturnValue(scheme);

    await render(<PlaceholderScreen title="Ledger" description="Coming in Phase 3." />);

    const title = screen.getByRole('header', { name: 'Ledger' });
    expect(StyleSheet.flatten(title.props.style).color).toBe(expected);
  });
});
