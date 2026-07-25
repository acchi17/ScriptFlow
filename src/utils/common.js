/**
 * Convert a raw value to the type declared by dataType.
 * Null/undefined pass through unchanged (output params start as null).
 * @param {any} value
 * @param {string} dataType - 'integer' | 'real' | 'boolean' | 'string'
 * @returns {any} Converted value
 */
export function convertValue(value, dataType) {
  if (value === null || value === undefined) return value;
  switch (dataType) {
    case 'integer': {
      const n = parseInt(value, 10);
      return Number.isNaN(n) ? 0 : n;
    }
    case 'real': {
      const n = parseFloat(value);
      return Number.isNaN(n) ? 0 : n;
    }
    case 'boolean':
      return value === true || value === 'true';
    default:
      return value;
  }
}

/**
 * Convert a possibly-null value to its string form, or empty string if null/undefined.
 * @param {any} value
 * @returns {string}
 */
export function toEmptyIfNull(value) {
  return value == null ? '' : String(value);
}
