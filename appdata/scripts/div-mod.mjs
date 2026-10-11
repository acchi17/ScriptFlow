/**
 * It returns the quotient and remainder of dividing a by b from the input argument
 * @param {Object} inputParams - Input parameters object
 * @returns {Object} Execution result object
 */
export async function execute(inputParams) {
  let result = {};

  result.success = false;
  try {
    if (inputParams.NumberB === 0) {
      throw new Error('Division by zero');
    }
    result.Result = Math.trunc(inputParams.NumberA / inputParams.NumberB);
    result.Mod = inputParams.NumberA % inputParams.NumberB;
    result.success = true;
  } catch (error) {
    result.errorMessage = error.message;
  }
  return result;
}
