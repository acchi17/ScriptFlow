import IContainerExecutionStrategy from './IContainerExecutionStrategy';

/**
 * Execution strategy for an if-container: runs all children sequentially,
 * in order, only when the resolved `Execute` input param is not explicitly false.
 */
export default class IfContainerExecutionStrategy extends IContainerExecutionStrategy {
  async execute(entryId, runChild, inputParams = {}) {
    if (inputParams.Execute === false) {
      return { success: true };
    }
    return this.runChildrenSequentially(entryId, runChild);
  }
}
