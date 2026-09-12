/**
 * Google Drive links (Saviour)
 *
 * We never hold bytes - the free Mongo tier can't and shouldn't. Every material
 * is a public Google Drive link, so this module is the one place that knows how
 * to validate one and how to turn it into preview and download URLs.
 *
 * Drive gives three useful URLs off one file id:
 *   view     https://drive.google.com/file/d/<id>/view        - open in Drive
 *   preview  https://drive.google.com/file/d/<id>/preview     - embeddable in an iframe
 *   download https://drive.google.com/uc?export=download&id=<id>
 *
 * The preview URL only renders when the file is shared "anyone with the link",
 * which makes the viewer itself the sharing check: if a custodian can't see the
 * document in the approval panel, neither can anybody else.
 */

const FILE_ID = '([A-Za-z0-9_-]{10,})';

const DRIVE_PATTERNS = [
    new RegExp(`^https://drive\\.google\\.com/file/d/${FILE_ID}`),
    new RegExp(`^https://drive\\.google\\.com/open\\?id=${FILE_ID}`),
    new RegExp(`^https://drive\\.google\\.com/uc\\?(?:export=\\w+&)?id=${FILE_ID}`),
];

const DOCS_PATTERN = new RegExp(
    `^https://docs\\.google\\.com/(document|spreadsheets|presentation)/d/${FILE_ID}`
);

const DRIVE_FOLDER = /^https:\/\/drive\.google\.com\/drive\/folders\//;

/**
 * Validate a pasted link and reduce it to { fileId, docType }.
 * Returns { ok: false, reason } for anything we can't preview.
 *
 * Only Google Drive is accepted. A random host can't be previewed, can't be
 * re-hosted into the saviour Drive by a custodian, and can vanish silently -
 * so it is refused rather than quietly accepted as a second-class link.
 */
const parseDriveLink = (input) => {
    const raw = String(input || '').trim();
    if (!raw) return { ok: false, reason: 'Paste the Google Drive link' };

    if (DRIVE_FOLDER.test(raw)) {
        return {
            ok: false,
            reason: 'That is a folder link. Open the file itself and share that, '
                + 'otherwise nobody can tell what is inside without digging.',
        };
    }

    for (const pattern of DRIVE_PATTERNS) {
        const match = pattern.exec(raw);
        if (match) return { ok: true, fileId: match[1], docType: 'file' };
    }

    const docsMatch = DOCS_PATTERN.exec(raw);
    if (docsMatch) {
        return { ok: true, fileId: docsMatch[2], docType: docsMatch[1] };
    }

    return {
        ok: false,
        reason: 'Only Google Drive links work here. Upload the file to your Drive, '
            + 'set sharing to "Anyone with the link", and paste that link.',
    };
};

/** The three URLs the client needs, derived from what we store. */
const driveUrls = ({ fileId, docType }) => {
    if (!fileId) return { view: null, preview: null, download: null };

    if (docType && docType !== 'file') {
        // Docs/Sheets/Slides preview through their own embed path and export as PDF
        return {
            view: `https://docs.google.com/${docType}/d/${fileId}/view`,
            preview: `https://docs.google.com/${docType}/d/${fileId}/preview`,
            download: `https://docs.google.com/${docType}/d/${fileId}/export?format=pdf`,
        };
    }

    return {
        view: `https://drive.google.com/file/d/${fileId}/view`,
        preview: `https://drive.google.com/file/d/${fileId}/preview`,
        download: `https://drive.google.com/uc?export=download&id=${fileId}`,
    };
};

/** Shape stored on a material, built from a validated link. */
const buildSource = (parsed, { origin, publicConfirmed, replacedFrom = null }) => ({
    fileId: parsed.fileId,
    docType: parsed.docType,
    url: driveUrls(parsed).view,
    origin,
    publicConfirmed: Boolean(publicConfirmed),
    replacedFrom,
});

module.exports = { parseDriveLink, driveUrls, buildSource };
