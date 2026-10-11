/**
 * It keeps the script running for the given time
 * @param {Object} inputParams - Input parameters object
 * @returns {Object} Execution result object
 */
export async function execute(inputParams) {
  await new Promise((resolve) => setTimeout(resolve, inputParams.Milliseconds));
  return { success: true };
}
