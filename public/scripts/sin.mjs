/**
 * Block implementation
 * it returns the sine of the input angle in radians
 * @param {Object} inputParams - Input parameters object with 'Radians' property
 * @returns {Object} Execution result with 'Result' field
 */
export function execute(inputParams) {
  let result = {};

  result.success = false;
  try {
    result.Result = Math.sin(inputParams.Radians);
    result.success = true;
  } catch (error) {
    result.errorMessage = error.message;
  }
  return result;
}
