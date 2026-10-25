import loadHighs from 'highs'
import wasmUrl from 'highs/runtime?url'
import { optimize } from './optimizer'
import { createHighsEngine } from './solver'
import type { PlannerInput } from './types'

const engine = loadHighs({ locateFile: () => wasmUrl }).then(createHighsEngine)
self.onmessage = async (event: MessageEvent<{ id: number; input: PlannerInput }>) => {
  const { id, input } = event.data
  try {
    self.postMessage({ id, plan: await optimize(input, await engine) })
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Calculation failed.' })
  }
}
