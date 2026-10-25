import { Bound, Direction, Status } from './solver'
import type { BoundType, LinearModel, SolverEngine } from './solver'
import { improvedRed, organCatalog, requiredAnatomy } from './game-data'
import { reserveGroups } from './reserves'
import { organKinds } from './types'
import type { AssignedOrgan, Plan, PlannerInput, Treatment } from './types'

type Term = { name: string; coef: number }
type Choice = { name: string; corpse: number; assignment?: AssignedOrgan; treatment?: Treatment }
function mergeTerms(terms: Term[]): Term[] {
  const merged = new Map<string, number>()
  for (const { name, coef } of terms) merged.set(name, (merged.get(name) ?? 0) + coef)
  return [...merged].filter(([, coef]) => coef !== 0).map(([name, coef]) => ({ name, coef }))
}

/** Integer allocation across the entire batch, not a greedy corpse-by-corpse search. */
export async function optimize(input: PlannerInput, engine: SolverEngine): Promise<Plan> {
  const { organs, corpses, treatments, settings } = input
  if (organs.some((o) => !organCatalog.some((v) => v.kind === o.kind && v.white === o.white && v.red === o.red && requiredAnatomy(v.kind, v.grade) === requiredAnatomy(o.kind, o.grade)))) {
    throw new Error('An organ does not match a fixed game variant. Reload the stash catalog.')
  }
  const lp: LinearModel = { name: 'corpse-ledger', objective: { direction: Direction.max, name: 'ready', vars: [] }, subjectTo: [], binaries: [], generals: [], bounds: [] }
  const choices: Choice[] = []
  const ready: Term[] = []
  const organCost: Term[] = []
  const alchemyCost: Term[] = []
  const whiteTotal: Term[] = []
  const items: Term[] = []
  const stock = new Map<string, Term[]>()
  const improvers: Term[] = []
  const addStock = (id: string, name: string) => stock.set(id, [...(stock.get(id) ?? []), { name, coef: 1 }])
  const constrain = (name: string, vars: Term[], type: BoundType, lb = 0, ub = 0) => {
    lp.subjectTo.push({ name, vars: mergeTerms(vars), bnds: { type, lb, ub } })
  }
  corpses.forEach((corpse, ci) => {
    const y = `ready_${ci}`
    lp.binaries!.push(y)
    ready.push({ name: y, coef: 1 })
    const white: Term[] = [{ name: y, coef: corpse.flesh + corpse.baseWhite - settings.target }]
    const red: Term[] = [{ name: y, coef: corpse.baseRed }]
    const pockets: Term[] = [{ name: y, coef: corpse.flesh + corpse.otherPockets - 6 }]
    whiteTotal.push({ name: y, coef: corpse.flesh + corpse.baseWhite })
    for (const kind of organKinds) {
      const slot: Term[] = [{ name: y, coef: -1 }]
      organs.forEach((organ, oi) => {
        if (organ.kind !== kind || (!organ.unlimited && organ.quantity === 0)) return
        for (const improved of [false, true]) {
          if (improved && (!settings.improver.enabled || (!settings.improver.unlimited && !settings.improver.quantity) || (organ.white === 3 && organ.red === improvedRed[kind]))) continue
          if (settings.anatomy < requiredAnatomy(kind, improved ? 'gold' : organ.grade)) continue
          const name = `organ_${ci}_${oi}_${improved ? 1 : 0}`
          const assignment = { organ, improved, white: improved ? 3 : organ.white, red: improved ? improvedRed[kind] : organ.red }
          choices.push({ name, corpse: ci, assignment })
          lp.binaries!.push(name)
          slot.push({ name, coef: 1 })
          white.push({ name, coef: assignment.white })
          red.push({ name, coef: assignment.red })
          whiteTotal.push({ name, coef: assignment.white })
          items.push({ name, coef: 1 })
          organCost.push({ name, coef: organ.cost })
          addStock(organ.id, name)
          if (improved) {
            improvers.push({ name, coef: 1 })
            alchemyCost.push({ name, coef: settings.improver.cost })
          }
        }
      })
      constrain(`slot_${ci}_${kind}`, slot, Bound.upper)
    }
    treatments.forEach((t, ti) => {
      if (!t.enabled || (!t.unlimited && !t.quantity)) return
      const name = `bottle_${ci}_${ti}`
      choices.push({ name, corpse: ci, treatment: t })
      lp.generals!.push(name)
      lp.bounds!.push({ name, type: Bound.lower, lb: 0, ub: 0 })
      white.push({ name, coef: t.stars })
      whiteTotal.push({ name, coef: t.stars })
      if (t.kind === 'injection') red.push({ name, coef: -t.stars })
      pockets.push({ name, coef: 1 })
      items.push({ name, coef: 1 })
      alchemyCost.push({ name, coef: t.cost })
      addStock(t.id, name)
      constrain(`bottle_limit_${ci}_${ti}`, [{ name, coef: 1 }, { name: y, coef: -t.maxPerCorpse }], Bound.upper)
    })
    constrain(`white_${ci}`, white, Bound.lower)
    // Totals clamp at zero: negative raw red is valid, and does not require dummy red organs.
    constrain(`red_${ci}`, red, Bound.upper)
    constrain(`pockets_${ci}`, pockets, Bound.upper)
  })
  for (const item of [...organs, ...treatments]) {
    if (!item.unlimited && stock.has(item.id)) constrain(`stock_${item.id}`, stock.get(item.id)!, Bound.upper, 0, item.quantity)
  }
  if (!settings.improver.unlimited && improvers.length) constrain('improver_stock', improvers, Bound.upper, 0, settings.improver.quantity)
  const groups = reserveGroups(input)
  const finiteGroups = groups.filter((g) => !g.unlimited && g.before > 0)
  const reserveObjective: Term[] = []
  const pressure: Term[] = []
  if (settings.priority === 'balanced') {
    if (finiteGroups.length) {
      const floor = 'reserve_floor'
      lp.generals!.push(floor)
      lp.bounds!.push({ name: floor, type: Bound.lower, lb: 0, ub: 0 })
      reserveObjective.push({ name: floor, coef: 1 })
      for (const group of finiteGroups) {
        const used = group.organs.flatMap((o) => stock.get(o.id) ?? [])
        constrain(`reserve_${group.kind}`, [{ name: floor, coef: 1 }, ...used], Bound.upper, 0, group.before)
      }
    }
    // Convex depletion ladders: taking the last few costs progressively more.
    // Type pressure dominates variant pressure (10:1); no pressure for unlimited resources.
    const addPressure = (id: string, quantity: number, used: Term[], scale: number) => {
      if (!quantity || !used.length) return
      const steps: Term[] = []
      for (let i = 0; i < Math.min(quantity, corpses.length); i++) {
        const name = `deplete_${id}_${i}`
        lp.binaries!.push(name)
        steps.push({ name, coef: -1 })
        pressure.push({ name, coef: Math.max(1, Math.round(scale / (quantity - i))) })
        if (i > 0) constrain(`deplete_order_${id}_${i}`, [{ name, coef: 1 }, { name: `deplete_${id}_${i - 1}`, coef: -1 }], Bound.upper)
      }
      constrain(`depletion_${id}`, [...used, ...steps], Bound.fixed)
    }
    for (const group of finiteGroups) addPressure(`kind_${group.kind}`, group.before, group.organs.flatMap((o) => stock.get(o.id) ?? []), 10000)
    for (const group of groups) {
      for (const organ of group.organs.filter((o) => !o.unlimited)) addPressure(organ.id, organ.quantity, stock.get(organ.id) ?? [], 1000)
    }
  }
  let optimal = true
  let values: Record<string, number> = {}
  const score = (terms: Term[]) => terms.reduce((sum, term) => sum + term.coef * (values[term.name] ?? 0), 0)
  const solveStage = async (terms: Term[], maximize = false) => {
    const merged = mergeTerms(terms)
    lp.objective = { direction: maximize ? Direction.max : Direction.min, name: 'objective', vars: merged.length ? merged : [{ name: ready[0].name, coef: 0 }] }
    const solved = await engine.solve(lp)
    if (solved.result.status !== Status.optimal && solved.result.status !== Status.feasible) {
      // A later objective may time out before rediscovering the known feasible allocation.
      if (Object.keys(values).length) { optimal = false; return false }
      throw new Error('The solver could not find a valid plan. Check the entered values.')
    }
    values = solved.result.vars
    if (solved.result.status !== Status.optimal) { optimal = false; return false }
    constrain(`fixed_stage_${lp.subjectTo.length}`, terms, Bound.fixed, Math.round(score(terms)), Math.round(score(terms)))
    return true
  }
  if (!corpses.length) return { corpses: [], completed: 0, organCost: 0, alchemyCost: 0, excess: 0, optimal: true, usedOrgans: {}, usedTreatments: {}, usedImprovers: 0, reserves: groups.map((g) => ({ kind: g.kind, before: g.before, after: g.before, unlimited: g.unlimited })), reserveFloor: finiteGroups.length ? Math.min(...finiteGroups.map((g) => g.before)) : null }
  const first = await solveStage(ready, true)
  if (first) {
    const costs = settings.priority === 'organs' ? [organCost, alchemyCost] : settings.priority === 'alchemy' ? [alchemyCost, organCost] : [[...organCost, ...alchemyCost]]
    let keepGoing = true
    if (reserveObjective.length) keepGoing = await solveStage(reserveObjective, true)
    if (keepGoing && pressure.length) keepGoing = await solveStage(pressure)
    for (const cost of costs) { if (keepGoing) keepGoing = await solveStage(cost) }
    if (keepGoing && await solveStage(whiteTotal)) await solveStage(items)
  }
  const usedOrgans: Record<string, number> = {}
  const usedTreatments: Record<string, number> = {}
  let usedImprovers = 0
  const plans = corpses.map((corpse, ci) => {
    const assignments: AssignedOrgan[] = []
    const bottles: { treatment: Treatment; count: number }[] = []
    const built = (values[`ready_${ci}`] ?? 0) > 0.5
    for (const choice of choices.filter((c) => c.corpse === ci)) {
      const count = Math.round(values[choice.name] ?? 0)
      if (!count) continue
      if (choice.assignment) {
        assignments.push(choice.assignment)
        const id = choice.assignment.organ.id
        usedOrgans[id] = (usedOrgans[id] ?? 0) + 1
        if (choice.assignment.improved) usedImprovers++
      }
      if (choice.treatment) {
        bottles.push({ treatment: choice.treatment, count })
        const id = choice.treatment.id
        usedTreatments[id] = (usedTreatments[id] ?? 0) + count
      }
    }
    const beforeWhite = corpse.flesh + corpse.baseWhite + assignments.reduce((s, a) => s + a.white, 0)
    const beforeRed = corpse.baseRed + assignments.reduce((s, a) => s + a.red, 0)
    return { corpse, built, organs: assignments, treatments: bottles, beforeWhite, beforeRed,
      white: Math.max(0, beforeWhite + bottles.reduce((s, b) => s + b.treatment.stars * b.count, 0)),
      red: Math.max(0, beforeRed - bottles.filter((b) => b.treatment.kind === 'injection').reduce((s, b) => s + b.treatment.stars * b.count, 0)),
      pocketCount: corpse.flesh + corpse.otherPockets + bottles.reduce((s, b) => s + b.count, 0),
    }
  })
  // Independently check solver output before showing actionable allocations.
  for (const p of plans.filter((p) => p.built)) {
    if (p.white < settings.target || p.red !== 0 || p.pocketCount > 6 || new Set(p.organs.map((o) => o.organ.kind)).size !== p.organs.length) throw new Error('Plan validation failed; no allocation has been applied.')
  }
  for (const item of [...organs, ...treatments]) {
    if (!item.unlimited && (usedOrgans[item.id] ?? usedTreatments[item.id] ?? 0) > item.quantity) throw new Error('Plan exceeds available stock.')
  }
  if (!settings.improver.unlimited && usedImprovers > settings.improver.quantity) throw new Error('Plan exceeds available improvers.')
  const completed = plans.filter((p) => p.built).length
  const reserves = groups.map((g) => ({ kind: g.kind, before: g.before, after: g.before - g.organs.filter((o) => !o.unlimited).reduce((s, o) => s + (usedOrgans[o.id] ?? 0), 0), unlimited: g.unlimited }))
  const limitedReserves = reserves.filter((r) => !r.unlimited && r.before > 0)
  return { corpses: plans, completed, organCost: Math.round(score(organCost)), alchemyCost: Math.round(score(alchemyCost)),
    excess: plans.filter((p) => p.built).reduce((s, p) => s + p.white - settings.target, 0), optimal, usedOrgans, usedTreatments, usedImprovers, reserves, reserveFloor: limitedReserves.length ? Math.min(...limitedReserves.map((r) => r.after)) : null }
}
