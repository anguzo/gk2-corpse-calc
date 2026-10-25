import { Sparkles } from 'lucide-react'
import { usePlanner } from '../store/planner'
import { NumberInput, Toggle } from './shared'
import { GameIcon } from './game-icon'
export function Alchemy() {
  const { treatments, settings, updateTreatment, updateSettings } = usePlanner()
  return <>
    <div className="section-heading"><div><h2>Alchemy supplies</h2><p>Enable the grades you own or can craft.</p></div><GameIcon name="i_embalm_white" size={32} /></div>
    <div className="alchemy-note"><Sparkles size={18} /><div><strong>Yes, solutions and injections can stack.</strong><p>Each bottle occupies one of six pockets, alongside flesh. You can repeat a treatment; set a per-corpse limit below.</p></div></div>
    {(['solution', 'injection'] as const).map((kind) => <div className="treatment-group" key={kind}><h3><GameIcon name={kind === 'solution' ? 'i_embalm_white' : 'i_embalm_white_red'} size={28} />{kind === 'solution' ? 'Solution for Corpses' : 'Injection for Corpses'}</h3><p>{kind === 'solution' ? 'Melted Fat + Preservative · Embalming I' : 'Melted Fat + Preservative + Comet’s Tail · Embalming III'}</p>
      <div className="table-scroll"><table className="alchemy-table"><thead><tr><th>Available</th><th>Grade / effect</th><th>Bottles</th><th>Can craft freely</th><th>Max / corpse</th><th>Cost weight</th></tr></thead><tbody>{treatments.filter((t) => t.kind === kind).map((t) => <tr key={t.id} className={!t.enabled ? 'disabled-row' : ''}>
        <td><Toggle label={`Enable ${t.id}`} checked={t.enabled} onChange={(enabled) => updateTreatment(t.id, { enabled })} /></td><td><span className="stars">{'★'.repeat(t.stars)}<span>{'★'.repeat(3 - t.stars)}</span></span><small>+{t.stars} white{kind === 'injection' ? ` / −${t.stars} red` : ''}</small></td>
        <td><NumberInput label={`${t.id} bottles`} value={t.quantity} disabled={t.unlimited} onChange={(quantity) => updateTreatment(t.id, { quantity })} /></td>
        <td><Toggle label={`${t.id} craft freely`} checked={t.unlimited} onChange={(unlimited) => updateTreatment(t.id, { unlimited })} /></td>
        <td><NumberInput label={`${t.id} max per corpse`} value={t.maxPerCorpse} max={6} onChange={(maxPerCorpse) => updateTreatment(t.id, { maxPerCorpse })} /></td>
        <td><NumberInput label={`${t.id} cost weight`} value={t.cost} max={1000} onChange={(cost) => updateTreatment(t.id, { cost })} /></td></tr>)}</tbody></table></div>
    </div>)}
    <div className="improver-block"><div className="improver-title"><div><h3><GameIcon name="i_organ_improver_white" size={28} />White Organ Improver</h3><p>2 Flour · Practical Potions · Apply at the Formulation Bench</p></div><Toggle label="Enable white organ improvers" checked={settings.improver.enabled} onChange={(enabled) => updateSettings({ improver: { ...settings.improver, enabled } })} /></div>
      <div className="improver-controls"><label>In stock<NumberInput label="Organ improver quantity" value={settings.improver.quantity} disabled={settings.improver.unlimited} onChange={(quantity) => updateSettings({ improver: { ...settings.improver, quantity } })} /></label><label>Can craft freely<Toggle label="Organ improver craft freely" checked={settings.improver.unlimited} onChange={(unlimited) => updateSettings({ improver: { ...settings.improver, unlimited } })} /></label><label>Cost weight<NumberInput label="Organ improver cost weight" value={settings.improver.cost} max={1000} onChange={(cost) => updateSettings({ improver: { ...settings.improver, cost } })} /></label></div>
      <p className="helper">Consumes one donor organ + one improver. Result: 3 white; skin, bones and guts also have 1 red. Output is gold grade and must meet your Anatomy limit.</p>
    </div>
  </>
}
