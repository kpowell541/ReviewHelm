import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { usePreferencesStore } from '../src/store/usePreferencesStore';
import {
  CLAUDE_MODEL_LABELS,
  CLAUDE_MODEL_DESCRIPTIONS,
  type ClaudeModel,
} from '../src/data/types';
import { estimateCost } from '../src/ai';
import { colors, spacing, fontSizes, radius } from '../src/theme';

const MODEL_OPTIONS: ClaudeModel[] = ['sonnet', 'opus'];

export default function SettingsScreen() {
  const apiKey = usePreferencesStore((s) => s.apiKey);
  const setApiKey = usePreferencesStore((s) => s.setApiKey);
  const aiModel = usePreferencesStore((s) => s.aiModel);
  const setAiModel = usePreferencesStore((s) => s.setAiModel);
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
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>AI Model</Text>
        <Text style={styles.hint}>
          Choose which Claude model powers your tutor sessions.
        </Text>
        <View style={styles.modelOptions}>
          {MODEL_OPTIONS.map((model) => {
            const isSelected = aiModel === model;
            return (
              <TouchableOpacity
                key={model}
                style={[
                  styles.modelOption,
                  isSelected && styles.modelOptionSelected,
                ]}
                onPress={() => setAiModel(model)}
                activeOpacity={0.7}
              >
                <View style={styles.modelHeader}>
                  <View style={styles.modelRadioRow}>
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.modelName,
                        isSelected && styles.modelNameSelected,
                      ]}
                    >
                      {CLAUDE_MODEL_LABELS[model]}
                    </Text>
                  </View>
                  {model === 'sonnet' && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modelDescription}>
                  {CLAUDE_MODEL_DESCRIPTIONS[model]}
                </Text>
                <Text style={styles.modelCost}>
                  {model === 'sonnet' ? '~$2-8/month' : '~$9-45/month'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
  modelOptions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  modelOption: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modelOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modelRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  modelName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modelNameSelected: {
    color: colors.primary,
  },
  defaultBadge: {
    backgroundColor: `${colors.primary}30`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  defaultBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  modelDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginLeft: 26,
  },
  modelCost: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginLeft: 26,
  },
});
