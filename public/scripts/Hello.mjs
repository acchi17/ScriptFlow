/**
 * Hello block implementation
 * it returns string "Hello"
 * @returns {Object} Execution result with 'result' field
 */
export function execute() {
  let result = {};

  result.success = false;
  try {    
    result.output = 'Hello';
    result.success = true;
  } catch (error) {
    result.errorMessage = error.message;
  }
  return result;
}