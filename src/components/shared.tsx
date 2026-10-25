import { Input } from './ui/input'
import { GameIcon } from './game-icon'
export function NumberInput({ value, onChange, label, max = 9999, min = 0, className = '', disabled = false }: { value: number; onChange: (value: number) => void; label: string; max?: number; min?: number; className?: string; disabled?: boolean }) {
  return <Input type="number" aria-label={label} min={min} max={max} step={1} value={value} disabled={disabled} onChange={(e) => onChange(Math.max(min, Math.min(max, Math.trunc(Number(e.target.value) || 0))))} className={`w-16 text-center tabular-nums px-1 ${className}`} />
}
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`toggle ${checked ? 'on' : ''}`}><span /></button>
}
export function Skulls({ white, red, compact = false }: { white: number; red: number; compact?: boolean }) {
  return <span className={`skull-pair ${compact ? 'compact' : ''}`}><span className="white-skull"><GameIcon name="white-skull" size={16} />{white}<span className="sr-only"> white skulls</span></span><span className="red-skull"><GameIcon name="red-skull" size={16} />{red}<span className="sr-only"> red skulls</span></span></span>
}
