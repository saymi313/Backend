const fs = require('fs');
const path = require('path');

// Only use file if explicitly set via env var, otherwise use env vars only
const CREDENTIAL_FILENAME = process.env.GOOGLE_MEET_CREDENTIAL_FILE || null;

let cachedCredentials = null;

const readCredentialFile = () => {
  // If no file path is set, skip file reading
  if (!CREDENTIAL_FILENAME || !fs.existsSync(CREDENTIAL_FILENAME)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(CREDENTIAL_FILENAME, 'utf-8');
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    console.error('Failed to read Google Meet credential file:', error);
    return null;
  }
};

const extractClientConfig = (source) => {
  const candidate = source ? (source.web || source.installed || source) : {};

  // Get redirect URIs from file or env
  const redirectUris = candidate.redirect_uris || candidate.redirectUris || [];
  const javascriptOrigins = candidate.javascript_origins || candidate.javascriptOrigins || [];
  
  // Parse javascript origins from env if available
  const envJavascriptOrigins = process.env.GOOGLE_JAVASCRIPT_ORIGINS 
    ? process.env.GOOGLE_JAVASCRIPT_ORIGINS.split(',').map(origin => origin.trim())
    : [];
  
  const allJavascriptOrigins = [...envJavascriptOrigins, ...javascriptOrigins];
  const inferredRedirect = allJavascriptOrigins.length > 0 
    ? `${allJavascriptOrigins[0].replace(/\/$/, '')}/mentor/google-meet/callback` 
    : null;
  
  const fallbackRedirect = process.env.GOOGLE_FALLBACK_REDIRECT_URI || 'http://localhost:3000/mentor/google-meet/callback';

  // Prioritize environment variables over file values
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || candidate.client_id || null,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || candidate.client_secret || null,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || redirectUris[0] || candidate.redirect_uri || inferredRedirect || fallbackRedirect,
    accessToken: process.env.GOOGLE_ACCESS_TOKEN || candidate.access_token || candidate.accessToken || null,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || candidate.refresh_token || candidate.refreshToken || null,
    scope: process.env.GOOGLE_SCOPE || candidate.scope || 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
    tokenType: process.env.GOOGLE_TOKEN_TYPE || candidate.token_type || 'Bearer',
    expiryDate: process.env.GOOGLE_TOKEN_EXPIRY ? parseInt(process.env.GOOGLE_TOKEN_EXPIRY) : (candidate.expiry_date || null),
    projectId: process.env.GOOGLE_PROJECT_ID || candidate.project_id || null,
  };
};

const getGoogleOAuthCredentials = () => {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  const fileCredentials = readCredentialFile();
  const credentials = extractClientConfig(fileCredentials);

  cachedCredentials = credentials;
  return credentials;
};

const persistTokens = (tokens = {}) => {
  try {
    // If using env vars only (no credential file), tokens are managed via environment
    // In production, these should be updated in your environment configuration
    // For development, we can optionally write to file if GOOGLE_MEET_CREDENTIAL_FILE is set
    if (!CREDENTIAL_FILENAME) {
      console.warn('⚠️  GOOGLE_MEET_CREDENTIAL_FILE not set. Tokens updated but not persisted to file.');
      console.warn('   Update your environment variables with the following:');
      if (tokens.access_token || tokens.accessToken) {
        console.warn(`   GOOGLE_ACCESS_TOKEN=${tokens.access_token || tokens.accessToken}`);
      }
      if (tokens.refresh_token || tokens.refreshToken) {
        console.warn(`   GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || tokens.refreshToken}`);
      }
      if (tokens.scope) {
        console.warn(`   GOOGLE_SCOPE=${tokens.scope}`);
      }
      if (tokens.expiry_date || tokens.expiryDate) {
        console.warn(`   GOOGLE_TOKEN_EXPIRY=${tokens.expiry_date || tokens.expiryDate}`);
      }
      
      // Reset cache so the next read picks up new tokens from env
      cachedCredentials = null;
      return true;
    }

    // If credential file is configured, write to it
    const fileCredentials = readCredentialFile() || {};
    const containerKey = fileCredentials.web ? 'web' : (fileCredentials.installed ? 'installed' : null);

    if (containerKey) {
      fileCredentials[containerKey] = {
        ...fileCredentials[containerKey],
        access_token: tokens.access_token || tokens.accessToken || fileCredentials[containerKey]?.access_token,
        refresh_token: tokens.refresh_token || tokens.refreshToken || fileCredentials[containerKey]?.refresh_token,
        scope: tokens.scope || fileCredentials[containerKey]?.scope,
        token_type: tokens.token_type || fileCredentials[containerKey]?.token_type,
        expiry_date: tokens.expiry_date || tokens.expiryDate || fileCredentials[containerKey]?.expiry_date,
      };
    } else {
      fileCredentials.access_token = tokens.access_token || tokens.accessToken || fileCredentials.access_token;
      fileCredentials.refresh_token = tokens.refresh_token || tokens.refreshToken || fileCredentials.refresh_token;
      fileCredentials.scope = tokens.scope || fileCredentials.scope;
      fileCredentials.token_type = tokens.token_type || fileCredentials.token_type;
      fileCredentials.expiry_date = tokens.expiry_date || tokens.expiryDate || fileCredentials.expiry_date;
    }

    fs.writeFileSync(CREDENTIAL_FILENAME, JSON.stringify(fileCredentials, null, 2), 'utf-8');

    // Reset cache so the next read picks up new tokens
    cachedCredentials = null;

    return true;
  } catch (error) {
    console.error('Failed to persist Google Meet tokens:', error);
    return false;
  }
};

const resetCachedCredentials = () => {
  cachedCredentials = null;
};

module.exports = {
  getGoogleOAuthCredentials,
  persistTokens,
  resetCachedCredentials,
};

