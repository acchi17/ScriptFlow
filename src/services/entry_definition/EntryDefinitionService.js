/**
 * EntryDefinitionService
 * Owns the authoritative blockDefinitions (array of categories with embedded block defs).
 * I/O is delegated to PlatformService.
 */
export default class EntryDefinitionService {
  constructor(config, platformService) {
    this.config = config;
    this.platformService = platformService;
    this._blockDefinitions = [];
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
    this._blockDefinitions = [];
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
                  if (param.prmType === 'input') {
                    blockDef.parameters.input.push({
                      name: param.name,
                      dataType: param.dataType,
                      ctrlType: param.ctrlType,
                      initial: param.initial,
                      min: param.min,
                      max: param.max,
                      step: param.step,
                      items: param.items || [],
                      comment: param.comment || ''
                    });
                  } else if (param.prmType === 'output') {
                    blockDef.parameters.output.push({
                      name: param.name,
                      dataType: param.dataType,
                      comment: param.comment || ''
                    });
                  }
                });
              }
              categoryEntry.blocks.push(blockDef);
            });
          }
          this._blockDefinitions.push(categoryEntry);
        });
      }
      return this._blockDefinitions;
    } catch (error) {
      console.error(`[${this.constructor.name}] loadBlockDefinitions() failed: ${error.message}`);
    }
  }

  async saveBlockDefinitions() {
    const raw = {
      categories: this._blockDefinitions.map(cat => ({
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

  getBlockDefinitions() {
    return this._blockDefinitions;
  }

  setBlockDefinitions(blockDefinitions) {
    this._blockDefinitions = JSON.parse(JSON.stringify(blockDefinitions));
  }

  getBlockDefinition(blockName) {
    return this._blockDefinitions.flatMap(c => c.blocks).find(b => b.name === blockName);
  }

  getBlockParamDef(blockName) {
    const blockDef = this.getBlockDefinition(blockName);
    if (!blockDef) return { input: {}, output: {} };
    const input = {};
    const output = {};
    blockDef.parameters.input.forEach(param => {
      input[param.name] = {
        value: param.initial !== undefined ? this._castParamValue(param.initial, param.dataType) : null,
        type: param.dataType
      };
    });
    blockDef.parameters.output.forEach(param => {
      output[param.name] = {
        value: param.initial !== undefined ? this._castParamValue(param.initial, param.dataType) : null,
        type: param.dataType
      };
    });
    return { input, output };
  }
}
