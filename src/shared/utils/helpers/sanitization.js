/**
 * Input Sanitization Utilities
 * Provides secure validation and sanitization for user inputs to prevent NoSQL injection
 * and other security vulnerabilities.
 */

/**
 * Sanitize a slug parameter
 * @param {string} slug - The slug to sanitize
 * @returns {string} - The sanitized slug
 * @throws {Error} - If slug is invalid
 */
const sanitizeSlug = (slug) => {
    // 1. Type check
    if (typeof slug !== 'string') {
        throw new Error('Invalid slug: must be a string');
    }

    // 2. Trim whitespace
    slug = slug.trim();

    // 3. Length validation (max 100 characters)
    if (slug.length === 0) {
        throw new Error('Invalid slug: cannot be empty');
    }

    if (slug.length > 100) {
        throw new Error('Invalid slug: too long (max 100 characters)');
    }

    // 4. Whitelist validation: only lowercase letters, numbers, hyphens
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
        throw new Error('Invalid slug: only lowercase letters, numbers, and hyphens allowed');
    }

    // 5. Prevent consecutive hyphens or leading/trailing hyphens
    if (slug.startsWith('-') || slug.endsWith('-')) {
        throw new Error('Invalid slug: cannot start or end with hyphen');
    }

    if (slug.includes('--')) {
        throw new Error('Invalid slug: consecutive hyphens not allowed');
    }

    return slug;
};

/**
 * Sanitize an ObjectId parameter
 * @param {string} id - The ObjectId to sanitize
 * @returns {string} - The sanitized ObjectId
 * @throws {Error} - If ObjectId is invalid
 */
const sanitizeObjectId = (id) => {
    // Type check
    if (typeof id !== 'string') {
        throw new Error('Invalid ObjectId: must be a string');
    }

    // Strict 24-character hex validation
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
        throw new Error('Invalid ObjectId: must be 24 character hexadecimal string');
    }

    return id;
};

/**
 * Sanitize search query parameter
 * @param {string} query - The search query to sanitize
 * @returns {string} - The sanitized query
 * @throws {Error} - If query is invalid
 */
const sanitizeSearchQuery = (query) => {
    if (typeof query !== 'string') {
        throw new Error('Invalid search query: must be a string');
    }

    // Trim whitespace
    query = query.trim();

    // Length validation
    if (query.length > 200) {
        throw new Error('Invalid search query: too long (max 200 characters)');
    }

    // Remove special characters that could be used for injection
    // Allow: letters, numbers, spaces, basic punctuation
    const sanitized = query.replace(/[^a-zA-Z0-9\s\-_.]/g, '');

    return sanitized;
};

module.exports = {
    sanitizeSlug,
    sanitizeObjectId,
    sanitizeSearchQuery
};
