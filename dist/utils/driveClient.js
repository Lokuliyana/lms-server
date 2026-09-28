"use strict";
// @ts-nocheck
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/drive'];
let cachedDrive = null;
let cachedCreds = null;
const OAUTH_HINT_KEYS = [
    'GOOGLE_OAUTH_CLIENT_ID',
    'GOOGLE_OAUTH_CLIENT_SECRET',
    'GOOGLE_OAUTH_REFRESH_TOKEN',
    'GOOGLE_OAUTH_REDIRECT_URI',
    'GOOGLE_OAUTH_CREDENTIALS_PATH',
    'GOOGLE_OAUTH_TOKEN_PATH',
    'GOOGLE_OAUTH_TOKEN_JSON',
];
const DEFAULT_OAUTH_CREDENTIALS_PATH = path.resolve(process.cwd(), 'oauth2_credentials.json');
const DEFAULT_OAUTH_TOKEN_PATH = path.resolve(process.cwd(), 'utils', 'tokens.json');
function resolveServiceAccountPath() {
    return (process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH ||
        process.env.GDRIVE_SERVICE_ACCOUNT_PATH ||
        process.env.GOOGLE_SERVICE_ACCOUNT_PATH ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        '').trim();
}
function resolveOAuthCredentialsPath() {
    return (process.env.GOOGLE_OAUTH_CREDENTIALS_PATH || '').trim();
}
function resolveOAuthTokenPath() {
    return (process.env.GOOGLE_OAUTH_TOKEN_PATH || '').trim();
}
function isDefaultOAuthDisabled() {
    return String(process.env.GOOGLE_OAUTH_DISABLE_DEFAULTS || '').trim() === '1';
}
function hasOAuthHint() {
    return OAUTH_HINT_KEYS.some((key) => Boolean(process.env[key]));
}
function loadOAuthClientFromEnv() {
    const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || '').trim();
    const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim();
    const redirectUri = (process.env.GOOGLE_OAUTH_REDIRECT_URI || '').trim();
    if (!clientId || !clientSecret)
        return null;
    return { clientId, clientSecret, redirectUri: redirectUri || undefined };
}
function loadOAuthTokenFromEnv() {
    const refreshToken = (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || '').trim();
    if (refreshToken)
        return { refreshToken };
    const tokenJson = (process.env.GOOGLE_OAUTH_TOKEN_JSON || '').trim();
    if (!tokenJson)
        return null;
    try {
        const parsed = JSON.parse(tokenJson);
        if (parsed?.refresh_token)
            return { refreshToken: String(parsed.refresh_token) };
    }
    catch {
        return null;
    }
    return null;
}
function loadOAuthClientFromFile(filePath) {
    const absPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(raw);
    const clientId = parsed.client_id || parsed.web?.client_id;
    const clientSecret = parsed.client_secret || parsed.web?.client_secret;
    const redirectUri = parsed.redirect_uris?.[0] || parsed.web?.redirect_uris?.[0];
    if (!clientId || !clientSecret)
        return null;
    return { clientId, clientSecret, redirectUri };
}
function loadOAuthTokenFromFile(filePath) {
    const absPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed?.refresh_token)
        return null;
    return { refreshToken: String(parsed.refresh_token) };
}
function getOAuthCredentials() {
    const hasHint = hasOAuthHint();
    const useDefaults = !hasHint &&
        !isDefaultOAuthDisabled() &&
        fs.existsSync(DEFAULT_OAUTH_CREDENTIALS_PATH) &&
        fs.existsSync(DEFAULT_OAUTH_TOKEN_PATH);
    if (!hasHint && !useDefaults)
        return null;
    const client = loadOAuthClientFromEnv() || (() => {
        const p = resolveOAuthCredentialsPath();
        if (p)
            return loadOAuthClientFromFile(p);
        if (useDefaults)
            return loadOAuthClientFromFile(DEFAULT_OAUTH_CREDENTIALS_PATH);
        return null;
    })();
    const token = loadOAuthTokenFromEnv() || (() => {
        const p = resolveOAuthTokenPath();
        if (p)
            return loadOAuthTokenFromFile(p);
        if (useDefaults)
            return loadOAuthTokenFromFile(DEFAULT_OAUTH_TOKEN_PATH);
        return null;
    })();
    if (client && token) {
        if (useDefaults) {
            console.log('[DriveClient] Using OAuth credentials from default files for Drive.');
        }
        else {
            console.log('[DriveClient] Using OAuth credentials for Drive.');
        }
        return { ...client, ...token };
    }
    console.log('[DriveClient] OAuth Debug:');
    console.log('  - Has Hint:', hasHint);
    console.log('  - Use Defaults:', useDefaults);
    console.log('  - Client Loaded:', Boolean(client));
    console.log('  - Token Loaded:', Boolean(token));
    if (client)
        console.log('  - Client ID:', client.clientId ? 'Present' : 'Missing');
    if (token)
        console.log('  - Refresh Token:', token.refreshToken ? 'Present' : 'Missing');
    // Debug Env Vars (Masked)
    console.log('  - ENV CLIENT_ID:', process.env.GOOGLE_OAUTH_CLIENT_ID ? 'Set' : 'Unset');
    console.log('  - ENV REFRESH_TOKEN:', process.env.GOOGLE_OAUTH_REFRESH_TOKEN ? 'Set' : 'Unset');
    console.log('  - ENV TOKEN_JSON:', process.env.GOOGLE_OAUTH_TOKEN_JSON ? 'Set (Length: ' + process.env.GOOGLE_OAUTH_TOKEN_JSON.length + ')' : 'Unset');
    throw new Error('Missing Google OAuth credentials. Set GOOGLE_OAUTH_CLIENT_ID/GOOGLE_OAUTH_CLIENT_SECRET/GOOGLE_OAUTH_REFRESH_TOKEN or GOOGLE_OAUTH_CREDENTIALS_PATH + GOOGLE_OAUTH_TOKEN_PATH.');
}
function loadServiceAccountFromFile(filePath) {
    const absPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(raw);
    console.log('[DriveClient] Using service account file:', absPath);
    if (parsed.client_email) {
        console.log('[DriveClient] Service account email:', parsed.client_email);
    }
    return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
    };
}
function loadServiceAccountFromEnv() {
    const email = (process.env.GOOGLE_CLIENT_EMAIL || '').trim();
    let key = (process.env.GOOGLE_PRIVATE_KEY || '').trim();
    if (!email || !key)
        return null;
    console.log('[DriveClient] Using service account from env:', email);
    // 1. Remove outer quotes if present (common copy-paste or .env issue)
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1);
    }
    // 2. Handle escaped newlines (e.g. from JSON or some env providers)
    key = key.replace(/\\n/g, '\n');
    // 3. Basic validation/logging
    if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
        console.error('[DriveClient] ⚠️ Private Key missing standard header. Check GOOGLE_PRIVATE_KEY.');
    }
    // Log key stats for debugging (don't log the full key)
    const lines = key.split('\n');
    console.log(`[DriveClient] Private Key loaded. Length: ${key.length}, Lines: ${lines.length}`);
    return { client_email: email, private_key: key };
}
function getServiceAccountCredentials() {
    if (cachedCreds)
        return cachedCreds;
    const filePath = resolveServiceAccountPath();
    if (filePath) {
        cachedCreds = loadServiceAccountFromFile(filePath);
        return cachedCreds;
    }
    const envCreds = loadServiceAccountFromEnv();
    if (envCreds) {
        cachedCreds = envCreds;
        return cachedCreds;
    }
    console.log('[DriveClient] No service account credentials found in env or file.');
    throw new Error('Missing Google service account credentials. Set GOOGLE_DRIVE_SERVICE_ACCOUNT_PATH or GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY.');
}
function getDriveClient() {
    if (cachedDrive)
        return cachedDrive;
    const oauth = getOAuthCredentials();
    if (oauth) {
        const auth = new google.auth.OAuth2(oauth.clientId, oauth.clientSecret, oauth.redirectUri);
        auth.setCredentials({ refresh_token: oauth.refreshToken });
        cachedDrive = google.drive({ version: 'v3', auth });
        return cachedDrive;
    }
    const { client_email, private_key } = getServiceAccountCredentials();
    if (!client_email || !private_key) {
        throw new Error('Service account is missing client_email or private_key.');
    }
    const auth = new google.auth.JWT({
        email: client_email,
        key: private_key,
        scopes: DEFAULT_SCOPES,
    });
    cachedDrive = google.drive({ version: 'v3', auth });
    return cachedDrive;
}
function getDriveFolderId() {
    const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
    return folderId || null;
}
module.exports = { getDriveClient, getDriveFolderId };
