import PlainContainerExecutionStrategy from './PlainContainerExecutionStrategy';
// import IfContainerExecutionStrategy from './IfContainerExecutionStrategy';  // Future implementation

/**
 * Container Execution Factory
 */
export default class ContainerExecutionFactory {
  /**
   * Creates a container execution strategy for the specified container type
   *
   * @param {string} containerName Container name (e.g., 'container', 'if-container')
   * @param {EntryManager} entryManager Provides access to a container's children
   * @return {IContainerExecutionStrategy} Strategy instance
   *
   * @throws {Error} If unsupported container type is specified
   *
   * @example
   * const strategy = ContainerExecutionFactory.createStrategy('plain', entryManager);
   * const result = await strategy.execute(entryId, runChild);
   */
  static createStrategy(containerName, entryManager) {
    switch (containerName.toLowerCase()) {
      case 'if-container ':
        throw new Error(`Unsupported container type: ${containerName}`);
        //   return new IfContainerExecutionStrategy();
      case 'loop-container':
        throw new Error(`Unsupported container type: ${containerName}`);
        //   return new LoopContainerExecutionStrategy();
      default:
        return new PlainContainerExecutionStrategy(entryManager);
    }
  }
}
