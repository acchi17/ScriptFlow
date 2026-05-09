import { reactive } from 'vue'

/**
 * EntryLayoutManager
 * Stores the measured Y position and height of each entry's header element.
 * Used to align connection lines in the connection panel with entry headers.
 */
export default class EntryLayoutManager {
  constructor() {
    // entryId → { y, height }
    this._layoutMap = reactive(new Map())
  }

  /**
   * @param {string} id
   * @param {number} y
   * @param {number} height
   */
  setLayout(id, y, height) {
    this._layoutMap.set(id, { y, height })
  }

  /**
   * @param {string} id
   * @returns {{ y: number, height: number } | undefined}
   */
  getLayout(id) {
    return this._layoutMap.get(id)
  }

  /** @param {string} id */
  deleteLayout(id) {
    this._layoutMap.delete(id)
  }

  clearAll() {
    this._layoutMap.clear()
  }

  /** @returns {Map<string, {y: number, height: number}>} */
  get layoutMap() {
    return this._layoutMap
  }
}
