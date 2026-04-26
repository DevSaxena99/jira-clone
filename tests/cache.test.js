const cacheService = require('../src/services/cacheService')
const { client: redis } = require('../src/config/redis')

beforeAll(async () => { await redis.connect().catch(() => {}) })
afterEach(async () => { await redis.flushdb() })
afterAll(async () => { await redis.quit() })

describe('cacheService', () => {
  it('set and get returns the cached value', async () => {
    await cacheService.set('test:key', { hello: 'world' }, 60)
    const val = await cacheService.get('test:key')
    expect(val).toEqual({ hello: 'world' })
  })

  it('get returns null for missing key', async () => {
    const val = await cacheService.get('nonexistent')
    expect(val).toBeNull()
  })

  it('del removes the key', async () => {
    await cacheService.set('del:key', 'value', 60)
    await cacheService.del('del:key')
    const val = await cacheService.get('del:key')
    expect(val).toBeNull()
  })

  it('wrap returns cached value on second call without calling fetchFn again', async () => {
    let calls = 0
    const fetch = async () => { calls++; return { data: 42 } }

    const r1 = await cacheService.wrap('wrap:key', 60, fetch)
    const r2 = await cacheService.wrap('wrap:key', 60, fetch)

    expect(r1).toEqual({ data: 42 })
    expect(r2).toEqual({ data: 42 })
    expect(calls).toBe(1)
  })
})
