/**
 * Block class
 * Class that inherits from Entry class
 */
import Entry from './Entry';

export default class Block extends Entry {
  /**
   * Constructor
   * @param {string} name - Name of the block
   * @param {string|null} id - Unique ID of the block (auto-generated if null)
   */
  constructor(name = '', id = null) {
    super(name, id);
    this.type = 'block';
  }
}
