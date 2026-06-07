import BlockDefinitionStore from './BlockDefinitionStore.js';

/**
 * EntryDefinitionService
 * Composes a BlockDefinitionStore for data and mutation. This service is
 * responsible only for I/O (load/save via PlatformService) and query helpers.
 */
export default class EntryDefinitionService {
  constructor(config, platformService) {
    this.config = config;
    this.platformService = platformService;
    this._store = new BlockDefinitionStore();
  }

  get blockCategories() { return this._store.blockCategories; }
  get blockDefinitions() { return this._store.blockDefinitions; }

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

  async loadBlockDefinitions() {
    this._store.blockCategories = [];
    this._store.blockDefinitions = {};
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
              this._store.blockDefinitions[blockName] = blockDef;
            });
          }
          this._store.blockCategories.push(categoryInfo);
        });
      }
      return {
        blockDefinitions: this._store.blockDefinitions,
        blockCategories: this._store.blockCategories
      };
    } catch (error) {
      console.error(`[${this.constructor.name}] loadBlockDefinitions() failed: ${error.message}`);
    }
  }

  async saveBlockDefinitions() {
    const raw = {
      categories: this._store.blockCategories.map(cat => ({
        name: cat.name,
        blocks: cat.blocks.map(name => {
          const def = this._store.blockDefinitions[name];
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
    const blockDef = this._store.blockDefinitions[blockName];
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
