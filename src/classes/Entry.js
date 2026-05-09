/**
 * Entry class
 * Class that represents the element that make up a recipe
 */
export default class Entry {
  /**
   * Generate UUID using crypto.randomUUID() with fallback
   * @returns {string} Generated UUID
   */
  static generateUUID() {
    // Use crypto.randomUUID() if available (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback implementation for older browsers
    return Entry.fallbackUUID();
  }
  
  /**
   * Fallback UUID generation using Math.random()
   * @returns {string} Generated UUID v4 format
   */
  static fallbackUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Constructor
   * @param {string} name - Name of the entry
   * @param {string|null} id - Unique ID of the entry (auto-generated if null)
   */
  constructor(name = '', id = null) {
    this.name = name; // Name of the entry
    this.id = id || Entry.generateUUID(); // Unique ID (auto-generated if null)
    this.type = '';
    this.children = []; // Array of child elements (empty array by default)
  }
}
