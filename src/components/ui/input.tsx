import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input data-slot="input" className={cn('h-9 min-w-0 rounded-md border border-border bg-background px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40', className)} {...props} />
}
