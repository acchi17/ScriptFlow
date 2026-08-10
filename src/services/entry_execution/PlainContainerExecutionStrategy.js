import IContainerExecutionStrategy from './IContainerExecutionStrategy';

/**
 * Execution strategy for a plain container: runs all children sequentially,
 * unconditionally, in order.
 */
export default class PlainContainerExecutionStrategy extends IContainerExecutionStrategy {
  async execute(container, runChild) {
    const childResults = [];
    for (const childId of this.entryManager.getChildren(container.id)) {
      const childEntry = this.entryManager.getEntry(childId);
      const childResult = await runChild(childEntry);
      childResults.push(childResult);
    }
    return { success: childResults.every(childResult => childResult.success === true) };
  }
}
