export default class BlockDefinitionManager {
  static CTRL_TYPE_OPTIONS = {
    numeric: new Map([
      ['Spinner',  'spinner'],
      ['ComboBox', 'combo_box'],
    ]),
    boolean: new Map([
      ['CheckBox', 'check_box'],
    ]),
    string: new Map([
      ['TextBox',  'text_box'],
      ['ComboBox', 'combo_box'],
    ]),
  };

  static DATA_TYPE_OPTIONS = new Map([
    ['Integer', 'integer'],
    ['Real',    'real'],
    ['Boolean', 'boolean'],
    ['String',  'string'],
  ]);

  _freshParamValueFields() {
    return { initial: null, min: null, max: null, step: null, items: [] };
  }

  constructor(blockDefinitions) {
    this._blockDefinitions = blockDefinitions;
  }

  getBlockDefinitions() { return this._blockDefinitions; }

  getBlockDefinition(blockName) {
    return this._blockDefinitions.flatMap(c => c.blocks).find(b => b.name === blockName);
  }

  moveBlockUp(blockName) {
    const cat = this._blockDefinitions.find(c => c.blocks.some(b => b.name === blockName));
    if (!cat) return false;
    const idx = cat.blocks.findIndex(b => b.name === blockName);
    if (idx <= 0) return false;
    [cat.blocks[idx - 1], cat.blocks[idx]] = [cat.blocks[idx], cat.blocks[idx - 1]];
    return true;
  }

  moveBlockDown(blockName) {
    const cat = this._blockDefinitions.find(c => c.blocks.some(b => b.name === blockName));
    if (!cat) return false;
    const idx = cat.blocks.findIndex(b => b.name === blockName);
    if (idx < 0 || idx >= cat.blocks.length - 1) return false;
    [cat.blocks[idx], cat.blocks[idx + 1]] = [cat.blocks[idx + 1], cat.blocks[idx]];
    return true;
  }

  removeBlock(blockName) {
    for (const cat of this._blockDefinitions) {
      const i = cat.blocks.findIndex(b => b.name === blockName);
      if (i >= 0) { cat.blocks.splice(i, 1); break; }
    }
  }

  renameBlock(oldName, newName) {
    const trimmed = newName?.trim();
    if (!trimmed || trimmed === oldName || this.getBlockDefinition(trimmed)) return false;
    const cat = this._blockDefinitions.find(c => c.blocks.some(b => b.name === oldName));
    if (!cat) return false;
    const block = cat.blocks.find(b => b.name === oldName);
    block.name = trimmed;
    block.command = trimmed;
    return true;
  }

  addBlock(categoryName, blockName = null, insertIndex = null) {
    const cat = this._blockDefinitions.find(c => c.name === categoryName);
    if (!cat) return null;
    const base = blockName ?? 'NewBlock';
    let name = base;
    let i = 1;
    while (this.getBlockDefinition(name)) { name = `${base}${i++}`; }
    const newBlock = { name, command: name, parameters: { input: [], output: [] } };
    if (insertIndex !== null) cat.blocks.splice(insertIndex, 0, newBlock);
    else cat.blocks.push(newBlock);
    return name;
  }

  addCategory(name, insertIndex = null) {
    const base = name ?? 'NewCategory';
    let candidate = base;
    let i = 1;
    while (this._blockDefinitions.some(c => c.name === candidate)) { candidate = `${base}${i++}`; }
    const entry = { name: candidate, blocks: [] };
    if (insertIndex !== null) this._blockDefinitions.splice(insertIndex, 0, entry);
    else this._blockDefinitions.push(entry);
    return candidate;
  }

  removeCategory(name) {
    const idx = this._blockDefinitions.findIndex(c => c.name === name);
    if (idx < 0) return false;
    this._blockDefinitions.splice(idx, 1);
    return true;
  }

  renameCategory(oldName, newName) {
    const trimmed = newName?.trim();
    if (!trimmed || trimmed === oldName || this._blockDefinitions.some(c => c.name === trimmed)) return false;
    const cat = this._blockDefinitions.find(c => c.name === oldName);
    if (!cat) return false;
    cat.name = trimmed;
    return true;
  }

  moveCategoryUp(name) {
    const idx = this._blockDefinitions.findIndex(c => c.name === name);
    if (idx <= 0) return false;
    [this._blockDefinitions[idx - 1], this._blockDefinitions[idx]] =
      [this._blockDefinitions[idx], this._blockDefinitions[idx - 1]];
    return true;
  }

  moveCategoryDown(name) {
    const idx = this._blockDefinitions.findIndex(c => c.name === name);
    if (idx < 0 || idx >= this._blockDefinitions.length - 1) return false;
    [this._blockDefinitions[idx], this._blockDefinitions[idx + 1]] =
      [this._blockDefinitions[idx + 1], this._blockDefinitions[idx]];
    return true;
  }

  addParam(blockName, prmType, insertIndex = null) {
    const def = this.getBlockDefinition(blockName);
    if (!def) return null;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    const base = 'NewParam';
    let name = base;
    let i = 1;
    while (params.some(p => p.name === name)) { name = `${base}${i++}`; }
    const newParam = { name, dataType: '', ctrlType: '', ...this._freshParamValueFields(), comment: '' };
    if (insertIndex !== null) params.splice(insertIndex, 0, newParam);
    else params.push(newParam);
    return name;
  }

  removeParam(blockName, prmType, paramName) {
    const def = this.getBlockDefinition(blockName);
    if (!def) return false;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    const i = params.findIndex(p => p.name === paramName);
    if (i < 0) return false;
    params.splice(i, 1);
    return true;
  }

  moveParamUp(blockName, prmType, paramName) {
    const def = this.getBlockDefinition(blockName);
    if (!def) return false;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    const idx = params.findIndex(p => p.name === paramName);
    if (idx <= 0) return false;
    [params[idx - 1], params[idx]] = [params[idx], params[idx - 1]];
    return true;
  }

  moveParamDown(blockName, prmType, paramName) {
    const def = this.getBlockDefinition(blockName);
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
    const def = this.getBlockDefinition(blockName);
    if (!def) return false;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    if (params.some(p => p.name === trimmed)) return false;
    const param = params.find(p => p.name === oldName);
    if (!param) return false;
    param.name = trimmed;
    return true;
  }

  updateParam(blockName, prmType, paramName, updates) {
    const def = this.getBlockDefinition(blockName);
    if (!def) return false;
    const params = prmType === 'input' ? def.parameters.input : def.parameters.output;
    const param = params.find(p => p.name === paramName);
    if (!param) return false;
    if ('dataType' in updates && updates.dataType !== param.dataType) {
      Object.assign(param, { ctrlType: '', ...this._freshParamValueFields() });
    } else if ('ctrlType' in updates && updates.ctrlType !== param.ctrlType) {
      Object.assign(param, this._freshParamValueFields());
    }
    Object.assign(param, updates);
    return true;
  }
}
