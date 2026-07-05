import type { TSchema } from '@goddo/schema'
import type { DocumentDetail } from '@goddo/types'

// ─── Topic Registry ───────────────────────────────────────────────────────────

/** One `Map<topic, Set<GoddoWebSocket>>` per Goddo instance. */
export type TopicMap = Map<string, Set<GoddoWebSocket>>

// ─── WSOptions ────────────────────────────────────────────────────────────────

type MaybePromise<T> = T | Promise<T>

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

  private readonly _topicMap: TopicMap
  private readonly _subscriptions = new Set<string>()

  constructor(raw: WebSocket, data: Data, topicMap: TopicMap) {
    this.id = crypto.randomUUID()
    this.raw = raw
    this.data = data
    this._topicMap = topicMap
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
    if (!this._topicMap.has(topic)) this._topicMap.set(topic, new Set())
    this._topicMap.get(topic)!.add(this)
    this._subscriptions.add(topic)
    return this
  }

  /** Unsubscribe this connection from a named topic. */
  unsubscribe(topic: string): this {
    this._topicMap.get(topic)?.delete(this)
    this._subscriptions.delete(topic)
    return this
  }

  /**
   * Broadcast data to every connection subscribed to `topic`, **excluding the sender**.
   * Objects/arrays are serialized to JSON automatically.
   */
  publish(topic: string, data: unknown): this {
    const subs = this._topicMap.get(topic)
    if (!subs) return this
    const msg = typeof data === 'string' ? data : JSON.stringify(data)
    for (const sub of subs) {
      if (sub !== this && sub.raw.readyState === WebSocket.OPEN) sub.raw.send(msg)
    }
    return this
  }

  /** Returns `true` if this connection is currently subscribed to `topic`. */
  isSubscribed(topic: string): boolean {
    return this._subscriptions.has(topic)
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
  _cleanup(): void {
    for (const topic of this._subscriptions) {
      this._topicMap.get(topic)?.delete(this)
    }
    this._subscriptions.clear()
  }
}
