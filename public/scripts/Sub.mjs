/**
 * Sub block implementation
 * it returns the result of subtracting b from a from the input argument
 * @param {Object} inputParams - Input parameters object with 'NumberA' and 'NumberB' properties
 * @returns {Object} Execution result with 'Result' field
 */
export function execute(inputParams) {
  let result = {};

  result.success = false;
  try {
    result.Result = inputParams.NumberA - inputParams.NumberB;
    result.success = true;
  } catch (error) {
    result.errorMessage = error.message;
  }
  return result;
}
