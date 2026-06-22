import BlockDefinition from './BlockDefinition.js';

/**
 * EntryDefinitionService
 * Owns the authoritative blockCategories and blockDefinitions.
 * I/O is delegated to PlatformService.
 * Use getBlockDefinition() to get an isolated BlockDefinition for editing.
 */
export default class EntryDefinitionService {
  constructor(config, platformService) {
    this.config = config;
    this.platformService = platformService;
    this.blockCategories = [];
    this.blockDefinitions = {};
  }

  /**
   * Returns a new BlockDefinition pre-populated with deep clones of the
   * current blockCategories and blockDefinitions.
   */
  getBlockDefinition() {
    return new BlockDefinition(
      JSON.parse(JSON.stringify(this.blockCategories)),
      JSON.parse(JSON.stringify(this.blockDefinitions))
    );
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
    this.blockCategories = [];
    this.blockDefinitions = {};
    try {
      const data = await this.platformService.readBlockDefinitions();
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
              this.blockDefinitions[blockName] = blockDef;
            });
          }
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

  updateBlockDefinition(blockCategories, blockDefinitions) {
    this.blockCategories = JSON.parse(JSON.stringify(blockCategories));
    this.blockDefinitions = JSON.parse(JSON.stringify(blockDefinitions));
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
