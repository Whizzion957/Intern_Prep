/**
 * Google Drive REST helper (Saviour)
 *
 * The counterpart to services/drive.js (which only knows URL shapes): this one
 * actually talks to the Drive API, so the app can move a student's file into a
 * custodian's Saviour folder without them downloading and re-uploading by hand.
 *
 * Two different credentials, on purpose:
 *   - Reading a student's file uses the app API key. The file is public
 *     ("anyone with the link"), and the v3 files.get?alt=media path returns the
 *     bytes directly, skipping the large-file "confirm download" HTML page that
 *     the uc?export=download URL hits.
 *   - Writing into the custodian's folder uses the CUSTODIAN's short-lived
 *     OAuth access token (drive.file scope). We never store it; it is passed in
 *     per action and used immediately. drive.file lets the app create files and
 *     parent them under a folder the custodian granted through the Picker.
 *
 * drive.file cannot read an arbitrary file the app never opened, which is why
 * the move is download-public-then-upload rather than a server-side files.copy.
 */

const { Transform } = require('stream');
const axios = require('axios');

const API_KEY = process.env.GOOGLE_API_KEY;

// Files above this are left to the manual paste-a-link relink: streaming very
// large files through a serverless function is where time/memory limits bite.
const MAX_MOVE_BYTES = 30 * 1024 * 1024;

const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

// Native Google types can't be streamed as-is; export them to PDF for the copy.
const EXPORT_AS_PDF = new Set([
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
    'application/vnd.google-apps.drawing',
]);

class TooLargeError extends Error {
    constructor(message) {
        super(message);
        this.code = 'FILE_TOO_LARGE';
    }
}

const requireApiKey = () => {
    if (!API_KEY) throw new Error('GOOGLE_API_KEY is not configured');
};

/** Public metadata for one file, or null if it isn't readable (not public / gone). */
const getPublicFileMeta = async (fileId) => {
    requireApiKey();
    try {
        const { data } = await axios.get(`${DRIVE}/files/${fileId}`, {
            params: { fields: 'id,name,mimeType,size', key: API_KEY, supportsAllDrives: true },
            timeout: 8000,
        });
        return data;
    } catch (error) {
        if (error.response && [401, 403, 404].includes(error.response.status)) return null;
        throw error;
    }
};

// Abort a stream that runs past the cap, so an export with no declared size
// can't blow the memory/time budget mid-flight.
const capStream = (source, maxBytes) => {
    let seen = 0;
    const guard = new Transform({
        transform(chunk, _enc, cb) {
            seen += chunk.length;
            if (seen > maxBytes) {
                cb(new TooLargeError('File exceeds the auto-move size limit'));
                return;
            }
            cb(null, chunk);
        },
    });
    source.on('error', (err) => guard.destroy(err));
    return source.pipe(guard);
};

/**
 * Read a public file for copying. Returns { name, mimeType, stream } or throws
 * TooLargeError when it is over the cap. Google-native docs come back as PDF.
 */
const downloadPublicFile = async (fileId) => {
    requireApiKey();
    const meta = await getPublicFileMeta(fileId);
    if (!meta) {
        const err = new Error('The file is not shared publicly, or no longer exists');
        err.code = 'NOT_PUBLIC';
        throw err;
    }

    const isNative = EXPORT_AS_PDF.has(meta.mimeType);
    if (!isNative && meta.size && Number(meta.size) > MAX_MOVE_BYTES) {
        throw new TooLargeError('File is larger than the auto-move limit');
    }

    const url = isNative
        ? `${DRIVE}/files/${fileId}/export`
        : `${DRIVE}/files/${fileId}`;
    const params = isNative
        ? { mimeType: 'application/pdf', key: API_KEY }
        : { alt: 'media', key: API_KEY, supportsAllDrives: true };

    const response = await axios.get(url, { params, responseType: 'stream', timeout: 20000 });

    return {
        name: isNative ? `${meta.name}.pdf` : meta.name,
        mimeType: isNative ? 'application/pdf' : meta.mimeType,
        stream: capStream(response.data, MAX_MOVE_BYTES),
    };
};

/**
 * Resumable upload of a stream into a folder, authorized by the custodian's
 * access token. Returns the new file id. The folder must be one the custodian
 * granted the app through the Picker (a drive.file requirement).
 */
const uploadToFolder = async (accessToken, folderId, { name, mimeType, stream }) => {
    // 1. Open a resumable session with the target metadata.
    const session = await axios.post(
        `${UPLOAD}/files`,
        { name, parents: [folderId] },
        {
            params: { uploadType: 'resumable', supportsAllDrives: true, fields: 'id' },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': mimeType || 'application/octet-stream',
            },
            timeout: 15000,
        }
    );

    const sessionUri = session.headers.location;
    if (!sessionUri) throw new Error('Drive did not return an upload session');

    // 2. Send the bytes. maxBodyLength/maxContentLength off so axios streams it.
    const { data } = await axios.put(sessionUri, stream, {
        headers: { 'Content-Type': mimeType || 'application/octet-stream' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 120000,
    });

    return data.id;
};

/** Make a Picker-granted file readable by "anyone with the link". */
const setAnyoneWithLink = async (accessToken, fileId) => {
    await axios.post(
        `${DRIVE}/files/${fileId}/permissions`,
        { role: 'reader', type: 'anyone' },
        {
            params: { supportsAllDrives: true },
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 10000,
        }
    );
};

module.exports = {
    MAX_MOVE_BYTES,
    TooLargeError,
    getPublicFileMeta,
    downloadPublicFile,
    uploadToFolder,
    setAnyoneWithLink,
};
