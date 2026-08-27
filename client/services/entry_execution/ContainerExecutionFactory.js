import PlainContainerExecutionStrategy from './PlainContainerExecutionStrategy';
import IfContainerExecutionStrategy from './IfContainerExecutionStrategy';

/**
 * Container Execution Factory
 */
export default class ContainerExecutionFactory {
  /**
   * Creates a container execution strategy for the specified container name
   *
   * @param {string} containerName Container entry name (e.g., 'Container', 'if-container')
   * @param {EntryManager} entryManager Provides access to a container's children
   * @return {IContainerExecutionStrategy} Strategy instance
   *
   * @example
   * const strategy = ContainerExecutionFactory.createStrategy('if-container', entryManager);
   * const result = await strategy.execute(entryId, runChild, inputParams);
   */
  static createStrategy(containerName, entryManager) {
    if (containerName === 'if-container') {
      return new IfContainerExecutionStrategy(entryManager);
    }
    return new PlainContainerExecutionStrategy(entryManager);
  }
}
