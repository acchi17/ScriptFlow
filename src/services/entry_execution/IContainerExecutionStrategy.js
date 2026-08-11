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
   * Execute a container's children according to this strategy
   * @param {string} entryId ID of the container entry to execute
   * @param {(entryId: string) => Promise<Object>} runChild Executes a single child entry and resolves with its result
   * @return {Promise<Object>} Execution result object (must include `success`)
   */
  async execute() {
    throw new Error("Method 'execute' must be implemented");
  }
}
