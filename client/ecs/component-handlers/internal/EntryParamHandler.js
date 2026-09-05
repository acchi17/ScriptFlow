import { ref } from 'vue'
import { convertValue } from '../../../utils/common.js'
import { World } from '../../core/World'

/**
 * EntryParamHandler class
 * Handles parameter values and types of entries
 * Storage: World.inputParams / World.outputParams, each entryId -> { name: { value, dataType } }
 */
export default class EntryParamHandler {
  constructor(world = new World()) {
    // Component store holding input parameter values/types
    this._inputParams = world.getStore('inputParams');
    // Component store holding output parameter values/types
    this._outputParams = world.getStore('outputParams');
    // Reactive counter incremented whenever an output parameter value/definition changes,
    // since output params are read live by the UI while a script executes
    this._outputParamsTick = ref(0);
  }

  /**
   * Reactive counter that increments whenever output parameters change.
   * Watch/read this to react to output param updates without deep-reactive storage.
   * @returns {import('vue').Ref<number>}
   */
  get outputParamsTick() {
    return this._outputParamsTick;
  }

  /**
   * Get a specific input parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the parameter
   * @returns {{value: any, dataType: string}|undefined} Parameter value and type, or undefined
   */
  getInputParam(entryId, paramName) {
    const params = this._inputParams.get(entryId);
    return params?.[paramName];
  }

  /**
   * Set a single input parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the input parameter
   * @param {any} value - New value
   */
  setInputParam(entryId, paramName, value) {
    if (!entryId || !paramName) return;
    const params = this._inputParams.get(entryId);
    if (!params?.[paramName]) return;
    params[paramName].value = convertValue(value, params[paramName].dataType);
  }

  /**
   * Get a specific output parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the parameter
   * @returns {{value: any, dataType: string}|undefined} Parameter value and type, or undefined
   */
  getOutputParam(entryId, paramName) {
    const params = this._outputParams.get(entryId);
    return params?.[paramName];
  }

  /**
   * Set a single output parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the output parameter
   * @param {any} value - New value
   */
  setOutputParam(entryId, paramName, value) {
    if (!entryId || !paramName) return;
    const params = this._outputParams.get(entryId);
    if (!params?.[paramName]) return;
    params[paramName].value = convertValue(value, params[paramName].dataType);
    this._outputParamsTick.value++;
  }

  /**
   * Get all input parameters
   * @param {string} entryId - ID of the entry
   * @returns {Object<string, {value: any, dataType: string}>|undefined} Input parameters keyed by name, or undefined
   */
  getInputParams(entryId) {
    return this._inputParams.get(entryId);
  }

  /**
   * Get all output parameters
   * @param {string} entryId - ID of the entry
   * @returns {Object<string, {value: any, dataType: string}>|undefined} Output parameters keyed by name, or undefined
   */
  getOutputParams(entryId) {
    return this._outputParams.get(entryId);
  }

  /**
   * Check if an entry has one or more input parameters
   * @param {string} entryId - ID of the entry
   * @returns {boolean} True if the entry has at least one input parameter
   */
  hasInputParam(entryId) {
    const params = this._inputParams.get(entryId);
    return params ? Object.keys(params).length > 0 : false;
  }

  /**
   * Check if an entry has one or more output parameters
   * @param {string} entryId - ID of the entry
   * @returns {boolean} True if the entry has at least one output parameter
   */
  hasOutputParam(entryId) {
    const params = this._outputParams.get(entryId);
    return params ? Object.keys(params).length > 0 : false;
  }

  /**
   * Set entry input parameter definitions
   * @param {string} entryId - ID of the entry
   * @param {Object} inputParamDef - Input parameter definitions in the form { name: { value, dataType } }
   */
  setInputParamDef(entryId, inputParamDef = {}) {
    if (!entryId) return;
    this._inputParams.add(entryId, inputParamDef);
  }

  /**
   * Set entry output parameter definitions
   * @param {string} entryId - ID of the entry
   * @param {Object} outputParamDef - Output parameter definitions in the form { name: { value, dataType } }
   */
  setOutputParamDef(entryId, outputParamDef = {}) {
    if (!entryId) return;
    this._outputParams.add(entryId, outputParamDef);
    this._outputParamsTick.value++;
  }

  /**
   * Remove all parameter data for an entry
   * @param {string} entryId - ID of the entry
   */
  removeParamDef(entryId) {
    if (!entryId) return;
    this._inputParams.remove(entryId);
    this._outputParams.remove(entryId);
    this._outputParamsTick.value++;
  }
}
