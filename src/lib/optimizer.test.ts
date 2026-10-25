import { beforeAll, describe, expect, it } from 'vitest'
import loadHighs from 'highs'
import { createHighsEngine, Status } from './solver'
import type { SolverEngine } from './solver'
import { exampleInput, normalizeOrgans, organCatalog } from './game-data'
import { optimize } from './optimizer'
import type { PlannerInput } from './types'

let engine: SolverEngine
beforeAll(async () => {
  engine = createHighsEngine(await loadHighs())
})
function minimal(): PlannerInput {
  const input = exampleInput()
  input.organs = []
  input.corpses = [{ id: 'c', name: 'Test corpse', flesh: 1, otherPockets: 0, baseWhite: 0, baseRed: 0 }]
  input.treatments.forEach((t) => { t.enabled = false })
  return input
}
describe('shared-stock burial optimization', () => {
  it('builds the supplied four-corpse example at the minimum conservation weight with no excess', async () => {
    const input = exampleInput()
    input.settings.priority = 'organs'
    const plan = await optimize(input, engine)
    expect(plan.optimal).toBe(true)
    expect(plan.completed).toBe(4)
    expect(plan.excess).toBe(0)
    expect(plan.organCost).toBe(87)
    expect(plan.usedOrgans['skin-silver']).toBe(1)
    const goldUsed = input.organs.filter((o) => o.grade === 'gold').reduce((s, o) => s + (plan.usedOrgans[o.id] ?? 0), 0)
    expect(goldUsed).toBe(7)
    expect(plan.corpses.flatMap((c) => c.organs).length).toBe(14)
    expect(plan.usedTreatments['injection-3']).toBe(4)
    plan.corpses.forEach((c) => { expect(c.white).toBe(14); expect(c.red).toBe(0); expect(c.pocketCount).toBeLessThanOrEqual(6) })
  })
  it('allows repeated solutions and clamps negative raw red without adding red donor organs', async () => {
    const input = minimal()
    input.corpses[0].flesh = 2
    const t = input.treatments.find((t) => t.id === 'injection-3')!
    Object.assign(t, { enabled: true, unlimited: true, maxPerCorpse: 6 })
    const plan = await optimize(input, engine)
    expect(plan.completed).toBe(1)
    expect(plan.usedTreatments['injection-3']).toBe(4)
    expect(plan.corpses[0].red).toBe(0)
    expect(plan.corpses[0].white).toBe(14)
    expect(plan.corpses[0].pocketCount).toBe(6)
  })
  it('combines solutions and injections while respecting a shared bottle budget', async () => {
    const input = minimal()
    input.corpses[0].baseRed = 3
    input.corpses[0].baseWhite = 7
    input.settings.target = 14
    Object.assign(input.treatments.find((t) => t.id === 'injection-3')!, { enabled: true, quantity: 1 })
    Object.assign(input.treatments.find((t) => t.id === 'solution-3')!, { enabled: true, quantity: 1 })
    const plan = await optimize(input, engine)
    expect(plan.completed).toBe(1)
    expect(plan.usedTreatments).toEqual({ 'solution-3': 1, 'injection-3': 1 })
    expect(plan.corpses[0].white).toBe(14)
  })
  it('does not invent pockets when four flesh leave space for only two bottles', async () => {
    const input = minimal()
    input.corpses[0].flesh = 4
    Object.assign(input.treatments.find((t) => t.id === 'solution-3')!, { enabled: true, unlimited: true })
    const plan = await optimize(input, engine)
    expect(plan.completed).toBe(0)
    expect(plan.usedTreatments).toEqual({})
  })
  it('never spends a finite donor organ twice across a batch', async () => {
    const input = minimal()
    input.corpses.push({ ...input.corpses[0], id: 'c2', name: 'Second corpse' })
    input.organs = [exampleInput().organs.find((o) => o.id === 'heart-gold')!]
    input.organs[0].quantity = 1
    input.settings.target = 4
    const plan = await optimize(input, engine)
    expect(plan.completed).toBe(1)
    expect(plan.usedOrgans['heart-gold']).toBe(1)
  })
  it('replaces improver donor skulls with the canonical output, not additive bonuses', async () => {
    const input = minimal()
    input.settings.target = 4
    input.settings.improver = { enabled: true, quantity: 1, unlimited: false, cost: 1 }
    input.organs = [{ id: 'red-brain', kind: 'brain', grade: 'bronze', white: 0, red: 1, cost: 1, quantity: 1, unlimited: false }]
    const plan = await optimize(input, engine)
    expect(plan.completed).toBe(1)
    expect(plan.usedImprovers).toBe(1)
    expect(plan.corpses[0].organs[0]).toMatchObject({ improved: true, white: 3, red: 0 })
  })
  it('does not upgrade skin to a red-free output', async () => {
    const input = minimal()
    input.settings.target = 4
    input.settings.improver.enabled = true
    input.organs = [{ id: 'skin', kind: 'skin', grade: 'ordinary', white: 0, red: 0, cost: 1, quantity: 1, unlimited: false }]
    expect((await optimize(input, engine)).completed).toBe(0)
  })
  it('respects Anatomy even when improvers are available', async () => {
    const input = minimal()
    input.settings.target = 4
    input.settings.anatomy = 12
    input.settings.improver.enabled = true
    input.organs = [exampleInput().organs.find((o) => o.id === 'brain-bronze')!]
    expect((await optimize(input, engine)).completed).toBe(0)
  })
  it('organs-first priority can trade additional bottles for fewer valuable organs', async () => {
    const input = minimal()
    input.corpses[0].flesh = 2
    input.organs = [exampleInput().organs.find((o) => o.id === 'heart-gold')!]
    Object.assign(input.treatments.find((t) => t.id === 'solution-3')!, { enabled: true, unlimited: true, cost: 20 })
    input.settings.priority = 'organs'
    const organSaving = await optimize(input, engine)
    expect(organSaving.organCost).toBe(0)
    expect(organSaving.usedTreatments['solution-3']).toBe(4)
    input.settings.priority = 'alchemy'
    const alchemySaving = await optimize(input, engine)
    expect(alchemySaving.usedTreatments['solution-3']).toBe(3)
    expect(alchemySaving.usedOrgans['heart-gold']).toBe(1)
  })
  it('handles an empty batch', async () => {
    const input = minimal()
    input.corpses = []
    expect((await optimize(input, engine)).completed).toBe(0)
  })
  it('does not allocate more improvers than the whole batch has available', async () => {
    const input = minimal()
    input.corpses.push({ ...input.corpses[0], id: 'c2' })
    input.settings.target = 4
    input.settings.improver = { enabled: true, quantity: 1, unlimited: false, cost: 1 }
    input.organs = [{ id: 'donor', kind: 'brain', grade: 'bronze', white: 0, red: 1, cost: 1, quantity: 2, unlimited: false }]
    const plan = await optimize(input, engine)
    expect(plan.completed).toBe(1)
    expect(plan.usedImprovers).toBe(1)
    expect(plan.usedOrgans.donor).toBe(1)
  })
  it('uses the stronger bottle only when it is needed to clear the red skulls', async () => {
    const input = minimal()
    input.settings.target = 4
    input.corpses[0].baseRed = 3
    Object.assign(input.treatments.find((t) => t.id === 'solution-3')!, { enabled: true, unlimited: true, cost: 0 })
    Object.assign(input.treatments.find((t) => t.id === 'injection-3')!, { enabled: true, unlimited: true, cost: 5 })
    const plan = await optimize(input, engine)
    expect(plan.usedTreatments['injection-3']).toBe(1)
    expect(plan.usedTreatments['solution-3'] ?? 0).toBe(0)
    expect(plan.corpses[0].red).toBe(0)
  })
  it('keeps the known feasible allocation if a later optimization stage times out without a solution', async () => {
    const input = minimal()
    input.settings.target = 4
    input.organs = [exampleInput().organs.find((o) => o.id === 'heart-gold')!]
    let calls = 0
    const limitedEngine: SolverEngine = { solve: async (lp) => {
      calls++
      if (calls === 2) return { result: { status: Status.unknown, vars: {} } }
      return engine.solve(lp)
    } }
    const plan = await optimize(input, limitedEngine)
    expect(plan.optimal).toBe(false)
    expect(plan.completed).toBe(1)
    expect(plan.corpses[0].white).toBe(4)
    expect(plan.corpses[0].red).toBe(0)
    expect(calls).toBe(2)
  })
  it('balanced mode protects scarce organ types and splits consumption across abundant ones', async () => {
    const input = minimal()
    input.settings.target = 7
    input.corpses.push({ ...input.corpses[0], id: 'c2' })
    input.organs = [
      { id: 'rare-skin', kind: 'skin', grade: 'gold', white: 3, red: 1, quantity: 1, unlimited: false, cost: 1 },
      { id: 'bones', kind: 'bones', grade: 'gold', white: 3, red: 1, quantity: 5, unlimited: false, cost: 10 },
      { id: 'heart', kind: 'heart', grade: 'gold', white: 3, red: 0, quantity: 5, unlimited: false, cost: 10 },
    ]
    Object.assign(input.treatments.find((t) => t.id === 'injection-3')!, { enabled: true, quantity: 2 })
    const plan = await optimize(input, engine)
    expect(plan.completed).toBe(2)
    expect(plan.usedOrgans['rare-skin'] ?? 0).toBe(0)
    expect(plan.usedOrgans.bones).toBe(1)
    expect(plan.usedOrgans.heart).toBe(1)
    expect(plan.reserveFloor).toBe(1)
    input.settings.priority = 'organs'
    expect((await optimize(input, engine)).usedOrgans['rare-skin']).toBe(1)
  })
  it('keeps four useful organs in each stocked type for the supplied example', async () => {
    const plan = await optimize(exampleInput(), engine)
    expect(plan.completed).toBe(4)
    expect(plan.reserveFloor).toBe(4)
    for (const reserve of plan.reserves.filter((r) => r.before > 0)) expect(reserve.after).toBeGreaterThanOrEqual(4)
    for (const corpse of plan.corpses) { expect(corpse.white).toBeGreaterThanOrEqual(14); expect(corpse.red).toBe(0) }
  })
  it('balanced mode preserves a scarce variant by pairing a common variant with alchemy', async () => {
    const input = minimal()
    input.settings.target = 4
    input.organs = [
      { id: 'common-heart', kind: 'heart', grade: 'bronze', white: 1, red: 0, quantity: 8, unlimited: false, cost: 2 },
      { id: 'rare-heart', kind: 'heart', grade: 'gold', white: 3, red: 0, quantity: 1, unlimited: false, cost: 1 },
    ]
    Object.assign(input.treatments.find((t) => t.id === 'solution-2')!, { enabled: true, quantity: 1, cost: 50 })
    const plan = await optimize(input, engine)
    expect(plan.usedOrgans['common-heart']).toBe(1)
    expect(plan.usedOrgans['rare-heart'] ?? 0).toBe(0)
    expect(plan.usedTreatments['solution-2']).toBe(1)
    expect(plan.reserveFloor).toBe(8)
  })
  it('balanced mode does not count unusable zero-white organs as burial flexibility', async () => {
    const input = minimal()
    input.settings.target = 4
    input.organs = [
      { id: 'heart', kind: 'heart', grade: 'gold', white: 3, red: 0, quantity: 5, unlimited: false, cost: 10 },
      { id: 'useless-skull', kind: 'skull', grade: 'ordinary', white: 0, red: 0, quantity: 100, unlimited: false, cost: 1 },
    ]
    const plan = await optimize(input, engine)
    expect(plan.reserveFloor).toBe(4)
    expect(plan.reserves.find((r) => r.kind === 'skull')?.before).toBe(0)
    expect(plan.usedOrgans['useless-skull'] ?? 0).toBe(0)
  })
  it('unlimited donors and improvers preserve finite upgraded organs', async () => {
    const input = minimal()
    input.settings.target = 4
    input.settings.improver = { enabled: true, quantity: 0, unlimited: true, cost: 1 }
    input.organs = [
      { id: 'brain', kind: 'brain', grade: 'gold', white: 3, red: 0, quantity: 1, unlimited: false, cost: 1 },
      { id: 'donor', kind: 'brain', grade: 'bronze', white: 0, red: 1, quantity: 0, unlimited: true, cost: 2 },
    ]
    const plan = await optimize(input, engine)
    expect(plan.usedOrgans.brain ?? 0).toBe(0)
    expect(plan.usedOrgans.donor).toBe(1)
    expect(plan.usedImprovers).toBe(1)
    expect(plan.reserveFloor).toBeNull()
  })
  it('balanced mode still maximizes ready bodies ahead of preserving the last rare organ', async () => {
    const input = minimal()
    input.settings.target = 4
    input.organs = [{ id: 'last-heart', kind: 'heart', grade: 'gold', white: 3, red: 0, quantity: 1, unlimited: false, cost: 10 }]
    const plan = await optimize(input, engine)
    expect(plan.completed).toBe(1)
    expect(plan.usedOrgans['last-heart']).toBe(1)
    expect(plan.reserveFloor).toBe(0)
  })
  it('includes exactly the 36 source-defined variants and prevents invented skull values', async () => {
    expect(organCatalog).toHaveLength(36)
    for (const kind of ['skin', 'bones', 'skull', 'heart', 'brain', 'guts']) expect(organCatalog.filter((v) => v.kind === kind)).toHaveLength(6)
    expect(organCatalog.find((v) => v.kind === 'skull' && v.grade === 'gold' && v.red === 3)?.white).toBe(2)
    expect(organCatalog.find((v) => v.kind === 'heart' && v.grade === 'silver' && v.red === 2)?.white).toBe(2)
    const input = minimal()
    input.organs = [{ id: 'invented', kind: 'heart', grade: 'gold', white: 9, red: 0, quantity: 1, unlimited: false, cost: 1 }]
    await expect(optimize(input, engine)).rejects.toThrow('fixed game variant')
  })
  it('migrates old valid stock into the catalog and merges duplicate variants', () => {
    const organ = exampleInput().organs.find((o) => o.id === 'heart-white')!
    const migrated = normalizeOrgans([{ ...organ, quantity: 2 }, { ...organ, id: 'old-custom-id', quantity: 3 }])
    expect(migrated).toHaveLength(36)
    expect(migrated.find((o) => o.id === 'heart-white')?.quantity).toBe(5)
    expect(migrated.find((o) => o.id === 'heart-gold')?.quantity).toBe(0)
  })
})
