/**
 * HTML Sanitization Utility
 * 
 * Uses DOMPurify to prevent XSS attacks when rendering user-provided HTML.
 * Use this whenever rendering HTML with dangerouslySetInnerHTML.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - Raw HTML content
 * @returns {string} - Sanitized HTML safe for rendering
 */
export const sanitizeHTML = (html) => {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
        // Allow common formatting tags
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'a', 'span', 'div',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'img', 'hr',
        ],
        // Allow safe attributes
        ALLOWED_ATTR: [
            'href', 'target', 'rel', 'class', 'style',
            'src', 'alt', 'width', 'height',
        ],
        // Force links to open in new tab and be safe
        ADD_ATTR: ['target', 'rel'],
        FORCE_BODY: true,
    });
};

/**
 * Create props for dangerouslySetInnerHTML with sanitization
 * @param {string} html - Raw HTML content
 * @returns {object} - Props object for dangerouslySetInnerHTML
 */
export const createSafeHTML = (html) => ({
    dangerouslySetInnerHTML: { __html: sanitizeHTML(html) },
});

export default sanitizeHTML;
