/**
 * Interface for Container Execution Strategy
 * All strategy implementation classes must conform to this interface
 */
export default class IContainerExecutionStrategy {
  /**
   * Constructor
   * @param {EntryManager} entryManager Provides access to a container's children
   */
  constructor(entryManager) {
    this.entryManager = entryManager;
  }

  /**
   * Run all of a container's children sequentially, in order, unconditionally.
   * Shared by strategies whose only difference is whether/when they call this.
   * @param {string} entryId ID of the container entry
   * @param {(entryId: string) => Promise<Object>} runChild Executes a single child entry and resolves with its result
   * @return {Promise<Object>} `{ success }`, true only if every child succeeded
   */
  async runChildrenSequentially(entryId, runChild) {
    const childResults = [];
    for (const childId of this.entryManager.hierarchyHandler.getChildren(entryId)) {
      const childResult = await runChild(childId);
      childResults.push(childResult);
    }
    return { success: childResults.every(childResult => childResult.success === true) };
  }

  /**
   * Execute a container's children according to this strategy
   * @param {string} entryId ID of the container entry to execute
   * @param {(entryId: string) => Promise<Object>} runChild Executes a single child entry and resolves with its result
   * @param {Object} inputParams Resolved (connection-overlaid) input params for entryId
   * @return {Promise<Object>} Execution result object (must include `success`)
   */
  async execute() {
    throw new Error("Method 'execute' must be implemented");
  }
}
