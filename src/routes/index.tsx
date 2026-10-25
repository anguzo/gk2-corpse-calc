import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, BookOpen, Check, CircleHelp, LoaderCircle, RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import { usePlanner } from '../store/planner'
import type { SolverClient } from '../lib/solver-client'
import type { Plan, PlannerInput } from '../lib/types'
import { Inventory } from '../components/inventory'
import { Alchemy } from '../components/alchemy'
import { Batch } from '../components/batch'
import { Results } from '../components/results'
import { Rules } from '../components/rules'
import { Button } from '../components/ui/button'
import { GameIcon } from '../components/game-icon'

export const Route = createFileRoute('/')({ component: Home })
function Home() {
  const store = usePlanner()
  const [tab, setTab] = useState<'stash' | 'alchemy' | 'autopsy'>('stash')
  const [view, setView] = useState<'planner' | 'rules'>('planner')
  const [hydrated, setHydrated] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planInput, setPlanInput] = useState<PlannerInput | null>(null)
  const engine = useRef<SolverClient | null>(null)
  const workspacePanel = useRef<HTMLElement | null>(null)
  useEffect(() => { void Promise.resolve(usePlanner.persist.rehydrate()).then(() => setHydrated(true)); return () => engine.current?.terminate() }, [])
  useEffect(() => {
    if (plan) workspacePanel.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
  }, [plan])
  const input: PlannerInput = { organs: store.organs, corpses: store.corpses, treatments: store.treatments, settings: store.settings }
  const stale = !!planInput && JSON.stringify(input) !== JSON.stringify(planInput)
  async function calculate() {
    setRunning(true); setError('')
    const snapshot = structuredClone(input)
    try {
      if (!engine.current) { const { SolverClient } = await import('../lib/solver-client'); engine.current = new SolverClient() }
      const result = await engine.current.optimize(snapshot)
      setPlan(result); setPlanInput(snapshot); setTab('autopsy')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not calculate. Please try again.') }
    finally { setRunning(false) }
  }
  const finiteStock = store.organs.filter((o) => !o.unlimited).reduce((s, o) => s + o.quantity, 0)
  const unlimited = store.organs.some((o) => o.unlimited)
  const stockedVariants = store.organs.filter((o) => o.quantity || o.unlimited).length
  const alchemyCount = store.treatments.filter((t) => t.enabled).length + (store.settings.improver.enabled ? 1 : 0)
  return <div className="app-shell"><header className="topbar"><a className="brand" href={import.meta.env.BASE_URL} aria-label="Corpse Ledger home"><GameIcon name="i_skull" size={36} /><div>Corpse Ledger<small>GRAVEYARD KEEPER 2</small></div></a><div className="topbar-actions"><span className="saved-status"><Check size={13} />{hydrated ? 'Saved in browser' : 'Loading…'}</span><Button variant="ghost" size="sm" onClick={() => setView(view === 'rules' ? 'planner' : 'rules')}><BookOpen />{view === 'rules' ? 'Back to planner' : 'Rules & sources'}</Button><Button variant="outline" size="sm" onClick={() => { if (window.confirm('Replace your saved ledger with the four-corpse example?')) { store.loadExample(); setPlan(null); setPlanInput(null); setTab('stash'); setView('planner') } }}><RotateCcw />Load example</Button></div></header>
    <main><div className="page-heading"><div><h1>{view === 'planner' ? 'Corpse planner' : 'Rules & sources'}</h1><p>{view === 'planner' ? 'Build burial-ready bodies while keeping a flexible, balanced stash.' : 'Fixed organ variants, pocket limits, and optimization rules.'}</p></div>{view === 'planner' && <div className="stash-hud"><span><GameIcon name="i_bag_universal" />{finiteStock}{unlimited ? ' + ∞' : ''}<small>organs</small></span><span><GameIcon name="i_body" />{store.corpses.length}<small>corpses</small></span><span><GameIcon name="white-skull" size={17} />{store.settings.target}<small>target</small></span></div>}</div>
      {view === 'rules' ? <section className="panel"><Rules /></section> : <div className="workspace"><div className="workspace-main"><section ref={workspacePanel} className="panel workspace-panel"><div className="workspace-tabs" role="tablist" aria-label="Planner sections"><button role="tab" aria-selected={tab === 'stash'} className={tab === 'stash' ? 'active' : ''} onClick={() => setTab('stash')}><GameIcon name="i_bag_universal" />Stash<span>{stockedVariants}</span></button><button role="tab" aria-selected={tab === 'alchemy'} className={tab === 'alchemy' ? 'active' : ''} onClick={() => setTab('alchemy')}><GameIcon name="i_embalm_white" />Alchemy<span>{alchemyCount}</span></button><button role="tab" aria-selected={tab === 'autopsy'} className={tab === 'autopsy' ? 'active' : ''} onClick={() => setTab('autopsy')}><GameIcon name="i_body" />Autopsy{plan && <span>{plan.completed}</span>}</button></div><div role="tabpanel">{tab === 'stash' ? <Inventory /> : tab === 'alchemy' ? <Alchemy /> : <Results plan={plan} input={planInput} stale={stale} />}</div></section>
        <div className="calculate-bar"><div><strong>{running ? 'Balancing the batch…' : store.settings.priority === 'balanced' ? 'Keep your options open.' : 'Ready to plan the batch?'}</strong><p>{stale ? 'Inputs changed. Recalculate your allocation.' : 'Shared stock · pocket limits · safe insertions'}</p></div><Button onClick={calculate} disabled={!hydrated || running || !store.corpses.length}>{running ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{running ? 'Calculating…' : 'Calculate best plan'}{!running && <ArrowRight />}</Button></div>
        {error && <div role="alert" className="warning-note">{error}</div>}
        <div className="below-note"><CircleHelp size={15} /><p>Balanced stash protects low reserves, then draws from plentiful organs and uses alchemy where it helps.</p><button onClick={() => setView('rules')}>How it works <ArrowRight size={13} /></button></div>
        {tab === 'stash' && <Button variant="ghost" size="sm" className="clear-stock" onClick={() => { if (window.confirm('Set all organ quantities to zero and turn off unlimited stock?')) store.clearStock() }}><Trash2 />Clear stock quantities</Button>}
      </div><Batch /></div>}
      <footer><span>Unofficial fan tool · original code & pixel icons: MIT</span><a href="https://gk2db.org/items/corpse/" target="_blank" rel="noreferrer">Organ reference: GK2DB</a></footer>
    </main></div>
}
