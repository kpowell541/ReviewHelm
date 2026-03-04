import { View, Text, ScrollView, StyleSheet, TextInput, Switch } from 'react-native';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import { colors, spacing, fontSizes, radius } from '../src/theme';

export default function SettingsScreen() {
  const apiKey = usePreferencesStore((s) => s.apiKey);
  const setApiKey = usePreferencesStore((s) => s.setApiKey);
  const antiBiasMode = usePreferencesStore((s) => s.antiBiasMode);
  const setAntiBiasMode = usePreferencesStore((s) => s.setAntiBiasMode);
  const autoExportPdf = usePreferencesStore((s) => s.autoExportPdf);
  const setAutoExportPdf = usePreferencesStore((s) => s.setAutoExportPdf);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>AI Tutor</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Claude API Key</Text>
        <TextInput
          style={styles.input}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="sk-ant-..."
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Enter your Anthropic API key to enable the AI tutor.
          Uses Claude Haiku (~$5/month for typical usage).
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Review Settings</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.label}>Anti-Bias Mode</Text>
            <Text style={styles.hint}>
              Randomize section order in Polish mode to prevent checklist fatigue
            </Text>
          </View>
          <Switch
            value={antiBiasMode}
            onValueChange={setAntiBiasMode}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Export</Text>
      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.label}>Auto-Export PDF</Text>
            <Text style={styles.hint}>
              Automatically generate PDF when completing a session
            </Text>
          </View>
          <Switch
            value={autoExportPdf}
            onValueChange={setAutoExportPdf}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSizes.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingInfo: { flex: 1 },
});
