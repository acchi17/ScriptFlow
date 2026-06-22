import BlockDefinition from './BlockDefinition.js';

/**
 * EntryDefinitionService
 * Owns the authoritative blockDefinitions (array of categories with embedded block defs).
 * I/O is delegated to PlatformService.
 * Use getBlockDefinition() to get an isolated BlockDefinition for editing.
 */
export default class EntryDefinitionService {
  constructor(config, platformService) {
    this.config = config;
    this.platformService = platformService;
    this.blockDefinitions = [];
  }

  /**
   * Returns a new BlockDefinition pre-populated with a deep clone of the
   * current blockDefinitions.
   */
  getBlockDefinition() {
    return new BlockDefinition(
      JSON.parse(JSON.stringify(this.blockDefinitions))
    );
  }

  getBlockByName(blockName) {
    return this.blockDefinitions.flatMap(c => c.blocks).find(b => b.name === blockName);
  }

  _castParamValue(value, dataType) {
    if (value === null || value === undefined) return value;
    switch (dataType) {
      case 'integer': return parseInt(value, 10);
      case 'real':    return parseFloat(value);
      case 'boolean':
        if (typeof value === 'boolean') return value;
        return value === 'true' || value === true;
      default:        return value;
    }
  }

  async loadBlockDefinitions() {
    this.blockDefinitions = [];
    try {
      const data = await this.platformService.readBlockDefinitions();
      if (Array.isArray(data && data.categories)) {
        data.categories.forEach(category => {
          const categoryEntry = {
            name: category.name,
            blocks: []
          };
          if (category.blocks && Array.isArray(category.blocks)) {
            category.blocks.forEach(block => {
              const blockDef = {
                name: block.name,
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
              categoryEntry.blocks.push(blockDef);
            });
          }
          this.blockDefinitions.push(categoryEntry);
        });
      }
      return this.blockDefinitions;
    } catch (error) {
      console.error(`[${this.constructor.name}] loadBlockDefinitions() failed: ${error.message}`);
    }
  }

  updateBlockDefinition(blockDefinitions) {
    this.blockDefinitions = JSON.parse(JSON.stringify(blockDefinitions));
  }

  async saveBlockDefinitions() {
    const raw = {
      categories: this.blockDefinitions.map(cat => ({
        name: cat.name,
        blocks: cat.blocks.map(def => ({
          name: def.name,
          command: def.command,
          parameters: [
            ...def.parameters.input.map(p => ({ ...p, prmType: 'input' })),
            ...def.parameters.output.map(p => ({ ...p, prmType: 'output' }))
          ]
        }))
      }))
    };
    await this.platformService.writeBlockDefinitions(raw);
  }

  getBlockParamDef(blockName) {
    const blockDef = this.getBlockByName(blockName);
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
