/**
 * @module
 * Static file serving plugin for Goddo (equivalent to @elysiajs/static).
 *
 * Serves files from a local directory under a configurable URL prefix with
 * automatic MIME type detection, Range request support, `Cache-Control` headers,
 * `index.html` fallback for directory paths, and path traversal protection.
 */
import type { Goddo } from '@goddo/core'

/**
 * Options for the static file serving plugin.
 */
export interface StaticOptions {
  /**
   * Directory to serve files from.
   * @default 'public'
   */
  assets?: string
  /**
   * URL prefix for static assets.
   * @default '/public'
   */
  prefix?: string
  /**
   * Name of the index file served at directory roots.
   * @default 'index.html'
   */
  indexHTML?: string
  /**
   * Extra response headers applied to every static response.
   * @default {}
   */
  headers?: Record<string, string>
  /**
   * When `true`, disables browser caching by sending `Cache-Control: no-store`.
   * @default false
   */
  noCache?: boolean
  /**
   * Max-Age in seconds for `Cache-Control: public, max-age=<n>`.
   * Only used when `noCache` is false.
   * @default 86400 (1 day)
   */
  maxAge?: number
}

const MIME: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  ts: 'application/typescript',
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  zip: 'application/zip',
  wasm: 'application/wasm',
}

const getMimeType = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  return MIME[ext] ?? 'application/octet-stream'
}

/**
 * Static file serving plugin (equivalent to @elysiajs/static).
 *
 * ```ts
 * import { Goddo } from '@goddo/core'
 * import { staticPlugin } from '@goddo/static'
 *
 * new Goddo()
 *   .use(staticPlugin())
 *   .listen(3000)
 * // Serves files from ./public under /public/*
 * ```
 */
export const staticPlugin =
  (options: StaticOptions = {}): (app: Goddo) => Goddo => (app: Goddo): Goddo => {
    const assets = options.assets ?? 'public'
    const prefix = options.prefix ?? '/public'
    const indexHTML = options.indexHTML ?? 'index.html'
    const extraHeaders = options.headers ?? {}
    const noCache = options.noCache ?? false
    const maxAge = options.maxAge ?? 86400

    const cacheControl = noCache ? 'no-store' : `public, max-age=${maxAge}`

    const routePath = prefix.endsWith('/') ? `${prefix}*` : `${prefix}/*`

    return app.get(routePath, async ({ params, set, request }) => {
      const fileSubPath = (params['*'] ?? '').replace(/\.\./g, '') // prevent path traversal

      // Resolve to an index file if path ends with '/' or is empty
      const isDir = fileSubPath === '' || fileSubPath.endsWith('/')
      const relative = isDir ? `${fileSubPath}${indexHTML}` : fileSubPath
      const filePath = `${assets}/${relative}`

      let stat: Deno.FileInfo
      try {
        stat = await Deno.stat(filePath)
      } catch {
        set.status = 404
        return 'Not Found'
      }

      if (!stat.isFile) {
        // Try serving index.html inside the directory
        const indexPath = `${filePath}/${indexHTML}`
        try {
          const idxStat = await Deno.stat(indexPath)
          if (!idxStat.isFile) {
            set.status = 404
            return 'Not Found'
          }
          const idxFile = await Deno.open(indexPath, { read: true })
          const mimeType = getMimeType(indexPath)
          const headers = new Headers({
            'content-type': mimeType,
            'cache-control': cacheControl,
            ...extraHeaders,
          })
          return new Response(idxFile.readable, { headers })
        } catch {
          set.status = 404
          return 'Not Found'
        }
      }

      // Support Range requests for media files
      const rangeHeader = request.headers.get('range')
      const mimeType = getMimeType(filePath)

      if (rangeHeader && stat.size) {
        const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-')
        const start = Number(startStr)
        const end = endStr ? Number(endStr) : stat.size - 1
        const chunkSize = end - start + 1

        const file = await Deno.open(filePath, { read: true })
        await file.seek(start, Deno.SeekMode.Start)

        const headers = new Headers({
          'content-type': mimeType,
          'content-range': `bytes ${start}-${end}/${stat.size}`,
          'accept-ranges': 'bytes',
          'content-length': String(chunkSize),
          'cache-control': cacheControl,
          ...extraHeaders,
        })
        return new Response(file.readable, { status: 206, headers })
      }

      const file = await Deno.open(filePath, { read: true })
      const headers = new Headers({
        'content-type': mimeType,
        'content-length': String(stat.size),
        'cache-control': cacheControl,
        'accept-ranges': 'bytes',
        ...extraHeaders,
      })
      return new Response(file.readable, { headers })
    })
  }

export default staticPlugin
