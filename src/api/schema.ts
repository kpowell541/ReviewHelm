/**
 * Convenience re-exports from the OpenAPI-generated types.
 *
 * Usage:
 *   import type { ApiSchemas } from '../api/schema';
 *   const prefs: ApiSchemas['Preferences'] = ...;
 *
 * To regenerate after editing docs/openapi.yaml:
 *   npm run openapi:generate
 */

import type { components } from './generated';

/** All schema types from the OpenAPI spec */
export type ApiSchemas = components['schemas'];

// Individual schema types used frequently across the codebase
export type ApiTrackedPR = ApiSchemas['TrackedPR'];
export type ApiSession = ApiSchemas['Session'];
export type ApiSessionListResponse = ApiSchemas['SessionListResponse'];
export type ApiPreferences = ApiSchemas['Preferences'];
export type ApiPreferencesPatch = ApiSchemas['PreferencesPatchRequest'];
export type ApiUsageSummary = ApiSchemas['UsageSummary'];
export type ApiTutorConversation = ApiSchemas['TutorConversation'];
export type ApiConfidenceHistories = ApiSchemas['ConfidenceHistoriesResponse'];
export type ApiAiTutorRequest = ApiSchemas['AiTutorRequest'];
export type ApiAiTutorResponse = ApiSchemas['AiTutorResponse'];
export type ApiCreateSessionRequest = ApiSchemas['CreateSessionRequest'];
export type ApiSubscriptionTier = ApiSchemas['SubscriptionTierResponse'];
export type ApiSubscriptionCredits = ApiSchemas['SubscriptionCreditsResponse'];
export type ApiStripeCheckout = ApiSchemas['StripeCheckoutResponse'];
export type ApiOfficialCost = ApiSchemas['OfficialCostResponse'];
