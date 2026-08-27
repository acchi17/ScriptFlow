import { describe, it, expect } from 'vitest'
import ContainerExecutionFactory from '../ContainerExecutionFactory.js'
import IfContainerExecutionStrategy from '../IfContainerExecutionStrategy.js'
import PlainContainerExecutionStrategy from '../PlainContainerExecutionStrategy.js'

describe('ContainerExecutionFactory.createStrategy', () => {
  it('returns an IfContainerExecutionStrategy for the name "if-container"', () => {
    const strategy = ContainerExecutionFactory.createStrategy('if-container', {})

    expect(strategy).toBeInstanceOf(IfContainerExecutionStrategy)
  })

  it('returns a PlainContainerExecutionStrategy for the plain container name', () => {
    const strategy = ContainerExecutionFactory.createStrategy('Container', {})

    expect(strategy).toBeInstanceOf(PlainContainerExecutionStrategy)
  })

  it('returns a PlainContainerExecutionStrategy for any other unrecognized name', () => {
    const strategy = ContainerExecutionFactory.createStrategy('loop-container', {})

    expect(strategy).toBeInstanceOf(PlainContainerExecutionStrategy)
  })
})
