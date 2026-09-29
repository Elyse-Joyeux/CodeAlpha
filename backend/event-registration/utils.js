const isObjectId = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

// Trimmed string, or '' when the value is not a string
const str = (v) => (typeof v === 'string' ? v.trim() : '');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { isObjectId, str, escapeRegex };
