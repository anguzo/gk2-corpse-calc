import { useState } from 'react'
import { Search } from 'lucide-react'
import { usePlanner } from '../store/planner'
import { labels, requiredAnatomy } from '../lib/game-data'
import { organKinds } from '../lib/types'
import type { OrganKind } from '../lib/types'
import { Input } from './ui/input'
import { NumberInput, Skulls, Toggle } from './shared'
import { OrganIcon, Quality } from './game-icon'

export function Inventory() {
  const { organs, updateOrgan } = usePlanner()
  const [filter, setFilter] = useState<OrganKind | 'all'>('all')
  const [search, setSearch] = useState('')
  const [stockedOnly, setStockedOnly] = useState(false)
  const visible = organs.filter((o) => (filter === 'all' || o.kind === filter) && (!stockedOnly || o.quantity > 0 || o.unlimited) && `${labels[o.kind]} ${o.grade} ${o.white}w ${o.red}r`.toLowerCase().includes(search.toLowerCase()))
  return <>
    <div className="section-heading"><div><h2>Organ stash</h2><p>Fixed game variants. Enter the quantities in your chest.</p></div><label className="stocked-filter"><input type="checkbox" checked={stockedOnly} onChange={(e) => setStockedOnly(e.target.checked)} />In stock only</label></div>
    <div className="inventory-toolbar"><div className="filter-tabs">{(['all', ...organKinds] as const).map((k) => <button key={k} onClick={() => setFilter(k)} className={filter === k ? 'active' : ''}>{k === 'all' ? 'All organs' : labels[k]}</button>)}</div><div className="search-box"><Search size={15} /><Input aria-label="Search organ stash" placeholder="Search variants…" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
    <div className={`organ-catalog ${new Set(visible.map((o) => o.kind)).size === 1 ? 'single-kind' : ''}`}>{organKinds.filter((k) => visible.some((o) => o.kind === k)).map((kind) => {
      const variants = visible.filter((o) => o.kind === kind)
      const all = organs.filter((o) => o.kind === kind)
      return <section className={`organ-group ${kind}`} key={kind}><header><OrganIcon kind={kind} /><h3>{labels[kind]}</h3><span>{all.some((o) => o.unlimited) ? '∞' : all.reduce((s, o) => s + o.quantity, 0)} in stash</span></header><div className="variant-column-labels"><span>Quality / skulls</span><span>Qty</span><span title="Unlimited stock">∞</span></div>
        {variants.map((o) => <div className={`variant-row ${o.quantity || o.unlimited ? 'stocked' : ''}`} key={o.id}><OrganIcon kind={kind} grade={o.grade} /><div className="variant-description"><Quality grade={o.grade} /><Skulls white={o.white} red={o.red} compact /></div><NumberInput label={`${o.id} stock`} value={o.quantity} disabled={o.unlimited} onChange={(quantity) => updateOrgan(o.id, { quantity })} /><Toggle label={`${o.id} unlimited stock`} checked={o.unlimited} onChange={(unlimited) => updateOrgan(o.id, { unlimited })} /><span className="variant-mastery" title="Anatomy needed to insert">{requiredAnatomy(kind, o.grade)}</span></div>)}
      </section>
    })}{!visible.length && <p className="empty-table">No matching variants. Turn off “In stock only” to enter new stock.</p>}</div>
    <div className="card-footnote"><span>36 game variants · skull values are fixed</span><span>Row corner = required Anatomy</span></div>
  </>
}
