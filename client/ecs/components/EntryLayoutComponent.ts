export interface EntryLayoutComponent {
  y: number
  height: number
  // ID of the root entry the measured entry belonged to when the layout was recorded
  rootId: string
}
