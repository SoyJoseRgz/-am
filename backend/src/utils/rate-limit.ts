const hits = new Map<string, { count: number; reset: number }>()

export function rateLimit(opts: { max: number; windowMs: number }) {
  return (req: any, _reply: any, done: () => void) => {
    const key = req.ip || 'unknown'
    const now = Date.now()
    const entry = hits.get(key)
    if (!entry || now > entry.reset) {
      hits.set(key, { count: 1, reset: now + opts.windowMs })
      done()
      return
    }
    if (entry.count >= opts.max) {
      _reply.status(429).send({ error: 'Demasiadas solicitudes, intenta más tarde' })
      return
    }
    entry.count++
    done()
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of hits) {
    if (now > entry.reset) hits.delete(key)
  }
}, 60000)
