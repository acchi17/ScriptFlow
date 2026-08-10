/**
 * EntryTypeStore class
 * Class that maps entry IDs to their type and name
 */
export default class EntryTypeStore {
  constructor() {
    // Dictionary of entry IDs and their {type, name}
    this._typesById = new Map();
  }

  /**
   * Register the type and name of an entry
   * @param {string} entryId - ID of the entry
   * @param {string} type - Type of the entry ('block' or 'container')
   * @param {string} name - Name of the entry
   */
  setEntry(entryId, type, name) {
    if (!entryId) return;
    this._typesById.set(entryId, { type, name });
  }

  /**
   * Get the type of an entry
   * @param {string} entryId - ID of the entry
   * @returns {string|undefined} Type of the entry, or undefined if not registered
   */
  getType(entryId) {
    return this._typesById.get(entryId)?.type;
  }

  /**
   * Get the name of an entry
   * @param {string} entryId - ID of the entry
   * @returns {string|undefined} Name of the entry, or undefined if not registered
   */
  getName(entryId) {
    return this._typesById.get(entryId)?.name;
  }

  /**
   * Remove type/name data for an entry
   * @param {string} entryId - ID of the entry
   */
  removeEntry(entryId) {
    if (!entryId) return;
    this._typesById.delete(entryId);
  }
}
