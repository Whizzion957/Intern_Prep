/**
 * Google Drive access for Saviour (client)
 *
 * Login uses only a Google ID token (GoogleSignInButton). These flows need
 * more: a short-lived OAuth access token with the drive.file scope, plus the
 * Google Picker. Both are loaded lazily and only when a custodian or adder
 * actually reaches for a Drive action, so the rest of the app never pays for
 * them.
 *
 * drive.file is per-file: the app can only touch files the user creates through
 * it or explicitly picks. Picking a folder is what grants write access to that
 * folder; picking a file is what lets us set its sharing.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const loadScript = (src) =>
    new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const el = document.createElement('script');
        el.src = src;
        el.async = true;
        el.onload = resolve;
        el.onerror = () => reject(new Error(`Could not load ${src}`));
        document.head.appendChild(el);
    });

// The GIS library (accounts.oauth2) and the Picker (via gapi) each load once.
let gisReady = null;
let pickerReady = null;

const ensureGis = () => {
    if (!gisReady) {
        gisReady = loadScript('https://accounts.google.com/gsi/client').then(() => {
            if (!window.google?.accounts?.oauth2) throw new Error('Google auth failed to load');
        });
    }
    return gisReady;
};

const ensurePicker = () => {
    if (!pickerReady) {
        pickerReady = loadScript('https://apis.google.com/js/api.js').then(
            () => new Promise((resolve, reject) => {
                window.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('Picker failed to load')) });
            })
        );
    }
    return pickerReady;
};

const missingConfig = () => !CLIENT_ID || !API_KEY;

/**
 * A fresh drive.file access token. Prompts the user the first time to grant the
 * scope; after that it is usually silent. Never stored - callers use it at once
 * and hand it to the server for a single action.
 */
export const getDriveToken = async () => {
    if (missingConfig()) throw new Error('Google Drive is not configured (VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_API_KEY)');
    await ensureGis();
    return new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: DRIVE_SCOPE,
            callback: (response) => {
                if (response.error) return reject(new Error(response.error_description || response.error));
                resolve(response.access_token);
            },
            error_callback: (err) => reject(new Error(err?.message || 'Drive access was cancelled')),
        });
        client.requestAccessToken();
    });
};

// Open the Picker and resolve with the chosen doc, or null if cancelled.
const openPicker = (accessToken, buildView) =>
    new Promise((resolve, reject) => {
        ensurePicker()
            .then(() => {
                const picker = new window.google.picker.PickerBuilder()
                    .setOAuthToken(accessToken)
                    .setDeveloperKey(API_KEY)
                    .addView(buildView(window.google.picker))
                    .setCallback((data) => {
                        const { Action } = window.google.picker;
                        if (data.action === Action.PICKED) {
                            const doc = data.docs[0];
                            resolve({ id: doc.id, name: doc.name, url: doc.url, mimeType: doc.mimeType });
                        } else if (data.action === Action.CANCEL) {
                            resolve(null);
                        }
                    })
                    .build();
                picker.setVisible(true);
            })
            .catch(reject);
    });

/** Pick one of the user's Drive folders. Grants the app write access to it. */
export const pickFolder = (accessToken) =>
    openPicker(accessToken, (picker) =>
        new picker.DocsView(picker.ViewId.FOLDERS)
            .setSelectFolderEnabled(true)
            .setIncludeFolders(true)
            .setMode(picker.DocsViewMode.LIST)
    );

/** Pick one of the user's Drive files. Grants the app access to that file. */
export const pickFile = (accessToken) =>
    openPicker(accessToken, (picker) =>
        new picker.DocsView(picker.ViewId.DOCS).setIncludeFolders(false)
    );

/**
 * Share a picked file "anyone with the link" so the app can preview it. Done
 * client-side (Drive supports CORS for authorized calls) to avoid a round trip;
 * drive.file permits this on a file the user just picked.
 */
export const setAnyoneWithLink = async (accessToken, fileId) => {
    const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        }
    );
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message || 'Could not set the file to shareable');
    }
};

export const driveConfigured = () => !missingConfig();
