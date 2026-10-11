/**
 * It reports whether the runner holds a script socket and whether writing to it succeeds
 * @param {Object} inputParams - Input parameters object
 * @param {Object|null} socketComm - Socket communication object
 * @returns {Object} Execution result object
 */
export async function execute(inputParams, socketComm) {
  const result = { success: false, hasSocket: socketComm !== null };
  try {
    socketComm.write('ping');
    result.success = true;
  } catch (error) {
    result.errorMessage = error.message;
  }
  return result;
}
