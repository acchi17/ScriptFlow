/**
 * Log block implementation
 * it returns the logarithm of the input value using the base
 * @param {Object} inputParams - Input parameters object
 * @returns {Object} Execution result object
 */
export async function execute(inputParams) {
  let result = {};

  result.success = false;
  try {
    if (inputParams.ValueA === undefined || inputParams.ValueB === undefined || inputParams.Operator === undefined) {
      throw new Error("Some parameters are missing.");
    }
    switch (inputParams.Operator) {
      case '=':
        result.Result = inputParams.ValueA === inputParams.ValueB;
        break;
      case '<>':
        result.Result = inputParams.ValueA !== inputParams.ValueB;
        break;
      case '>':
        result.Result = inputParams.ValueA > inputParams.ValueB;
        break;
      case '<':
        result.Result = inputParams.ValueA < inputParams.ValueB;
        break;
      case '>=':
        result.Result = inputParams.ValueA >= inputParams.ValueB;
        break;
      case '<=':
        result.Result = inputParams.ValueA <= inputParams.ValueB;
        break;
      default:
        throw new Error(`Unsupported Operator: ${inputParams.Operator}`);
    }
    result.success = true;
  } catch (error) {
    result.errorMessage = error.message;
  }
  return result;
}
