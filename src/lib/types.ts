export const organKinds = ['skin', 'bones', 'skull', 'heart', 'brain', 'guts'] as const
export type OrganKind = (typeof organKinds)[number]
export type Grade = 'ordinary' | 'bronze' | 'silver' | 'gold'
export interface Organ {
  id: string
  kind: OrganKind
  grade: Grade
  white: number
  red: number
  quantity: number
  unlimited: boolean
  cost: number
}
export interface Corpse {
  id: string
  name: string
  flesh: number
  otherPockets: number
  baseWhite: number
  baseRed: number
}
export interface Treatment {
  id: string
  kind: 'solution' | 'injection'
  stars: number
  enabled: boolean
  quantity: number
  unlimited: boolean
  cost: number
  maxPerCorpse: number
}
export interface Settings {
  target: number
  anatomy: number
  priority: 'balanced' | 'organs' | 'alchemy'
  improver: { enabled: boolean; quantity: number; unlimited: boolean; cost: number }
}
export interface PlannerInput {
  organs: Organ[]
  corpses: Corpse[]
  treatments: Treatment[]
  settings: Settings
}
export interface AssignedOrgan {
  organ: Organ
  improved: boolean
  white: number
  red: number
}
export interface CorpsePlan {
  corpse: Corpse
  built: boolean
  organs: AssignedOrgan[]
  treatments: { treatment: Treatment; count: number }[]
  beforeWhite: number
  beforeRed: number
  white: number
  red: number
  pocketCount: number
}
export interface Plan {
  corpses: CorpsePlan[]
  completed: number
  organCost: number
  alchemyCost: number
  excess: number
  optimal: boolean
  usedOrgans: Record<string, number>
  usedTreatments: Record<string, number>
  usedImprovers: number
  reserves: { kind: OrganKind; before: number; after: number; unlimited: boolean }[]
  reserveFloor: number | null
}
