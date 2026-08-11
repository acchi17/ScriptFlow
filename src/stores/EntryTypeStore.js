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
  add(entryId, type, name) {
    if (!entryId) return;
    this._typesById.set(entryId, { type, name });
  }

  /**
   * Get the type and name of an entry
   * @param {string} entryId - ID of the entry
   * @returns {{type: string, name: string}|undefined} Type and name of the entry, or undefined if not registered
   */
  get(entryId) {
    return this._typesById.get(entryId);
  }

  /**
   * Remove type/name data for an entry
   * @param {string} entryId - ID of the entry
   */
  remove(entryId) {
    if (!entryId) return;
    this._typesById.delete(entryId);
  }
}
