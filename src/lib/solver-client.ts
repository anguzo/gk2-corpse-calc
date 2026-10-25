import type { Plan, PlannerInput } from './types'

export class SolverClient {
  private worker = new Worker(new URL('./optimizer.worker.ts', import.meta.url), { type: 'module' })
  private nextId = 0
  private pending = new Map<number, { resolve: (plan: Plan) => void; reject: (error: Error) => void }>()
  constructor() {
    this.worker.onmessage = (event: MessageEvent<{ id: number; plan?: Plan; error?: string }>) => {
      const request = this.pending.get(event.data.id)
      this.pending.delete(event.data.id)
      if (event.data.plan) request?.resolve(event.data.plan)
      else request?.reject(new Error(event.data.error ?? 'Calculation failed.'))
    }
    this.worker.onerror = () => this.failPending('Could not load the optimization worker. Reload the page and try again.')
  }
  optimize(input: PlannerInput): Promise<Plan> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker.postMessage({ id, input })
    })
  }
  private failPending(message: string) {
    for (const request of this.pending.values()) request.reject(new Error(message))
    this.pending.clear()
  }
  terminate() {
    this.worker.terminate()
    this.failPending('Calculation stopped.')
  }
}
