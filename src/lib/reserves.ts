import { improvedRed, requiredAnatomy } from './game-data'
import { organKinds } from './types'
import type { Organ, PlannerInput } from './types'

/** Count only organs usable for this burial setup, including eligible improver donors. */
export function usefulOrgan(organ: Organ, input: PlannerInput): boolean {
  const { settings, treatments } = input
  const canRemoveRed = treatments.some((t) => t.kind === 'injection' && t.enabled && t.maxPerCorpse > 0 && (t.unlimited || t.quantity > 0))
  const canInsert = settings.anatomy >= requiredAnatomy(organ.kind, organ.grade)
  const canImprove = settings.improver.enabled && (settings.improver.unlimited || settings.improver.quantity > 0) && settings.anatomy >= requiredAnatomy(organ.kind, 'gold')
  return (canInsert && organ.white > 0 && (organ.red === 0 || canRemoveRed)) || (canImprove && (improvedRed[organ.kind] === 0 || canRemoveRed))
}
export function reserveGroups(input: PlannerInput) {
  return organKinds.map((kind) => {
    const organs = input.organs.filter((o) => o.kind === kind && usefulOrgan(o, input))
    return { kind, organs, before: organs.filter((o) => !o.unlimited).reduce((s, o) => s + o.quantity, 0), unlimited: organs.some((o) => o.unlimited) }
  })
}
