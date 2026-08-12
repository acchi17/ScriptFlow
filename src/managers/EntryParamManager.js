import { ref } from 'vue'
import { convertValue } from '../utils/common.js'
import { World } from '../ecs/core/World'

/**
 * EntryParamManager class
 * Class that manages parameter values and types of entries
 * Storage: World.inputParams / World.outputParams, each entryId -> { name: { value, dataType } }
 */
export default class EntryParamManager {
  constructor(world = new World()) {
    // ECS world holding input/output param components
    this._world = world;
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
   * Get a specific input parameter value
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the parameter
   * @returns {any} Parameter value or undefined
   */
  getInputParam(entryId, paramName) {
    const params = this._world.inputParams.get(entryId);
    return params?.[paramName]?.value;
  }

  /**
   * Get a specific output parameter value
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the parameter
   * @returns {any} Parameter value or undefined
   */
  getOutputParam(entryId, paramName) {
    const params = this._world.outputParams.get(entryId);
    return params?.[paramName]?.value;
  }

  /**
   * Get the type of a specific input parameter
   * @param {string} entryId
   * @param {string} paramName
   * @returns {string|undefined} Type string or undefined
   */
  getInputParamType(entryId, paramName) {
    const params = this._world.inputParams.get(entryId);
    return params?.[paramName]?.dataType;
  }

  /**
   * Get the type of a specific output parameter
   * @param {string} entryId
   * @param {string} paramName
   * @returns {string|undefined} Type string or undefined
   */
  getOutputParamType(entryId, paramName) {
    const params = this._world.outputParams.get(entryId);
    return params?.[paramName]?.dataType;
  }

  /**
   * Get input parameters
   * @param {string} entryId - ID of the entry
   * @returns {Object} Input parameters object in the form { name: value }
   */
  getInputParams(entryId) {
    const params = this._world.inputParams.get(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.value]));
  }

  /**
   * Get output parameters
   * @param {string} entryId - ID of the entry
   * @returns {Object} Output parameters object in the form { name: value }
   */
  getOutputParams(entryId) {
    const params = this._world.outputParams.get(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.value]));
  }

  /**
   * Get input parameter data types
   * @param {string} entryId - ID of the entry
   * @returns {Object} Input parameter types in the form { name: type }
   */
  getInputParamTypes(entryId) {
    const params = this._world.inputParams.get(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.dataType]));
  }

  /**
   * Get output parameter data types
   * @param {string} entryId - ID of the entry
   * @returns {Object} Output parameter types in the form { name: type }
   */
  getOutputParamTypes(entryId) {
    const params = this._world.outputParams.get(entryId) || {};
    return Object.fromEntries(Object.entries(params).map(([k, d]) => [k, d.dataType]));
  }

  /**
   * Check if an entry has one or more input parameters
   * @param {string} entryId - ID of the entry
   * @returns {boolean} True if the entry has at least one input parameter
   */
  hasInputParam(entryId) {
    const params = this._world.inputParams.get(entryId);
    return params ? Object.keys(params).length > 0 : false;
  }

  /**
   * Check if an entry has one or more output parameters
   * @param {string} entryId - ID of the entry
   * @returns {boolean} True if the entry has at least one output parameter
   */
  hasOutputParam(entryId) {
    const params = this._world.outputParams.get(entryId);
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
    const params = this._world.inputParams.get(entryId);
    if (!params?.[paramName]) return;
    params[paramName].value = convertValue(value, params[paramName].dataType);
  }

  /**
   * Set a single output parameter
   * @param {string} entryId - ID of the entry
   * @param {string} paramName - Name of the output parameter
   * @param {any} value - New value
   */
  setOutputParam(entryId, paramName, value) {
    if (!entryId || !paramName) return;
    const params = this._world.outputParams.get(entryId);
    if (!params?.[paramName]) return;
    params[paramName].value = convertValue(value, params[paramName].dataType);
    this._outputParamsTick.value++;
  }

  /**
   * Set entry input parameter definitions
   * @param {string} entryId - ID of the entry
   * @param {Object} inputParamDef - Input parameter definitions in the form { name: { value, dataType } }
   */
  setInputParams(entryId, inputParamDef = {}) {
    if (!entryId) return;
    this._world.inputParams.add(entryId, inputParamDef);
  }

  /**
   * Set entry output parameter definitions
   * @param {string} entryId - ID of the entry
   * @param {Object} outputParamDef - Output parameter definitions in the form { name: { value, dataType } }
   */
  setOutputParams(entryId, outputParamDef = {}) {
    if (!entryId) return;
    this._world.outputParams.add(entryId, outputParamDef);
    this._outputParamsTick.value++;
  }

  /**
   * Remove all parameter data for an entry
   * @param {string} entryId - ID of the entry
   */
  removeParams(entryId) {
    if (!entryId) return;
    this._world.inputParams.remove(entryId);
    this._world.outputParams.remove(entryId);
    this._outputParamsTick.value++;
  }
}
