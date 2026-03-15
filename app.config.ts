import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'ReviewHelm',
  slug: config.slug ?? 'reviewhelm',
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
    apiBasePath: process.env.EXPO_PUBLIC_API_BASE_PATH ?? '',
    cognitoRegion: process.env.EXPO_PUBLIC_COGNITO_REGION ?? '',
    cognitoUserPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '',
    cognitoClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '',
    cognitoDomain: process.env.EXPO_PUBLIC_COGNITO_DOMAIN ?? '',
  },
});
