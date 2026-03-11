import { Platform } from 'react-native';

/**
 * SSL/TLS Certificate Pinning Configuration
 *
 * Certificate pinning prevents MITM attacks even when a device has a
 * compromised or rogue CA installed. This is especially important for
 * a security-focused app that handles API keys.
 *
 * Implementation status:
 * - Web: Relies on browser CA trust store (pinning not possible from JS)
 * - iOS/Android: Requires native module (e.g. react-native-ssl-pinning
 *   or expo-ssl-pinning) to enforce pins at the network layer.
 *
 * When implementing native pinning:
 * 1. Extract SPKI hashes from your API server certificate chain
 * 2. Include at least one backup pin (next CA or backup cert)
 * 3. Use SPKI (Subject Public Key Info) hashes, not certificate hashes
 * 4. Rotate pins well before certificate expiry
 *
 * Generate SPKI hash:
 *   openssl s_client -connect api.reviewhelm.com:443 | \
 *     openssl x509 -pubkey -noout | \
 *     openssl pkey -pubin -outform der | \
 *     openssl dgst -sha256 -binary | base64
 */

export interface SSLPinConfig {
  hostname: string;
  /** Base64-encoded SHA-256 SPKI hashes */
  pins: string[];
  /** Include subdomains in pinning */
  includeSubdomains: boolean;
}

/**
 * Pin configuration for ReviewHelm API endpoints.
 * Update these when rotating server certificates.
 *
 * IMPORTANT: Always include at least 2 pins (primary + backup) to
 * prevent lockout during certificate rotation.
 */
export const SSL_PIN_CONFIG: SSLPinConfig[] = [
  // Uncomment and populate when native pinning module is added:
  // {
  //   hostname: 'api.reviewhelm.com',
  //   pins: [
  //     '<primary-spki-sha256-base64>',
  //     '<backup-spki-sha256-base64>',
  //   ],
  //   includeSubdomains: false,
  // },
];

export function isSSLPinningSupported(): boolean {
  return Platform.OS !== 'web' && SSL_PIN_CONFIG.length > 0;
}
