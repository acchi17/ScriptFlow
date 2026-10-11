/**
 * It returns the result of multiplying a and b from the input argument
 * @param {Object} inputParams - Input parameters object
 * @returns {Object} Execution result object
 */
export async function execute(inputParams) {
  let result = {};

  result.success = false;
  try {
    result.Result = inputParams.NumberA * inputParams.NumberB;
    result.success = true;
  } catch (error) {
    result.errorMessage = error.message;
  }
  return result;
}
