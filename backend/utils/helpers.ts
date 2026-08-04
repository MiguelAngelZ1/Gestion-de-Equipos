/**
 * Wraps an async Express handler so thrown errors are forwarded to next() automatically.
 * Eliminates the need for try/catch in every controller function.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Normalizes text by removing diacritics, trimming, and lowercasing.
 * Shared across controllers and services for consistent comparisons.
 */
const normalizeText = (value = '') => String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

module.exports = { asyncHandler, normalizeText };
