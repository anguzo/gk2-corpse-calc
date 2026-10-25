import { organKinds } from './types'
import type { Grade, Organ, OrganKind, PlannerInput } from './types'

export const labels: Record<OrganKind, string> = { skin: 'Skin', bones: 'Bones', skull: 'Skull', heart: 'Heart', brain: 'Brain', guts: 'Guts' }
export const gradeCosts: Record<Grade, number> = { ordinary: 1, bronze: 2, silver: 5, gold: 10 }
export const anatomyRequirements: Record<OrganKind, number[]> = {
  skin: [1, 3, 6], bones: [2, 4, 7], skull: [3, 5, 8], heart: [5, 9, 13], brain: [8, 10, 13], guts: [9, 11, 13],
}
export function requiredAnatomy(kind: OrganKind, grade: Grade) {
  return anatomyRequirements[kind][grade === 'gold' ? 2 : grade === 'silver' ? 1 : 0]
}
export const improvedRed: Record<OrganKind, number> = { skin: 1, bones: 1, skull: 0, heart: 0, brain: 0, guts: 1 }
type Variant = Omit<Organ, 'quantity' | 'unlimited' | 'cost'>
// White, red, grade. Exact six variants per organ, from GK2DB's extracted item table.
const variantStats: Record<OrganKind, [number, number, Grade][]> = {
  skin: [[0, 0, 'ordinary'], [0, 1, 'bronze'], [2, 1, 'silver'], [0, 2, 'silver'], [3, 1, 'gold'], [0, 3, 'gold']],
  bones: [[0, 0, 'ordinary'], [1, 0, 'bronze'], [1, 1, 'silver'], [1, 2, 'silver'], [3, 1, 'gold'], [1, 3, 'gold']],
  skull: [[0, 0, 'ordinary'], [1, 0, 'bronze'], [2, 0, 'silver'], [2, 2, 'silver'], [3, 0, 'gold'], [2, 3, 'gold']],
  heart: [[1, 0, 'bronze'], [1, 1, 'bronze'], [2, 1, 'silver'], [2, 2, 'silver'], [3, 0, 'gold'], [1, 3, 'gold']],
  brain: [[1, 0, 'bronze'], [0, 1, 'bronze'], [2, 0, 'silver'], [1, 2, 'silver'], [3, 0, 'gold'], [1, 3, 'gold']],
  guts: [[0, 0, 'ordinary'], [0, 1, 'bronze'], [1, 2, 'silver'], [1, 1, 'silver'], [3, 1, 'gold'], [0, 3, 'gold']],
}
const legacyIds: Record<string, string> = {
  'skin-3-1': 'skin-gold', 'skin-2-1': 'skin-silver', 'bones-3-1': 'bones-gold',
  'heart-3-0': 'heart-gold', 'guts-0-0': 'guts-ordinary', 'guts-0-1': 'guts-bronze',
  'skull-0-0': 'skull-ordinary', 'skull-1-0': 'skull-white', 'heart-1-0': 'heart-white',
  'heart-2-1': 'heart-silver', 'brain-0-1': 'brain-bronze',
}
export const organCatalog: Variant[] = organKinds.flatMap((kind) => variantStats[kind].map(([white, red, grade]) => ({
  id: legacyIds[`${kind}-${white}-${red}`] ?? `${kind}-${grade}-${white}w-${red}r`, kind, grade, white, red,
})))
export function organSprite(kind: OrganKind, grade: Grade = 'bronze') {
  const base = { skin: 'i_skin', bones: 'i_bone', skull: 'i_skull', heart: 'i_heart', brain: 'i_brain', guts: 'i_intestine' }[kind]
  return `${base}${grade === 'gold' && ['heart', 'brain', 'guts'].includes(kind) ? '_dark' : ''}`
}
export function normalizeOrgans(saved: Organ[]): Organ[] {
  return organCatalog.map((variant) => {
    const matching = saved.filter((o) => o.kind === variant.kind && o.white === variant.white && o.red === variant.red && requiredAnatomy(o.kind, o.grade) === requiredAnatomy(variant.kind, variant.grade))
    return { ...variant, quantity: Math.min(9999, matching.reduce((s, o) => s + Math.max(0, Math.trunc(o.quantity) || 0), 0)), unlimited: matching.some((o) => o.unlimited), cost: gradeCosts[variant.grade] }
  })
}
export const sources = [
  { label: 'All fixed organ variants', url: 'https://gk2db.org/items/corpse/' },
  { label: 'Corpses, organs & improver outputs', url: 'https://gk2db.org/guides/corpses-and-organs/' },
  { label: 'Embalming table & six-pocket limit', url: 'https://graveyardkeeper2.io/buildings/embalm_table_1/' },
  { label: 'Injection grades & ingredients', url: 'https://graveyardkeeper2.io/items/embalm_white_red--1/' },
]
export function exampleInput(): PlannerInput {
  return {
    organs: normalizeOrgans([
      { id: 'skin-gold', kind: 'skin', grade: 'gold', white: 3, red: 1, quantity: 5, unlimited: false, cost: 10 },
      { id: 'skin-silver', kind: 'skin', grade: 'silver', white: 2, red: 1, quantity: 1, unlimited: false, cost: 5 },
      { id: 'bones-gold', kind: 'bones', grade: 'gold', white: 3, red: 1, quantity: 7, unlimited: false, cost: 10 },
      { id: 'heart-gold', kind: 'heart', grade: 'gold', white: 3, red: 0, quantity: 8, unlimited: false, cost: 10 },
      { id: 'guts-ordinary', kind: 'guts', grade: 'ordinary', white: 0, red: 0, quantity: 2, unlimited: false, cost: 1 },
      { id: 'guts-bronze', kind: 'guts', grade: 'bronze', white: 0, red: 1, quantity: 2, unlimited: false, cost: 2 },
      { id: 'skull-ordinary', kind: 'skull', grade: 'ordinary', white: 0, red: 0, quantity: 20, unlimited: false, cost: 1 },
      { id: 'skull-white', kind: 'skull', grade: 'bronze', white: 1, red: 0, quantity: 8, unlimited: false, cost: 2 },
      { id: 'heart-white', kind: 'heart', grade: 'bronze', white: 1, red: 0, quantity: 5, unlimited: false, cost: 2 },
      { id: 'heart-silver', kind: 'heart', grade: 'silver', white: 2, red: 1, quantity: 1, unlimited: false, cost: 5 },
      { id: 'brain-bronze', kind: 'brain', grade: 'bronze', white: 0, red: 1, quantity: 20, unlimited: true, cost: 2 },
    ]),
    corpses: [4, 4, 4, 3].map((flesh, i) => ({ id: `corpse-${i}`, name: `Corpse ${i + 1}`, flesh, otherPockets: 0, baseWhite: 0, baseRed: 0 })),
    treatments: ['solution', 'injection'].flatMap((kind) => [1, 2, 3].map((stars) => ({
      id: `${kind}-${stars}`, kind: kind as 'solution' | 'injection', stars,
      enabled: kind === 'injection' && stars === 3, quantity: 4, unlimited: false,
      cost: kind === 'solution' ? 1 : 2, maxPerCorpse: kind === 'injection' ? 1 : 6,
    }))),
    settings: { target: 14, anatomy: 13, priority: 'balanced', improver: { enabled: false, quantity: 4, unlimited: false, cost: 1 } },
  }
}
