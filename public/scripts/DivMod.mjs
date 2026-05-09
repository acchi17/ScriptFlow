/**
 * DivMod block implementation
 * it returns the quotient and remainder of dividing a by b from the input argument
 * @param {Object} inputParams - Input parameters object with 'NumberA' and 'NumberB' properties
 * @returns {Object} Execution result with 'Result' (quotient) and 'Mod' (remainder) fields
 */
export function execute(inputParams) {
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
