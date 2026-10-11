/**
 * It returns the sine of the input angle in radians
 * @param {Object} inputParams - Input parameters object
 * @returns {Object} Execution result object
 */
export async function execute(inputParams) {
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
