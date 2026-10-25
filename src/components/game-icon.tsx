import { organSprite } from '../lib/game-data'
import type { Grade, OrganKind } from '../lib/types'
export function GameIcon({ name, className = '', alt = '', size = 24 }: { name: string; className?: string; alt?: string; size?: number }) {
  return <img className={`game-icon ${className}`} src={`${import.meta.env.BASE_URL}icons/${name}.svg`} alt={alt} width={size} height={size} />
}
export function OrganIcon({ kind, grade = 'bronze' }: { kind: OrganKind; grade?: Grade }) {
  return <span className={`organ-icon ${kind} quality-${grade}`}><GameIcon name={organSprite(kind, grade)} size={32} /></span>
}
export function Quality({ grade }: { grade: Grade }) {
  return <span className={`quality-label ${grade}`} title={`${grade === 'ordinary' ? 'Basic' : grade} quality`}><span aria-hidden="true">{grade === 'ordinary' ? '·' : '★'.repeat(grade === 'gold' ? 3 : grade === 'silver' ? 2 : 1)}</span><span className="sr-only">{grade} quality</span></span>
}
