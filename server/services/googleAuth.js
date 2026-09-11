/**
 * Google Sign-In verification
 *
 * Verifies the ID token (JWT) that the "Sign in with Google" button hands to the
 * frontend. Uses Google's public signing keys, so no client secret is needed.
 */

const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

let cachedKeys = null;
let cacheExpiresAt = 0;

// Fetch Google's signing keys, cached for as long as Google says they're valid
const getGoogleKeys = async (forceRefresh = false) => {
    if (!forceRefresh && cachedKeys && Date.now() < cacheExpiresAt) {
        return cachedKeys;
    }

    const response = await axios.get(GOOGLE_CERTS_URL, { timeout: 5000 });
    const maxAge = /max-age=(\d+)/.exec(response.headers['cache-control'] || '');

    cachedKeys = Object.fromEntries(
        response.data.keys.map((key) => [key.kid, crypto.createPublicKey({ key, format: 'jwk' })])
    );
    cacheExpiresAt = Date.now() + (maxAge ? parseInt(maxAge[1]) * 1000 : 60 * 60 * 1000);
    return cachedKeys;
};

/**
 * Verify a Google ID token and return its payload
 * (email, email_verified, hd, name, picture, ...). Throws if invalid.
 */
const verifyGoogleIdToken = async (idToken) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const decoded = jwt.decode(idToken, { complete: true });
    const kid = decoded?.header?.kid;
    if (!kid) {
        throw new Error('Malformed Google ID token');
    }

    let keys = await getGoogleKeys();
    if (!keys[kid]) {
        // Google rotates keys; refetch once before giving up
        keys = await getGoogleKeys(true);
    }
    if (!keys[kid]) {
        throw new Error('Unknown Google signing key');
    }

    return jwt.verify(idToken, keys[kid], {
        algorithms: ['RS256'],
        audience: process.env.GOOGLE_CLIENT_ID,
        issuer: GOOGLE_ISSUERS,
    });
};

module.exports = { verifyGoogleIdToken };
