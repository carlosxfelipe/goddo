import { Goddo, t } from 'goddo'

// ─── Helpers ──────────────────────────────────────────────────────────────────

let nextPort = 4210

const freshPort = (): number => nextPort++

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Connect and resolve once the WebSocket handshake is complete. */
function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.onopen = () => resolve(ws)
    ws.onerror = reject
  })
}

/** Resolve with the next message received on a connection. */
function nextMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    ws.onmessage = (e) => resolve(e.data as string)
    ws.onerror = reject
  })
}

/** Close the connection and wait for the `close` event. */
function closeAndWait(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) return resolve()
    ws.onclose = () => resolve()
    ws.close()
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

Deno.test({
  name: 'WS open callback fires and server can greet the client',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const p = freshPort()
    const app = new Goddo()
    app.ws('/ws', {
      open(ws) {
        ws.send('hello')
      },
    })
    app.listen(p)
    await sleep(50)

    const client = await connect(`ws://localhost:${p}/ws`)
    const greeting = await nextMessage(client)

    await closeAndWait(client)
    await app.stop()

    if (greeting !== 'hello') throw new Error(`Expected 'hello', got: ${greeting}`)
  },
})

Deno.test({
  name: 'WS message callback echoes back to client',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const p = freshPort()
    const app = new Goddo()
    app.ws('/ws', {
      message(ws, msg) {
        ws.send(`echo: ${msg}`)
      },
    })
    app.listen(p)
    await sleep(50)

    const client = await connect(`ws://localhost:${p}/ws`)
    client.send('ping')
    const reply = await nextMessage(client)

    await closeAndWait(client)
    await app.stop()

    if (reply !== 'echo: ping') throw new Error(`Expected 'echo: ping', got: ${reply}`)
  },
})

Deno.test({
  name: 'WS close callback fires when client disconnects',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const p = freshPort()
    const app = new Goddo()
    let closed = false
    app.ws('/ws', {
      close() {
        closed = true
      },
    })
    app.listen(p)
    await sleep(50)

    const client = await connect(`ws://localhost:${p}/ws`)
    await closeAndWait(client)
    await sleep(50) // let the server run the close callback

    await app.stop()

    if (!closed) throw new Error('close callback did not fire')
  },
})

Deno.test({
  name: 'WS body validation: parses JSON and validates schema',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const p = freshPort()
    const app = new Goddo()
    let received: unknown
    let errored = false

    app.ws('/ws', {
      body: t.Object({ text: t.String() }),
      message(_ws, msg) {
        received = msg
      },
      error(_ws, _err) {
        errored = true
      },
    })
    app.listen(p)
    await sleep(50)

    const client = await connect(`ws://localhost:${p}/ws`)

    // Valid message — should call message()
    client.send(JSON.stringify({ text: 'hello' }))
    await sleep(40)

    // Invalid message — should call error() instead of message()
    client.send(JSON.stringify({ wrong: 123 }))
    await sleep(40)

    await closeAndWait(client)
    await app.stop()

    const rec = received as Record<string, unknown>
    if (!rec || rec.text !== 'hello') {
      throw new Error(`Expected { text: 'hello' }, got: ${JSON.stringify(received)}`)
    }
    if (!errored) throw new Error('error callback should have fired for the invalid message')
  },
})

Deno.test({
  name: 'WS pub/sub: publish delivers to subscribers, not to sender',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const p = freshPort()
    const app = new Goddo()

    app.ws('/ws', {
      open(ws) {
        ws.subscribe('room')
      },
      message(ws, msg) {
        // broadcast to everyone in the room except self
        ws.publish('room', msg)
      },
    })
    app.listen(p)
    await sleep(50)

    const clientA = await connect(`ws://localhost:${p}/ws`)
    const clientB = await connect(`ws://localhost:${p}/ws`)
    await sleep(40) // both open() callbacks must fire before sending

    const messagesA: string[] = []
    const messagesB: string[] = []
    clientA.onmessage = (e) => messagesA.push(e.data as string)
    clientB.onmessage = (e) => messagesB.push(e.data as string)

    clientA.send('hello from A')
    await sleep(60)

    await closeAndWait(clientA)
    await closeAndWait(clientB)
    await app.stop()

    if (messagesA.length !== 0) {
      throw new Error(`Sender should not receive own publish; got: ${JSON.stringify(messagesA)}`)
    }
    if (messagesB.length !== 1 || messagesB[0] !== 'hello from A') {
      throw new Error(
        `Client B should receive 'hello from A'; got: ${JSON.stringify(messagesB)}`,
      )
    }
  },
})

Deno.test({
  name: 'WS isSubscribed reflects topic state after subscribe/unsubscribe',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const p = freshPort()
    const app = new Goddo()
    let afterSubscribe = false
    let afterUnsubscribe = false

    app.ws('/ws', {
      open(ws) {
        ws.subscribe('chan')
        afterSubscribe = ws.isSubscribed('chan')
        ws.unsubscribe('chan')
        afterUnsubscribe = ws.isSubscribed('chan')
      },
    })
    app.listen(p)
    await sleep(50)

    const client = await connect(`ws://localhost:${p}/ws`)
    await sleep(40)

    await closeAndWait(client)
    await app.stop()

    if (!afterSubscribe) throw new Error('isSubscribed should be true after subscribe()')
    if (afterUnsubscribe) throw new Error('isSubscribed should be false after unsubscribe()')
  },
})

Deno.test({
  name: 'WS non-upgrade request returns 426',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const p = freshPort()
    const app = new Goddo()
    app.ws('/ws', {
      message(ws, msg) {
        ws.send(msg as string)
      },
    })
    app.listen(p)
    await sleep(50)

    const res = await fetch(`http://localhost:${p}/ws`)
    const status = res.status
    await res.text() // drain

    await app.stop()

    if (status !== 426) throw new Error(`Expected 426, got ${status}`)
  },
})

Deno.test({
  name: 'WS send serializes objects as JSON',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const p = freshPort()
    const app = new Goddo()
    app.ws('/ws', {
      open(ws) {
        ws.send({ type: 'welcome', code: 42 })
      },
    })
    app.listen(p)
    await sleep(50)

    const client = await connect(`ws://localhost:${p}/ws`)
    const raw = await nextMessage(client)

    await closeAndWait(client)
    await app.stop()

    const parsed = JSON.parse(raw) as { type: string; code: number }
    if (parsed.type !== 'welcome' || parsed.code !== 42) {
      throw new Error(`Unexpected JSON payload: ${raw}`)
    }
  },
})
