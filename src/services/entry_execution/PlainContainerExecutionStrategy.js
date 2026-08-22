import IContainerExecutionStrategy from './IContainerExecutionStrategy';

/**
 * Execution strategy for a plain container: runs all children sequentially,
 * unconditionally, in order.
 */
export default class PlainContainerExecutionStrategy extends IContainerExecutionStrategy {
  async execute(entryId, runChild) {
    return this.runChildrenSequentially(entryId, runChild);
  }
}
