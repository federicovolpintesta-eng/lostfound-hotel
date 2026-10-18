/**
 * Security utilities module for Lost & Found Application
 * Provides defense-in-depth against Cross-Site Scripting (XSS),
 * Open Redirects, and PostgREST Query Filter Injections.
 */

/**
 * Escapes characters with special meaning in HTML to prevent XSS.
 * @param {any} input
 * @returns {string}
 */
export function escapeHTML(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str.replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case "'": return '&#39;';
      case '"': return '&quot;';
      default: return char;
    }
  });
}

/**
 * Validates and sanitizes a URL before injecting into src or href attributes.
 * Prevents javascript: pseudo-protocols and data: HTML injections.
 * @param {string} url
 * @returns {string} Safe URL or fallback placeholder
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  
  // Allow safe protocols only: http, https, and safe image data URIs
  const isSafeProtocol = /^(https?:|\/|data:image\/(jpeg|png|webp|gif);base64,)/i.test(trimmed);
  if (!isSafeProtocol) {
    console.warn('[Security] Blocked unsafe URL scheme:', trimmed.substring(0, 30));
    return '';
  }
  
  return trimmed;
}

/**
 * Sanitizes input before being passed into PostgREST filter expressions (.or(), .ilike()).
 * Prevents query manipulation and parameter injection.
 * @param {string} query
 * @returns {string}
 */
export function sanitizePostgrestQuery(query) {
  if (!query || typeof query !== 'string') return '';
  // Strip characters with operational meaning in PostgREST and SQL LIKE:
  // commas (split filters), parenthesis (grouping), % and _ (wildcards), and wildcards *
  return query.replace(/[,()%_.*\\"'`]/g, '').trim();
}
