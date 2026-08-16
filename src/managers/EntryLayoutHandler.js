import { ref } from 'vue'
import { World } from '../ecs/core/World'

/**
 * EntryLayoutHandler class
 * Handles the measured Y position and height of entries' header elements,
 * used for drawing connection lines between entries.
 */
export default class EntryLayoutHandler {
  constructor(world = new World()) {
    // ECS world holding layout components
    this._world = world;
    // Reactive counter incremented on every layout change (set/clear).
    // ComponentStore wraps a plain Map, so Vue can't auto-track reads through it -
    // consumers must read this tick inside a computed() before calling a getter below.
    this._layoutsTick = ref(0);
  }

  /**
   * Reactive counter that increments whenever a layout is set or cleared.
   * Watch/read this to react to layout changes without deep reactivity.
   * @returns {import('vue').Ref<number>}
   */
  get layoutsTick() {
    return this._layoutsTick;
  }

  /**
   * Record the measured Y position and height of an entry's header element.
   * @param {string} entryId
   * @param {number} y
   * @param {number} height
   */
  addLayout(entryId, y, height) {
    this._world.layouts.add(entryId, { y, height });
    this._layoutsTick.value++;
  }

  /**
   * Get the measured layout of an entry.
   * @param {string} entryId
   * @returns {{ y: number, height: number } | undefined}
   */
  getLayout(entryId) {
    return this._world.layouts.get(entryId);
  }

  /**
   * Get all recorded layouts.
   * @returns {Array<[string, { y: number, height: number }]>}
   */
  getAllLayouts() {
    return Array.from(this._world.layouts.entries());
  }

  /**
   * Clear all recorded layouts.
   */
  clearLayouts() {
    this._world.layouts.clear();
    this._layoutsTick.value++;
  }
}
