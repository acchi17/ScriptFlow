/**
 * Container class
 * Class that inherits from Entry class and corresponds to a lime-colored rectangle
 * Container can contain other entries (Block or Container) inside
 */
import { reactive } from 'vue';
import Entry from './Entry';

export default class Container extends Entry {
  /**
   * Constructor
   * @param {string} name - Name of the container
   * @param {string|null} id - Unique ID of the container (auto-generated if null)
   */
  constructor(name = '', id = null) {
    super(name, id);
    this.type = 'container';  // Container type
    this.children = reactive([]); // Array of child elements
  }
}
