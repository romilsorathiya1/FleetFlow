/**
 * Input validation & sanitization helpers for API routes.
 * No external dependencies — pure JS.
 */

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Check if a string is a valid MongoDB ObjectId format.
 * @param {string} id
 * @returns {boolean}
 */
export function isValidObjectId(id) {
    if (!id || typeof id !== 'string') return false;
    return OBJECT_ID_REGEX.test(id);
}

/**
 * Sanitize a string: trim whitespace, cap at maxLength.
 * @param {string} str
 * @param {number} maxLength - default 500
 * @returns {string}
 */
export function sanitizeString(str, maxLength = 500) {
    if (str == null) return '';
    if (typeof str !== 'string') return String(str);
    return str.trim().slice(0, maxLength);
}

/**
 * Sanitize all string fields on an object in-place.
 * @param {object} obj
 * @param {object} fieldLengths - map of field name → max length e.g. { name: 100, description: 1000 }
 * @returns {object} - the same object, mutated
 */
export function sanitizeBody(obj, fieldLengths = {}) {
    if (!obj || typeof obj !== 'object') return obj;
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            const maxLen = fieldLengths[key] || 500;
            obj[key] = sanitizeString(value, maxLen);
        }
    }
    return obj;
}

/**
 * Validate that required fields are present and non-empty in the body.
 * @param {object} body
 * @param {string[]} fields
 * @returns {{ error: string, field: string, code: string } | null}
 */
export function validateRequired(body, fields) {
    for (const field of fields) {
        const value = body[field];
        if (value === undefined || value === null || value === '') {
            return {
                error: `${field} is required`,
                field,
                code: 'FIELD_REQUIRED',
            };
        }
    }
    return null;
}

/**
 * Validate that a value is a valid ObjectId. Returns error object or null.
 * @param {string} id
 * @param {string} fieldName
 * @returns {{ error: string, field: string, code: string } | null}
 */
export function validateObjectId(id, fieldName = 'id') {
    if (!isValidObjectId(id)) {
        return {
            error: `Invalid ${fieldName} format`,
            field: fieldName,
            code: 'INVALID_OBJECT_ID',
        };
    }
    return null;
}

/**
 * Validate that a number is within range.
 * @param {*} value
 * @param {string} fieldName
 * @param {{ min?: number, max?: number }} opts
 * @returns {{ error: string, field: string, code: string } | null}
 */
export function validateNumber(value, fieldName, { min, max } = {}) {
    const num = Number(value);
    if (isNaN(num)) {
        return {
            error: `${fieldName} must be a valid number`,
            field: fieldName,
            code: 'INVALID_NUMBER',
        };
    }
    if (min !== undefined && num < min) {
        return {
            error: `${fieldName} must be at least ${min}`,
            field: fieldName,
            code: 'NUMBER_TOO_SMALL',
        };
    }
    if (max !== undefined && num > max) {
        return {
            error: `${fieldName} must be at most ${max}`,
            field: fieldName,
            code: 'NUMBER_TOO_LARGE',
        };
    }
    return null;
}

/**
 * Validate email format (basic regex).
 * @param {string} email
 * @returns {{ error: string, field: string, code: string } | null}
 */
export function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return { error: 'Email is required', field: 'email', code: 'FIELD_REQUIRED' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return { error: 'Invalid email format', field: 'email', code: 'INVALID_EMAIL' };
    }
    return null;
}
