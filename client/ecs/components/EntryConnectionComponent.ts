import type { EntityId } from '../core/Entity'

export interface ConnectionEndpoint {
  entryId: EntityId
  category: 'input' | 'output'
  dataType: string
  paramName: string
}

export interface EntryConnectionComponent {
  output: ConnectionEndpoint
  input: ConnectionEndpoint
}
