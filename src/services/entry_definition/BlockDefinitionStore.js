export default class BlockDefinitionStore {
  constructor() {
    this.blockCategories = [];
    this.blockDefinitions = {};
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

  addBlock(categoryName, blockName = null, insertIndex = null) {
    const cat = this.blockCategories.find(c => c.name === categoryName);
    if (!cat) return null;
    const base = blockName ?? 'NewBlock';
    let name = base;
    let i = 1;
    while (this.blockDefinitions[name]) { name = `${base}${i++}`; }
    if (insertIndex !== null) cat.blocks.splice(insertIndex, 0, name);
    else cat.blocks.push(name);
    this.blockDefinitions[name] = {
      name, category: categoryName, command: name, parameters: { input: [], output: [] }
    };
    return name;
  }

  addCategory(name, insertIndex = null) {
    const base = name ?? 'NewCategory';
    let candidate = base;
    let i = 1;
    while (this.blockCategories.some(c => c.name === candidate)) { candidate = `${base}${i++}`; }
    const entry = { name: candidate, blocks: [] };
    if (insertIndex !== null) this.blockCategories.splice(insertIndex, 0, entry);
    else this.blockCategories.push(entry);
    return candidate;
  }

  removeCategory(name) {
    const idx = this.blockCategories.findIndex(c => c.name === name);
    if (idx < 0) return false;
    this.blockCategories[idx].blocks.forEach(b => { delete this.blockDefinitions[b]; });
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
    if (insertIndex !== null) params.splice(insertIndex, 0, newParam);
    else params.push(newParam);
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
}
