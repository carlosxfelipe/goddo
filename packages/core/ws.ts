import type { TSchema } from './schema.ts'
import type { DocumentDetail, MaybePromise } from './types.ts'

// ─── Topic Registry ───────────────────────────────────────────────────────────

/** One `Map<topic, Set<GoddoWebSocket>>` per Goddo instance. */
export type TopicMap = Map<string, Set<GoddoWebSocket>>

// ─── WSOptions ────────────────────────────────────────────────────────────────

/** Options for configuring a Goddo WebSocket upgrade. */
export interface WSOptions {
  // ── Validation schemas applied to the upgrade HTTP request ──
  /** Validates URL path parameters at upgrade time. */
  params?: TSchema
  /** Validates query-string parameters at upgrade time. */
  query?: TSchema
  /** Validates request headers at upgrade time. */
  headers?: TSchema
  /**
   * Validates each incoming WebSocket message.
   * JSON strings are parsed automatically before validation.
   * Validation failures trigger `error()` instead of `message()`.
   */
  body?: TSchema
  /** OpenAPI metadata (used when scalar generates the spec). */
  detail?: DocumentDetail

  // ── Lifecycle callbacks ──
  /** Called once the WebSocket handshake is complete. */
  open?: (ws: GoddoWebSocket) => MaybePromise<void>
  /** Called for each incoming message (already validated when `body` is set). */
  message?: (ws: GoddoWebSocket, message: unknown) => MaybePromise<void>
  /** Called when the connection is closed by either side. */
  close?: (ws: GoddoWebSocket, code: number, reason: string) => MaybePromise<void>
  /** Called on a WebSocket protocol error or a message-validation failure. */
  error?: (ws: GoddoWebSocket, error: Error) => MaybePromise<void>
}

// ─── GoddoWebSocket ───────────────────────────────────────────────────────────

/** Internal symbol used to identify WebSocket cleanup functions. */
export const WS_CLEANUP = Symbol('Goddo.ws_cleanup')

/**
 * Wrapper around the native `WebSocket` with Elysia-compatible pub/sub helpers.
 * Passed to every WebSocket lifecycle callback (`open`, `message`, `close`, `error`).
 *
 * @template Data Context snapshot captured at upgrade time (params, query, store, …).
 */
export class GoddoWebSocket<Data = unknown> {
  /** Unique connection identifier (UUID v4). */
  readonly id: string

  /** The underlying native WebSocket object. */
  readonly raw: WebSocket

  /**
   * Context data captured at upgrade time:
   * `params`, `query`, `headers`, `store`, `cookie`, etc.
   */
  readonly data: Data

  #topicMap: TopicMap
  #subscriptions = new Set<string>()

  /**
   * Initializes a new Goddo WebSocket.
   * @param raw The native WebSocket object.
   * @param data Context data captured during the upgrade.
   * @param topicMap The global TopicMap for pub/sub.
   */
  constructor(raw: WebSocket, data: Data, topicMap: TopicMap) {
    this.id = crypto.randomUUID()
    this.raw = raw
    this.data = data
    this.#topicMap = topicMap
  }

  // ── Sending ────────────────────────────────────────────────────────────────

  /**
   * Send data to this connection.
   * - Strings → sent as-is.
   * - Objects/arrays → serialized to JSON automatically.
   * - `ArrayBuffer` / typed arrays → sent as binary frames.
   *
   * No-op if the connection is not open.
   */
  send(data: string | object | ArrayBufferLike): this {
    if (this.raw.readyState !== WebSocket.OPEN) return this
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      this.raw.send(data as ArrayBufferLike)
    } else {
      this.raw.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
    return this
  }

  // ── Pub/Sub ────────────────────────────────────────────────────────────────

  /**
   * Subscribe this connection to a named topic.
   * Subsequent `ws.publish(topic, …)` calls will forward messages to this connection.
   */
  subscribe(topic: string): this {
    if (this.#subscriptions.has(topic)) return this
    this.#subscriptions.add(topic)

    let subscribers = this.#topicMap.get(topic)
    if (!subscribers) {
      subscribers = new Set()
      this.#topicMap.set(topic, subscribers)
    }
    subscribers.add(this as unknown as GoddoWebSocket)
    return this
  }

  /** Unsubscribe this connection from a named topic. */
  unsubscribe(topic: string): this {
    this.#topicMap.get(topic)?.delete(this as unknown as GoddoWebSocket)
    this.#subscriptions.delete(topic)
    return this
  }

  /**
   * Broadcast data to every connection subscribed to `topic`, **excluding the sender**.
   * Objects/arrays are serialized to JSON automatically.
   */
  publish(topic: string, data: unknown): this {
    const subscribers = this.#topicMap.get(topic)
    if (!subscribers) return this
    const msg = typeof data === 'string' ? data : JSON.stringify(data)
    for (const sub of subscribers) {
      if (sub !== this && sub.raw.readyState === WebSocket.OPEN) sub.raw.send(msg)
    }
    return this
  }

  /** Returns `true` if this connection is currently subscribed to `topic`. */
  isSubscribed(topic: string): boolean {
    return this.#subscriptions.has(topic)
  }

  // ── Closing ────────────────────────────────────────────────────────────────

  /** Gracefully close the connection with an optional close code and reason. */
  close(code?: number, reason?: string): void {
    this.raw.close(code, reason)
  }

  /** Force-close the connection with code `1000` (Normal Closure). */
  terminate(): void {
    this.raw.close(1000)
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  /** @internal Remove this connection from all subscribed topics (called on `socket.onclose`). */
  [WS_CLEANUP](): void {
    for (const topic of this.#subscriptions) {
      this.#topicMap.get(topic)?.delete(this as unknown as GoddoWebSocket)
    }
    this.#subscriptions.clear()
  }
}
