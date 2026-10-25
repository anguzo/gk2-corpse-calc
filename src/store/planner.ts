import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { exampleInput, normalizeOrgans } from '../lib/game-data'
import type { Corpse, Organ, PlannerInput, Settings, Treatment } from '../lib/types'

interface PlannerStore extends PlannerInput {
  updateOrgan: (id: string, patch: Pick<Partial<Organ>, 'quantity' | 'unlimited'>) => void
  updateCorpse: (id: string, patch: Partial<Corpse>) => void
  addCorpse: () => void
  removeCorpse: (id: string) => void
  updateTreatment: (id: string, patch: Partial<Treatment>) => void
  updateSettings: (patch: Partial<Settings>) => void
  loadExample: () => void
  clearStock: () => void
}
export const usePlanner = create<PlannerStore>()(persist((set) => ({
  ...exampleInput(),
  updateOrgan: (id, patch) => set((s) => ({ organs: s.organs.map((o) => o.id === id ? { ...o, ...patch } : o) })),
  updateCorpse: (id, patch) => set((s) => ({ corpses: s.corpses.map((c) => c.id === id ? { ...c, ...patch } : c) })),
  addCorpse: () => set((s) => ({ corpses: [...s.corpses, { id: crypto.randomUUID(), name: `Corpse ${s.corpses.length + 1}`, flesh: 1, otherPockets: 0, baseWhite: 0, baseRed: 0 }] })),
  removeCorpse: (id) => set((s) => ({ corpses: s.corpses.filter((c) => c.id !== id) })),
  updateTreatment: (id, patch) => set((s) => ({ treatments: s.treatments.map((t) => t.id === id ? { ...t, ...patch } : t) })),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  loadExample: () => set(exampleInput()),
  clearStock: () => set((s) => ({ organs: s.organs.map((o) => ({ ...o, quantity: 0, unlimited: false })) })),
}), {
  name: 'corpse-ledger-v1', version: 2, skipHydration: true,
  migrate: (persisted) => {
    const old = persisted as PlannerInput
    return { ...old, organs: normalizeOrgans(old.organs ?? []) }
  },
  merge: (persisted, current) => {
    const saved = persisted as Partial<PlannerInput> | undefined
    return { ...current, ...saved, organs: normalizeOrgans(saved?.organs ?? current.organs) }
  },
  partialize: ({ organs, corpses, treatments, settings }) => ({ organs, corpses, treatments, settings }),
}))
