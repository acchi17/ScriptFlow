/**
 * EntryDefinitionService
 * Provides block definitions and category information loaded from JSON.
 * I/O is delegated to PlatformService, which routes between Electron IPC
 * (read/write against <app-dir>/settings/BlockDefinitions.json) and the
 * browser fetch path (read-only against /settings/BlockDefinitions.json).
 */
export default class EntryDefinitionService {
  /**
   * Constructor
   * @param {Object} config Configuration object
   * @param {PlatformService} platformService Platform abstraction
   */
  constructor(config, platformService) {
    this.config = config;
    this.platformService = platformService;
    this.blockCategories = [];
    this.blockDefinitions = {};
  }

  /**
   * Cast a parameter value to its proper JS type based on dataType
   * @param {any} value - Raw value (may be a string from JSON)
   * @param {string} dataType - Data type ('integer', 'real', 'boolean', etc.)
   * @returns {any} Value cast to the appropriate type
   */
  _castParamValue(value, dataType) {
    if (value === null || value === undefined) return value;
    switch (dataType) {
      case 'integer':
        return parseInt(value, 10);
      case 'real':
        return parseFloat(value);
      case 'boolean':
        if (typeof value === 'boolean') return value;
        return value === 'true' || value === true;
      default:
        return value;
    }
  }

  /**
   * Load block definitions from JSON file
   * @return {Promise<Object>} Promise resolving to block definitions and category information
   */
  async loadBlockDefinitions() {
    // Initialize
    this.blockCategories = [];
    this.blockDefinitions = {};
    try {
      // Read block definitions through the platform abstraction
      const data = await this.platformService.readBlockDefinitions();
      // Process block categories and block definitions from JSON data
      if (Array.isArray(data && data.categories)) {
        data.categories.forEach(category => {
          const categoryInfo = {
            name: category.name,
            blocks: []
          };
          if (category.blocks && Array.isArray(category.blocks)) {
            category.blocks.forEach(block => {
              const blockName = block.name;
              categoryInfo.blocks.push(blockName);
              const blockDef = {
                name: blockName,
                category: category.name,
                command: block.command || '',
                parameters: {
                  input: [],
                  output: []
                }
              };
              if (block.parameters && Array.isArray(block.parameters)) {
                block.parameters.forEach(param => {
                  const paramDef = {
                    name: param.name,
                    dataType: param.dataType,
                    ctrlType: param.ctrlType,
                    default: param.default,
                    min: param.min,
                    max: param.max,
                    step: param.step,
                    items: param.items || [],
                    comment: param.comment || ''
                  };
                  if (param.prmType === 'input') {
                    blockDef.parameters.input.push(paramDef);
                  } else if (param.prmType === 'output') {
                    blockDef.parameters.output.push(paramDef);
                  }
                });
              }
              // Add block definition
              this.blockDefinitions[blockName] = blockDef;
            });
          }
          // Add block category
          this.blockCategories.push(categoryInfo);
        });
      }
      return {
        blockDefinitions: this.blockDefinitions,
        blockCategories: this.blockCategories
      };
    } catch (error) {
      console.error(`[${this.constructor.name}] loadBlockDefinitions() failed: ${error.message}`);
    }
  }

  moveBlockUp(blockName) {
    const cat = this.blockCategories.find(c => c.blocks.includes(blockName));
    if (!cat) return false;
    const idx = cat.blocks.indexOf(blockName);
    if (idx <= 0) return false;
    [cat.blocks[idx - 1], cat.blocks[idx]] = [cat.blocks[idx], cat.blocks[idx - 1]];
    return true;
  }

  moveBlockDown(blockName) {
    const cat = this.blockCategories.find(c => c.blocks.includes(blockName));
    if (!cat) return false;
    const idx = cat.blocks.indexOf(blockName);
    if (idx < 0 || idx >= cat.blocks.length - 1) return false;
    [cat.blocks[idx], cat.blocks[idx + 1]] = [cat.blocks[idx + 1], cat.blocks[idx]];
    return true;
  }

  removeBlock(blockName) {
    for (const cat of this.blockCategories) {
      const i = cat.blocks.indexOf(blockName);
      if (i >= 0) { cat.blocks.splice(i, 1); break; }
    }
    delete this.blockDefinitions[blockName];
  }

  renameBlock(oldName, newName) {
    const trimmed = newName?.trim();
    if (!trimmed || trimmed === oldName || this.blockDefinitions[trimmed]) return false;
    const cat = this.blockCategories.find(c => c.blocks.includes(oldName));
    if (!cat) return false;
    cat.blocks[cat.blocks.indexOf(oldName)] = trimmed;
    const def = this.blockDefinitions[oldName];
    def.name = trimmed;
    this.blockDefinitions[trimmed] = def;
    delete this.blockDefinitions[oldName];
    return true;
  }

  /**
   * Add a new block to the specified category.
   * The block's name defaults to 'NewBlock'; if a block with that name
   * already exists (in any category), a numeric suffix is appended
   * ('NewBlock1', 'NewBlock2', ...) until a free name is found.
   * The new block has no input or output parameters.
   * @param {string} categoryName Category to add the block to
   * @return {string|null} The new block's name, or null if the category is missing
   */
  addBlock(categoryName, blockName = null, insertIndex = null) {
    const cat = this.blockCategories.find(c => c.name === categoryName);
    if (!cat) return null;
    const base = blockName ?? 'NewBlock';
    let name = base;
    let i = 1;
    while (this.blockDefinitions[name]) {
      name = `${base}${i++}`;
    }
    if (insertIndex !== null) {
      cat.blocks.splice(insertIndex, 0, name);
    } else {
      cat.blocks.push(name);
    }
    this.blockDefinitions[name] = {
      name,
      category: categoryName,
      command: name,
      parameters: { input: [], output: [] }
    };
    return name;
  }

  addCategory(name, insertIndex = null) {
    const base = name ?? 'NewCategory';
    let candidate = base;
    let i = 1;
    while (this.blockCategories.some(c => c.name === candidate)) {
      candidate = `${base}${i++}`;
    }
    const entry = { name: candidate, blocks: [] };
    if (insertIndex !== null) {
      this.blockCategories.splice(insertIndex, 0, entry);
    } else {
      this.blockCategories.push(entry);
    }
    return candidate;
  }

  removeCategory(name) {
    const idx = this.blockCategories.findIndex(c => c.name === name);
    if (idx < 0) return false;
    const cat = this.blockCategories[idx];
    cat.blocks.forEach(blockName => { delete this.blockDefinitions[blockName]; });
    this.blockCategories.splice(idx, 1);
    return true;
  }

  renameCategory(oldName, newName) {
    const trimmed = newName?.trim();
    if (!trimmed || trimmed === oldName || this.blockCategories.some(c => c.name === trimmed)) return false;
    const cat = this.blockCategories.find(c => c.name === oldName);
    if (!cat) return false;
    cat.name = trimmed;
    cat.blocks.forEach(b => { if (this.blockDefinitions[b]) this.blockDefinitions[b].category = trimmed; });
    return true;
  }

  moveCategoryUp(name) {
    const idx = this.blockCategories.findIndex(c => c.name === name);
    if (idx <= 0) return false;
    [this.blockCategories[idx - 1], this.blockCategories[idx]] =
      [this.blockCategories[idx], this.blockCategories[idx - 1]];
    return true;
  }

  moveCategoryDown(name) {
    const idx = this.blockCategories.findIndex(c => c.name === name);
    if (idx < 0 || idx >= this.blockCategories.length - 1) return false;
    [this.blockCategories[idx], this.blockCategories[idx + 1]] =
      [this.blockCategories[idx + 1], this.blockCategories[idx]];
    return true;
  }

  addParam(blockName, prmType, insertIndex = null) {
    const def = this.blockDefinitions[blockName];
    if (!def) return null;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    const base = 'NewParam';
    let name = base;
    let i = 1;
    while (params.some(p => p.name === name)) { name = `${base}${i++}`; }
    const newParam = { name, dataType: 'integer', ctrlType: 'spinner', default: 0, min: -999, max: 999, step: 1, items: [], comment: '' };
    if (insertIndex !== null) {
      params.splice(insertIndex, 0, newParam);
    } else {
      params.push(newParam);
    }
    return name;
  }

  removeParam(blockName, prmType, paramName) {
    const def = this.blockDefinitions[blockName];
    if (!def) return false;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    const i = params.findIndex(p => p.name === paramName);
    if (i < 0) return false;
    params.splice(i, 1);
    return true;
  }

  moveParamUp(blockName, prmType, paramName) {
    const def = this.blockDefinitions[blockName];
    if (!def) return false;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    const idx = params.findIndex(p => p.name === paramName);
    if (idx <= 0) return false;
    [params[idx - 1], params[idx]] = [params[idx], params[idx - 1]];
    return true;
  }

  moveParamDown(blockName, prmType, paramName) {
    const def = this.blockDefinitions[blockName];
    if (!def) return false;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    const idx = params.findIndex(p => p.name === paramName);
    if (idx < 0 || idx >= params.length - 1) return false;
    [params[idx], params[idx + 1]] = [params[idx + 1], params[idx]];
    return true;
  }

  renameParam(blockName, prmType, oldName, newName) {
    const trimmed = newName?.trim();
    if (!trimmed || trimmed === oldName) return false;
    const def = this.blockDefinitions[blockName];
    if (!def) return false;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    if (params.some(p => p.name === trimmed)) return false;
    const param = params.find(p => p.name === oldName);
    if (!param) return false;
    param.name = trimmed;
    return true;
  }

  updateParam(blockName, prmType, paramName, updates) {
    const def = this.blockDefinitions[blockName];
    if (!def) return false;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    const param = params.find(p => p.name === paramName);
    if (!param) return false;
    Object.assign(param, updates);
    return true;
  }

  async saveBlockDefinitions() {
    const raw = {
      categories: this.blockCategories.map(cat => ({
        name: cat.name,
        blocks: cat.blocks.map(name => {
          const def = this.blockDefinitions[name];
          return {
            name: def.name,
            command: def.command,
            parameters: [
              ...def.parameters.input.map(p => ({ ...p, prmType: 'input' })),
              ...def.parameters.output.map(p => ({ ...p, prmType: 'output' }))
            ]
          };
        })
      }))
    };
    await this.platformService.writeBlockDefinitions(raw);
  }

  /**
   * Get all categories
   * @return {Array} Array of categories
   */
  getCategories() {
    return this.categories;
  }

  /**
   * Get list of blocks in specified category
   * @param {string} categoryName - Category name
   * @return {Array} Array of block names
   */
  getBlocksByCategory(categoryName) {
    const category = this.categories.find(cat => cat.name === categoryName);
    return category ? category.blocks : [];
  }

  /**
   * Get parameter definitions for a block
   * @param {string} blockName - Block name
   * @return {Object} Object containing input and output parameter definitions
   *                  in the form { input: { paramName: { value, type } }, output: { ... } }
   */
  getBlockParamDef(blockName) {
    const blockDef = this.blockDefinitions[blockName];
    if (!blockDef) return { input: {}, output: {} };
    
    const input = {};
    const output = {};
    
    blockDef.parameters.input.forEach(param => {
      input[param.name] = {
        value: param.default !== undefined ? this._castParamValue(param.default, param.dataType) : null,
        type: param.dataType
      };
    });

    blockDef.parameters.output.forEach(param => {
      output[param.name] = {
        value: param.default !== undefined ? this._castParamValue(param.default, param.dataType) : null,
        type: param.dataType
      };
    });
    
    return { input, output };
  }
}
