import IContainerExecutionStrategy from './IContainerExecutionStrategy';

/**
 * Execution strategy for a plain container: runs all children sequentially,
 * unconditionally, in order.
 */
export default class PlainContainerExecutionStrategy extends IContainerExecutionStrategy {
  async execute(entryId, runChild) {
    const childResults = [];
    for (const childId of this.entryManager.hierarchyHandler.getChildren(entryId)) {
      const childResult = await runChild(childId);
      childResults.push(childResult);
    }
    return { success: childResults.every(childResult => childResult.success === true) };
  }
}
