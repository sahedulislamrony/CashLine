import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '../tokens';
import { useTheme } from '../use-theme';

type Props = { title: string; description: string };

/** Stand-in for screens that are not built yet. Removed as each phase lands. */
export function PlaceholderScreen({ title, description }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { fontSize: 24, fontWeight: '600', textAlign: 'center' },
  description: { fontSize: 16, textAlign: 'center' },
});
