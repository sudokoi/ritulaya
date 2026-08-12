/**
 * GitHub OAuth App client ID for the device flow.
 *
 * Create your own GitHub OAuth App at:
 *   https://github.com/settings/developers
 *
 * For the device flow, only the client_id is required (no client secret).
 * Override at build time with EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID.
 */
export const GITHUB_OAUTH_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_OAUTH_CLIENT_ID ?? ""
