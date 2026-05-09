/**
 * World block implementation
 * it returns string "World"
 * @returns {Object} Execution result with 'result' field
 */
export function execute() {
  let result = {};

  result.success = false;
  try {    
    result.output = 'World';
    result.success = true;
  } catch (error) {
    result.errorMessage = error.message;
  }
  return result;
}