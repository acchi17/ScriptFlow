import { reactive } from 'vue'

/**
 * EntryParamManager class
 * Class that manages parameter values and types of entries
 * Internal storage: { paramName: { value, dataType } }
 */
export default class EntryParamManager {
  constructor() {
    // Dictionary of entry IDs and their input parameters: entryId -> { name: { value, dataType } }
    this._inputParamsMap = new Map();
    // Dictionary of entry IDs and their output parameters (reactive for UI updates)
    this._outputParamsMap = reactive(new Map()); // entryId -> { name: { value, dataType } }
  }

  /**
   * Validate that a value matches the declared type.
   * Null/undefined are always allowed (output params start as null).
   * @param {any} value
   * @param {string} type
   * @returns {boolean}
   */
  _validateType(value, type) {
    if (value === null || value === undefined) return true;
    switch (type) {
      case 'integer': return Number.isInteger(value);
      case 'real':    return typeof value === 'number';
      case 'boolean': return typeof value === 'boolean';
      default:        return true;
    }
  }

  /**
   * Get a specific input parameter value
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the parameter
   * @returns {any} Parameter value or undefined
   */
  getInputParam(entryId, paramName) {
    const params = this._inputParamsMap.get(entryId);
    return params?.[paramName]?.value;
  }

  /**
   * Get a specific output parameter value
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the parameter
   * @returns {any} Parameter value or undefined
   */
  getOutputParam(entryId, paramName) {
    const params = this._outputParamsMap.get(entryId);
    return params?.[paramName]?.value;
  }

  /**
   * Get the type of a specific input parameter
   * @param {string} entryId
   * @param {string} paramName
   * @returns {string|undefined} Type string or undefined
   */
  getInputParamType(entryId, paramName) {
    const params = this._inputParamsMap.get(entryId);
    return params?.[paramName]?.dataType;
  }

  /**
   * Get the type of a specific output parameter
   * @param {string} entryId
   * @param {string} paramName
   * @returns {string|undefined} Type string or undefined
   */
  getOutputParamType(entryId, paramName) {
    const params = this._outputParamsMap.get(entryId);
    return params?.[paramName]?.dataType;
  }

  /**
   * Get input parameters
   * @param {string} entryId - ID of the entry
   * @returns {Object} Input parameters object in the form { name: value }
   */
  getInputParams(entryId) {
    const params = this._inputParamsMap.get(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.value]));
  }

  /**
   * Get output parameters
   * @param {string} entryId - ID of the entry
   * @returns {Object} Output parameters object in the form { name: value }
   */
  getOutputParams(entryId) {
    const params = this._outputParamsMap.get(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.value]));
  }

  /**
   * Get input parameter data types
   * @param {string} entryId - ID of the entry
   * @returns {Object} Input parameter types in the form { name: type }
   */
  getInputParamTypes(entryId) {
    const params = this._inputParamsMap.get(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.dataType]));
  }

  /**
   * Get output parameter data types
   * @param {string} entryId - ID of the entry
   * @returns {Object} Output parameter types in the form { name: type }
   */
  getOutputParamTypes(entryId) {
    const params = this._outputParamsMap.get(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.dataType]));
  }

  /**
   * Check if an entry has one or more input parameters
   * @param {string} entryId - ID of the entry
   * @returns {boolean} True if the entry has at least one input parameter
   */
  hasInputParam(entryId) {
    const params = this._inputParamsMap.get(entryId);
    return params ? Object.keys(params).length > 0 : false;
  }

  /**
   * Check if an entry has one or more output parameters
   * @param {string} entryId - ID of the entry
   * @returns {boolean} True if the entry has at least one output parameter
   */
  hasOutputParam(entryId) {
    const params = this._outputParamsMap.get(entryId);
    return params ? Object.keys(params).length > 0 : false;
  }

  /**
   * Set a single input parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the input parameter
   * @param {any} value - New value
   */
  setInputParam(entryId, paramName, value) {
    if (!entryId || !paramName) return;
    if (!this._inputParamsMap.has(entryId)) return;

    const params = this._inputParamsMap.get(entryId);
    const type = params[paramName]?.dataType;
    if (type && !this._validateType(value, type)) {
      console.error(`EntryParamManager: type mismatch for input "${paramName}" (expected ${type})`);
      return;
    }
    if (params[paramName]) {
      params[paramName].value = value;
    }
  }

  /**
   * Set a single output parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the output parameter
   * @param {any} value - New value
   */
  setOutputParam(entryId, paramName, value) {
    if (!entryId || !paramName) return;
    if (!this._outputParamsMap.has(entryId)) return;

    const params = this._outputParamsMap.get(entryId);
    const type = params[paramName]?.dataType;
    if (type && !this._validateType(value, type)) {
      console.error(`EntryParamManager: type mismatch for output "${paramName}" (expected ${type})`);
      return;
    }
    if (params[paramName]) {
      params[paramName].value = value;
    }
  }

  /**
   * Set entry input parameter definitions
   * @param {string} entryId - ID of the entry
   * @param {Object} inputParamDef - Input parameter definitions in the form { name: { value, dataType } }
   */
  setInputParamDef(entryId, inputParamDef = {}) {
    if (!entryId) return;
    this._inputParamsMap.set(entryId, inputParamDef);
  }

  /**
   * Set entry output parameter definitions
   * @param {string} entryId - ID of the entry
   * @param {Object} outputParamDef - Output parameter definitions in the form { name: { value, dataType } }
   */
  setOutputParamDef(entryId, outputParamDef = {}) {
    if (!entryId) return;
    this._outputParamsMap.set(entryId, outputParamDef);
  }

  /**
   * Remove all parameter data for an entry
   * @param {string} entryId - ID of the entry
   */
  removeParams(entryId) {
    if (!entryId) return;
    this._inputParamsMap.delete(entryId);
    this._outputParamsMap.delete(entryId);
  }
}
