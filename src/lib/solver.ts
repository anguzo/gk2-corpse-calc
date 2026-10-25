import type { LegacyHighs } from 'highs'

export const Bound = { upper: 'upper', lower: 'lower', fixed: 'fixed' } as const
export type BoundType = (typeof Bound)[keyof typeof Bound]
export const Direction = { max: 'max', min: 'min' } as const
export const Status = { optimal: 'optimal', feasible: 'feasible', unknown: 'unknown' } as const
type Term = { name: string; coef: number }
export interface LinearModel {
  name: string
  objective: { direction: 'max' | 'min'; name: string; vars: Term[] }
  subjectTo: { name: string; vars: Term[]; bnds: { type: BoundType; lb: number; ub: number } }[]
  binaries: string[]
  generals: string[]
  bounds: { name: string; type: BoundType; lb: number; ub: number }[]
}
export interface SolverEngine {
  solve(model: LinearModel): Promise<{ result: { status: string; vars: Record<string, number> } }>
}

/** Independent model validation also makes time-limited solver results safe to use. */
function feasible(model: LinearModel, vars: Record<string, number>) {
  const tolerance = 1e-5
  if (Object.values(vars).some((value) => !Number.isFinite(value) || value < -tolerance)) return false
  for (const name of [...model.binaries, ...model.generals]) {
    if (!(name in vars) || Math.abs(vars[name] - Math.round(vars[name])) > tolerance) return false
  }
  if (model.binaries.some((name) => vars[name] > 1 + tolerance)) return false
  const inBounds = (value: number, b: { type: BoundType; lb: number; ub: number }) =>
    b.type === Bound.upper ? value <= b.ub + tolerance : b.type === Bound.lower ? value >= b.lb - tolerance : Math.abs(value - b.lb) <= tolerance
  if (model.bounds.some((b) => !inBounds(vars[b.name], b))) return false
  return model.subjectTo.every((row) => inBounds(row.vars.reduce((s, t) => s + t.coef * vars[t.name], 0), row.bnds))
}

/** Serialize our integer model to CPLEX LP, using safe aliases for all names. */
export function createHighsEngine(highs: LegacyHighs): SolverEngine {
  return { solve: async (model) => {
    const names = [...new Set([
      ...model.binaries, ...model.generals, ...model.bounds.map((b) => b.name),
      ...model.objective.vars.map((t) => t.name), ...model.subjectTo.flatMap((r) => r.vars.map((t) => t.name)),
    ])]
    const aliases = new Map(names.map((name, i) => [name, `v${i}`]))
    const expression = (terms: Term[]) => terms.length
      ? terms.map((t) => `${t.coef < 0 ? '-' : '+'} ${Math.abs(t.coef)} ${aliases.get(t.name)}`).join(' ')
      : `0 ${aliases.get(names[0])}`
    const relation = (b: { type: BoundType; lb: number; ub: number }) => b.type === Bound.upper ? `<= ${b.ub}` : b.type === Bound.lower ? `>= ${b.lb}` : `= ${b.lb}`
    const lp = [
      model.objective.direction === Direction.max ? 'Maximize' : 'Minimize',
      `obj: ${expression(model.objective.vars)}`,
      'Subject To',
      ...model.subjectTo.map((r, i) => `c${i}: ${expression(r.vars)} ${relation(r.bnds)}`),
      'Bounds',
      ...model.bounds.map((b) => `${aliases.get(b.name)} ${relation(b)}`),
      ...(model.generals.length ? ['Generals', ...model.generals.map((name) => aliases.get(name)!)] : []),
      ...(model.binaries.length ? ['Binaries', ...model.binaries.map((name) => aliases.get(name)!)] : []),
      'End',
    ].join('\n')
    const result = highs.solve(lp, { output_flag: false, presolve: 'on', time_limit: 15, mip_rel_gap: 0, mip_abs_gap: 0 })
    const vars = Object.fromEntries(names.map((name) => {
      const column = result.Columns[aliases.get(name)!]
      return [name, column && 'Primal' in column ? column.Primal : Number.NaN]
    }))
    const valid = feasible(model, vars)
    return { result: { status: valid ? result.Status === 'Optimal' ? Status.optimal : Status.feasible : Status.unknown, vars: valid ? vars : {} } }
  } }
}
