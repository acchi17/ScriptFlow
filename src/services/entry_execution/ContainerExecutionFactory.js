import PlainContainerExecutionStrategy from './PlainContainerExecutionStrategy';
// import IfContainerExecutionStrategy from './IfContainerExecutionStrategy';  // Future implementation

/**
 * Container Execution Factory
 */
export default class ContainerExecutionFactory {
  /**
   * Creates a container execution strategy for the specified container type
   *
   * @param {string} containerType Container type (e.g., 'plain')
   * @param {EntryManager} entryManager Provides access to a container's children
   * @return {IContainerExecutionStrategy} Strategy instance
   *
   * @throws {Error} If unsupported container type is specified
   *
   * @example
   * const strategy = ContainerExecutionFactory.createStrategy('plain', entryManager);
   * const result = await strategy.execute(entryId, runChild);
   */
  static createStrategy(containerType = 'plain', entryManager) {
    switch ((containerType || 'plain').toLowerCase()) {
      case 'plain':
        return new PlainContainerExecutionStrategy(entryManager);

        // case 'if':
        //   return new IfContainerExecutionStrategy();

      default:
        throw new Error(`Unsupported container type: ${containerType}`);
    }
  }
}
