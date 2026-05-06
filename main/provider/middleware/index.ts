// LightPay Provider Middleware Pipeline

export type MiddlewareNext = (err?: Error) => void
export type MiddlewareFn = (payload: any, res: (data: any) => void, next: MiddlewareNext) => void | Promise<void>

export interface MiddlewareLayer {
  name: string
  fn: MiddlewareFn
  methods?: string[] // if set, only handles these RPC methods
}

export class MiddlewarePipeline {
  private layers: MiddlewareLayer[] = []

  use(layer: MiddlewareLayer): this {
    this.layers.push(layer)
    return this
  }

  remove(name: string): this {
    this.layers = this.layers.filter(l => l.name !== name)
    return this
  }

  getLayer(name: string): MiddlewareLayer | undefined {
    return this.layers.find(l => l.name === name)
  }

  getStats(): { layerCount: number; layerNames: string[] } {
    return { layerCount: this.layers.length, layerNames: this.layers.map(l => l.name) }
  }

  async execute(payload: any, res: (data: any) => void): Promise<void> {
    let index = 0

    const next: MiddlewareNext = async (err?: Error) => {
      if (err) {
        res({ error: { message: err.message, code: -32603 } })
        return
      }
      if (index >= this.layers.length) return
      const layer = this.layers[index++]
      // Only run if layer handles this method (or handles all methods)
      if (layer.methods && !layer.methods.includes(payload?.method)) {
        return next()
      }
      try {
        await layer.fn(payload, res, next)
      } catch (e: any) {
        res({ error: { message: e.message, code: -32603 } })
      }
    }

    await next()
  }
}
