import { createHash } from 'node:crypto'
import { anyApi } from 'convex/server'
import { putRagObject } from './rag-storage'

type ConvexAdminClientLike = {
  query: (fnRef: any, args?: Record<string, unknown>) => Promise<any>
  mutation: (fnRef: any, args?: Record<string, unknown>) => Promise<any>
}

type SourceRunStats = {
  discovered: number
  fetched: number
  new: number
  changed: number
  unchanged: number
  failed: number
  skipped: number
  transcriptAttempted: number
  transcriptSucceeded: number
  transcriptSucceededInnerTubeAndroid: number
  transcriptSucceededApi: number
  transcriptSucceededCaptionsXml: number
  transcriptSucceededWithTimestamps: number
  transcriptDescriptionFallback: number
}

type SourceRunError = {
  code: string
  message: string
  retryable?: boolean
  timestamp: number
}

type SourceRunResult = {
  status: 'succeeded' | 'partial' | 'failed'
  stats: SourceRunStats
  errors: SourceRunError[]
  lastError?: string
  sourceItemUpserts: Array<Record<string, unknown>>
}

type WebsiteSourceConfig = {
  seedUrls: string[]
  allowedDomains: string[]
  includePatterns: string[]
  excludePatterns: string[]
  maxDepth: number
  maxPagesPerRun: number
  renderMode: 'static' | 'rendered'
  requestHeadersRef?: string
  respectRobots: boolean
}

type YoutubeSourceConfig = {
  channelId: string
  channelUrl: string
  maxVideosPerRun: number
  includeShorts: boolean
  preferredLanguage?: string
}

type SourceRow = {
  _id: string
  type: 'website' | 'youtube_channel'
  tenantId: string
  tags?: string[]
  crawlConfig?: unknown
}

type BatchPlanItem = {
  sourceRun: {
    _id: string
    sourceId: string
    status: string
  }
  source: SourceRow | null
}

type ExistingSourceItem = {
  _id: string
  externalId: string
  canonicalUrl?: string
  title?: string
  publishedAt?: number
  normalizedHash?: string
  rawHash?: string
  r2ContentKey?: string
  r2MetaKey?: string
}

type CrawlPage = {
  canonicalUrl: string
  title: string
  contentText: string
  rawHtml: string
  fetchedAtMs: number
}

type CrawlPageOutcome =
  | { ok: true, page: CrawlPage, links: string[] }
  | { ok: false, code: string, message: string, retryable?: boolean }

type YoutubeFeedVideo = {
  videoId: string
  canonicalUrl: string
  title: string
  descriptionText?: string
  publishedAtMs?: number
}

type YoutubeCaptionTrack = {
  baseUrl: string
  languageCode?: string
  name?: string
  kind?: string
}

type YoutubeTranscriptLine = {
  startSec: number
  endSec: number
  durSec: number
  text: string
}

type YoutubeTranscriptSection = {
  startSec: number
  endSec: number
  text: string
}

type TranscriptProviderSegment = {
  text: string
  startSec: number
  endSec: number
}

type TranscriptFetchResult =
  | {
      ok: true
      provider: 'youtube_innertube_android' | 'youtube_transcript_api' | 'youtube_captions_xml'
      segments: TranscriptProviderSegment[]
      rawPayload: unknown
    }
  | {
      ok: false
      code: string
      message: string
      retryable?: boolean
      missingTranscript?: boolean
    }

type YoutubeVideoPageData = {
  videoId: string
  canonicalUrl: string
  title: string
  descriptionText?: string
  publishedAtMs?: number
  durationSec?: number
  isLive?: boolean
  captions: YoutubeCaptionTrack[]
}

function zeroStats(): SourceRunStats {
  return {
    discovered: 0,
    fetched: 0,
    new: 0,
    changed: 0,
    unchanged: 0,
    failed: 0,
    skipped: 0,
    transcriptAttempted: 0,
    transcriptSucceeded: 0,
    transcriptSucceededInnerTubeAndroid: 0,
    transcriptSucceededApi: 0,
    transcriptSucceededCaptionsXml: 0,
    transcriptSucceededWithTimestamps: 0,
    transcriptDescriptionFallback: 0,
  }
}

function toSafeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function sha256Hex(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function hashForItemId(canonicalUrl: string) {
  return `page_${sha256Hex(canonicalUrl).slice(0, 24)}`
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function stripHtmlToText(html: string) {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|ul|ol|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')

  text = normalizeWhitespace(text)
  return text
}

function extractTitle(html: string, fallbackUrl: string) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch?.[1] ? stripHtmlToText(titleMatch[1]) : ''
  return title || fallbackUrl
}

function globToRegExp(glob: string) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLE_STAR__/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`)
}

function matchesAnyGlob(value: string, patterns: string[]) {
  if (patterns.length === 0) {
    return false
  }

  for (const pattern of patterns) {
    try {
      if (globToRegExp(pattern).test(value)) {
        return true
      }
    }
    catch {
      continue
    }
  }

  return false
}

function stripTrackingParams(url: URL) {
  const toDelete: string[] = []
  for (const key of url.searchParams.keys()) {
    const lower = key.toLowerCase()
    if (
      lower.startsWith('utm_')
      || lower === 'gclid'
      || lower === 'fbclid'
      || lower === 'mc_cid'
      || lower === 'mc_eid'
    ) {
      toDelete.push(key)
    }
  }
  for (const key of toDelete) {
    url.searchParams.delete(key)
  }
}

function canonicalizeUrl(input: string, base?: string) {
  let url: URL
  try {
    url = new URL(input, base)
  }
  catch {
    return null
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return null
  }

  url.hash = ''
  url.hostname = url.hostname.toLowerCase()
  if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
    url.port = ''
  }
  stripTrackingParams(url)

  if (url.pathname !== '/') {
    url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '')
    if (!url.pathname.startsWith('/')) {
      url.pathname = `/${url.pathname}`
    }
  }

  if ([...url.searchParams.keys()].length > 0) {
    const entries = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
    url.search = ''
    for (const [k, v] of entries) {
      url.searchParams.append(k, v)
    }
  }

  return url.toString()
}

function isAllowedDomain(hostname: string, allowedDomains: string[]) {
  const host = hostname.toLowerCase()
  return allowedDomains.some((domain) => {
    const normalized = domain.toLowerCase()
    return host === normalized || host.endsWith(`.${normalized}`)
  })
}

function isUrlAllowedByPathRules(canonicalUrl: string, config: WebsiteSourceConfig) {
  const url = new URL(canonicalUrl)
  const matchTarget = `${url.pathname}${url.search}`

  if (config.excludePatterns.length && matchesAnyGlob(matchTarget, config.excludePatterns)) {
    return false
  }

  if (config.includePatterns.length && !matchesAnyGlob(matchTarget, config.includePatterns)) {
    return false
  }

  return true
}

function extractLinks(html: string, baseUrl: string) {
  const links: string[] = []
  const hrefRegex = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]+))/gi

  for (const match of html.matchAll(hrefRegex)) {
    const rawHref = match[1] || match[2] || match[3] || ''
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
      continue
    }

    const canonical = canonicalizeUrl(rawHref, baseUrl)
    if (canonical) {
      links.push(canonical)
    }
  }

  return [...new Set(links)]
}

async function fetchWithTimeout(url: string, timeoutMs: number, headers?: Record<string, string>) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: controller.signal,
    })
  }
  finally {
    clearTimeout(timer)
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return typeof error === 'string' && error.trim() ? error.trim() : 'Unknown error'
}

function logStructured(event: string, payload: Record<string, unknown>) {
  const entry = {
    event,
    ts: new Date().toISOString(),
    ...payload,
  }
  console.info(JSON.stringify(entry))
}

async function fetchAndExtractPage(url: string): Promise<CrawlPageOutcome> {
  try {
    const response = await fetchWithTimeout(url, 12_000, {
      'user-agent': 'cadet-rag-ingestor/0.1 (+static-fetch)',
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    })

    if (!response.ok) {
      return {
        ok: false,
        code: `http_${response.status}`,
        message: `HTTP ${response.status} for ${url}`,
        retryable: response.status === 429 || response.status >= 500,
      }
    }

    const contentType = toSafeString(response.headers.get('content-type')).toLowerCase()
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return {
        ok: false,
        code: 'unsupported_content_type',
        message: `Unsupported content type for ${url}: ${contentType}`,
        retryable: false,
      }
    }

    const rawHtml = await response.text()
    const canonicalUrl = canonicalizeUrl(response.url || url)
    if (!canonicalUrl) {
      return {
        ok: false,
        code: 'invalid_canonical_url',
        message: `Invalid canonical URL after fetch for ${url}`,
        retryable: false,
      }
    }

    const contentText = stripHtmlToText(rawHtml)
    if (!contentText) {
      return {
        ok: false,
        code: 'empty_extracted_content',
        message: `No readable text extracted for ${canonicalUrl}`,
        retryable: false,
      }
    }

    return {
      ok: true,
      page: {
        canonicalUrl,
        title: extractTitle(rawHtml, canonicalUrl),
        contentText,
        rawHtml,
        fetchedAtMs: Date.now(),
      },
      links: extractLinks(rawHtml, canonicalUrl),
    }
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false,
      code: isAbort ? 'fetch_timeout' : 'fetch_failed',
      message: toErrorMessage(error),
      retryable: isAbort,
    }
  }
}

function buildR2Keys(input: {
  tenantId: string
  sourceId: string
  sourceType: 'website' | 'youtube_channel'
  itemType: 'web_page' | 'youtube_video'
  itemId: string
}) {
  const base = `rag/${input.tenantId}/${input.sourceType}/${input.sourceId}/${input.itemType}/${input.itemId}`
  return {
    contentKey: `${base}/latest.md`,
    metaKey: `${base}/meta.json`,
  }
}

function buildMarkdownDocument(page: CrawlPage, metadata: Record<string, unknown>) {
  return [
    `# ${page.title}`,
    '',
    `Source URL: ${page.canonicalUrl}`,
    `Fetched At: ${new Date(page.fetchedAtMs).toISOString()}`,
    '',
    '## Content',
    '',
    page.contentText,
    '',
    '## Metadata',
    '',
    '```json',
    JSON.stringify(metadata, null, 2),
    '```',
    '',
  ].join('\n')
}

function normalizeWebsiteConfig(raw: unknown): WebsiteSourceConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const config = raw as Record<string, unknown>
  const seedUrls = Array.isArray(config.seedUrls) ? config.seedUrls.map(toSafeString).filter(Boolean) : []
  const allowedDomains = Array.isArray(config.allowedDomains)
    ? config.allowedDomains.map(value => toSafeString(value).toLowerCase()).filter(Boolean)
    : []
  const includePatterns = Array.isArray(config.includePatterns) ? config.includePatterns.map(toSafeString).filter(Boolean) : []
  const excludePatterns = Array.isArray(config.excludePatterns) ? config.excludePatterns.map(toSafeString).filter(Boolean) : []
  const maxDepth = Number.isFinite(config.maxDepth) ? Math.max(0, Math.min(10, Math.floor(Number(config.maxDepth)))) : 2
  const maxPagesPerRun = Number.isFinite(config.maxPagesPerRun) ? Math.max(1, Math.min(5000, Math.floor(Number(config.maxPagesPerRun)))) : 50
  const renderMode = config.renderMode === 'rendered' ? 'rendered' : 'static'
  const respectRobots = Boolean(config.respectRobots)
  const requestHeadersRef = toSafeString(config.requestHeadersRef) || undefined

  if (seedUrls.length === 0 || allowedDomains.length === 0) {
    return null
  }

  return {
    seedUrls,
    allowedDomains,
    includePatterns,
    excludePatterns,
    maxDepth,
    maxPagesPerRun,
    renderMode,
    requestHeadersRef,
    respectRobots,
  }
}

function normalizeYoutubeConfig(raw: unknown): YoutubeSourceConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const config = raw as Record<string, unknown>
  const channelId = toSafeString(config.channelId)
  const channelUrl = toSafeString(config.channelUrl)
  const maxVideosPerRun = Number.isFinite(config.maxVideosPerRun)
    ? Math.max(1, Math.min(200, Math.floor(Number(config.maxVideosPerRun))))
    : 25
  const includeShorts = Boolean(config.includeShorts)
  const preferredLanguage = toSafeString(config.preferredLanguage) || undefined

  if (!channelId || !channelUrl) {
    return null
  }

  return {
    channelId,
    channelUrl,
    maxVideosPerRun,
    includeShorts,
    preferredLanguage,
  }
}

function decodeHtmlEntities(value: string) {
  const decodeCodePoint = (input: number, fallback: string) => {
    if (!Number.isFinite(input) || input < 0 || input > 0x10FFFF) {
      return fallback
    }
    try {
      return String.fromCodePoint(input)
    }
    catch {
      return fallback
    }
  }

  return value
    .replace(/&#(\d+);/g, (match, code) => decodeCodePoint(Number(code), match))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => decodeCodePoint(Number.parseInt(hex, 16), match))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
  // unknown entities are left in place
}

function stripInlineTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ')
}

function parseXmlAttr(attrs: string, name: string) {
  const regex = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')
  const match = attrs.match(regex)
  return match?.[1] || match?.[2] || ''
}

function parseYoutubeFeedXml(xml: string): YoutubeFeedVideo[] {
  const items: YoutubeFeedVideo[] = []
  const entryRegex = /<entry\b[\s\S]*?<\/entry>/gi

  for (const entryXml of xml.match(entryRegex) ?? []) {
    const videoId = toSafeString(entryXml.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/i)?.[1])
    if (!videoId) {
      continue
    }

    const rawTitle = toSafeString(entryXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1])
    const title = normalizeWhitespace(decodeHtmlEntities(stripInlineTags(rawTitle))) || `YouTube video ${videoId}`
    const rawDescription = toSafeString(entryXml.match(/<media:description(?:\b[^>]*)?>([\s\S]*?)<\/media:description>/i)?.[1])
    const descriptionText = rawDescription
      ? normalizeWhitespace(decodeHtmlEntities(stripInlineTags(rawDescription)))
      : undefined

    const linkMatch = entryXml.match(/<link\b[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*\/?>/i)
    const canonicalUrl = canonicalizeUrl(linkMatch?.[1] || linkMatch?.[2] || `https://www.youtube.com/watch?v=${videoId}`)
      || `https://www.youtube.com/watch?v=${videoId}`

    const publishedRaw = toSafeString(entryXml.match(/<published>([\s\S]*?)<\/published>/i)?.[1])
    const publishedMs = publishedRaw ? Date.parse(publishedRaw) : Number.NaN

    items.push({
      videoId,
      canonicalUrl,
      title,
      descriptionText,
      publishedAtMs: Number.isFinite(publishedMs) ? publishedMs : undefined,
    })
  }

  items.sort((a, b) => (b.publishedAtMs ?? 0) - (a.publishedAtMs ?? 0))
  return items
}

function extractJsonObjectAfterMarker(input: string, marker: string) {
  const markerIndex = input.indexOf(marker)
  if (markerIndex < 0) {
    return null
  }

  const startIndex = input.indexOf('{', markerIndex)
  if (startIndex < 0) {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = startIndex; i < input.length; i++) {
    const char = input[i]!

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return input.slice(startIndex, i + 1)
      }
    }
  }

  return null
}

function parseYoutubePlayerResponseFromHtml(html: string) {
  const markers = [
    'var ytInitialPlayerResponse = ',
    'ytInitialPlayerResponse = ',
    'window["ytInitialPlayerResponse"] = ',
    'window[\'ytInitialPlayerResponse\'] = ',
  ]

  for (const marker of markers) {
    const json = extractJsonObjectAfterMarker(html, marker)
    if (!json) {
      continue
    }

    try {
      return JSON.parse(json) as Record<string, any>
    }
    catch {
      continue
    }
  }

  return null
}

function toFiniteNumber(value: unknown) {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : undefined
}

function extractYoutubeVideoPageData(html: string, input: {
  videoId: string
  fallbackCanonicalUrl: string
  fallbackTitle: string
  fallbackPublishedAtMs?: number
}): YoutubeVideoPageData | null {
  const playerResponse = parseYoutubePlayerResponseFromHtml(html)
  if (!playerResponse) {
    return null
  }

  const videoDetails = (playerResponse.videoDetails ?? {}) as Record<string, any>
  const microformat = (playerResponse.microformat?.playerMicroformatRenderer ?? {}) as Record<string, any>
  const captionsRenderer = (playerResponse.captions?.playerCaptionsTracklistRenderer ?? {}) as Record<string, any>
  const captionTracksRaw = Array.isArray(captionsRenderer.captionTracks) ? captionsRenderer.captionTracks : []

  const captions: YoutubeCaptionTrack[] = captionTracksRaw
    .map((track: any) => {
      const name = toSafeString(track?.name?.simpleText)
        || (Array.isArray(track?.name?.runs)
          ? track.name.runs.map((run: any) => toSafeString(run?.text)).filter(Boolean).join('')
          : '')
      const baseUrl = toSafeString(track?.baseUrl)
      if (!baseUrl) {
        return null
      }

      return {
        baseUrl,
        languageCode: toSafeString(track?.languageCode) || undefined,
        name: name || undefined,
        kind: toSafeString(track?.kind) || undefined,
      } satisfies YoutubeCaptionTrack
    })
    .filter(Boolean) as YoutubeCaptionTrack[]

  const publishedAtRaw = toSafeString(microformat.publishDate || microformat.uploadDate)
  const publishedAtMs = publishedAtRaw ? toFiniteNumber(Date.parse(publishedAtRaw)) : undefined
  const canonicalUrl = canonicalizeUrl(toSafeString(microformat.canonicalUrl) || input.fallbackCanonicalUrl)
    || input.fallbackCanonicalUrl

  const title = toSafeString(videoDetails.title) || toSafeString(microformat.title?.simpleText) || input.fallbackTitle
  const microformatDescription = (() => {
    const value = microformat.description
    if (typeof value === 'string') {
      return value
    }
    const simpleText = toSafeString((value as any)?.simpleText)
    if (simpleText) {
      return simpleText
    }
    if (Array.isArray((value as any)?.runs)) {
      return (value as any).runs
        .map((run: any) => toSafeString(run?.text))
        .filter(Boolean)
        .join('')
    }
    return ''
  })()
  const descriptionText = normalizeWhitespace(
    toSafeString(videoDetails.shortDescription)
      || toSafeString(microformat.shortDescription)
      || microformatDescription,
  ) || undefined

  return {
    videoId: input.videoId,
    canonicalUrl,
    title,
    descriptionText,
    publishedAtMs: publishedAtMs ?? input.fallbackPublishedAtMs,
    durationSec: toFiniteNumber(videoDetails.lengthSeconds),
    isLive: Boolean(videoDetails.isLiveContent),
    captions,
  }
}

function chooseYoutubeCaptionTrack(tracks: YoutubeCaptionTrack[], preferredLanguage?: string) {
  if (tracks.length === 0) {
    return null
  }

  const preferred = toSafeString(preferredLanguage).toLowerCase()
  const normalized = tracks.map(track => ({
    ...track,
    languageCode: toSafeString(track.languageCode).toLowerCase() || undefined,
    kind: toSafeString(track.kind).toLowerCase() || undefined,
  }))

  const score = (track: (typeof normalized)[number]) => {
    let value = 0
    const lang = track.languageCode || ''
    const isAsr = track.kind === 'asr'

    if (preferred) {
      if (lang === preferred) {
        value += 100
      }
      else if (lang.startsWith(`${preferred}-`) || preferred.startsWith(`${lang}-`)) {
        value += 80
      }
    }

    if (lang === 'en') {
      value += 20
    }
    else if (lang.startsWith('en-')) {
      value += 15
    }

    if (!isAsr) {
      value += 10
    }

    return value
  }

  const sorted = [...normalized].sort((a, b) => score(b) - score(a))
  return sorted[0] ?? null
}

function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function buildYoutubeVideoItemId(videoId: string) {
  return `vid_${videoId.replace(/[^a-zA-Z0-9_-]/g, '_')}`
}

function parseYoutubeTranscriptLines(xml: string): YoutubeTranscriptLine[] {
  const lines: YoutubeTranscriptLine[] = []
  const textRegex = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi

  for (const match of xml.matchAll(textRegex)) {
    const attrs = match[1] || ''
    const rawText = match[2] || ''
    const text = normalizeWhitespace(decodeHtmlEntities(stripInlineTags(rawText)))
    if (!text) {
      continue
    }

    const startSec = Number(parseXmlAttr(attrs, 'start'))
    const durSec = Number(parseXmlAttr(attrs, 'dur') || '0')
    if (!Number.isFinite(startSec) || startSec < 0) {
      continue
    }

    const normalizedDur = Number.isFinite(durSec) && durSec >= 0 ? durSec : 0
    lines.push({
      startSec,
      durSec: normalizedDur,
      endSec: startSec + normalizedDur,
      text,
    })
  }

  // YouTube srv3 captions use <p t="ms" d="ms"> with optional nested <s> nodes.
  const paragraphRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi
  for (const match of xml.matchAll(paragraphRegex)) {
    const attrs = match[1] || ''
    const rawInner = match[2] || ''

    const joinedSpeech = [...rawInner.matchAll(/<s\b[^>]*>([\s\S]*?)<\/s>/gi)]
      .map(sMatch => normalizeWhitespace(decodeHtmlEntities(stripInlineTags(sMatch[1] || ''))))
      .filter(Boolean)
      .join(' ')

    const fallbackText = normalizeWhitespace(decodeHtmlEntities(stripInlineTags(rawInner)))
    const text = joinedSpeech || fallbackText
    if (!text) {
      continue
    }

    const startMs = Number(parseXmlAttr(attrs, 't'))
    const durMs = Number(parseXmlAttr(attrs, 'd') || '0')
    if (!Number.isFinite(startMs) || startMs < 0) {
      continue
    }

    const startSec = startMs / 1000
    const normalizedDurSec = Number.isFinite(durMs) && durMs >= 0 ? durMs / 1000 : 0
    lines.push({
      startSec,
      durSec: normalizedDurSec,
      endSec: startSec + normalizedDurSec,
      text,
    })
  }

  lines.sort((a, b) => a.startSec - b.startSec)
  const deduped: YoutubeTranscriptLine[] = []
  for (const line of lines) {
    const prev = deduped[deduped.length - 1]
    if (
      prev
      && Math.abs(prev.startSec - line.startSec) < 0.001
      && Math.abs(prev.durSec - line.durSec) < 0.001
      && prev.text === line.text
    ) {
      continue
    }
    deduped.push(line)
  }

  return deduped
}

function parseYoutubeTranscriptJson3(payload: any): YoutubeTranscriptLine[] {
  const events = Array.isArray(payload?.events) ? payload.events : []
  const lines: YoutubeTranscriptLine[] = []

  for (const event of events) {
    const segs = Array.isArray(event?.segs) ? event.segs : []
    if (segs.length === 0) {
      continue
    }

    const text = normalizeWhitespace(
      segs
        .map((seg: any) => decodeHtmlEntities(toSafeString(seg?.utf8)))
        .filter(Boolean)
        .join(' '),
    )
    if (!text) {
      continue
    }

    const startMs = Number(event?.tStartMs)
    const durMs = Number(event?.dDurationMs ?? 0)
    if (!Number.isFinite(startMs) || startMs < 0) {
      continue
    }

    const startSec = startMs / 1000
    const normalizedDurSec = Number.isFinite(durMs) && durMs >= 0 ? durMs / 1000 : 0
    lines.push({
      startSec,
      durSec: normalizedDurSec,
      endSec: startSec + normalizedDurSec,
      text,
    })
  }

  lines.sort((a, b) => a.startSec - b.startSec)
  const deduped: YoutubeTranscriptLine[] = []
  for (const line of lines) {
    const prev = deduped[deduped.length - 1]
    if (
      prev
      && Math.abs(prev.startSec - line.startSec) < 0.001
      && Math.abs(prev.durSec - line.durSec) < 0.001
      && prev.text === line.text
    ) {
      continue
    }
    deduped.push(line)
  }

  return deduped
}

function buildYoutubeTranscriptSections(lines: YoutubeTranscriptLine[]): YoutubeTranscriptSection[] {
  if (lines.length === 0) {
    return []
  }

  const sections: YoutubeTranscriptSection[] = []
  const maxChars = 900
  const maxSpanSec = 120
  const maxGapSec = 12

  let current: YoutubeTranscriptSection | null = null
  for (const line of lines) {
    const lineEnd = line.endSec > line.startSec ? line.endSec : line.startSec

    if (!current) {
      current = {
        startSec: line.startSec,
        endSec: lineEnd,
        text: line.text,
      }
      continue
    }

    const nextText = `${current.text} ${line.text}`.trim()
    const gap = line.startSec - current.endSec
    const span = Math.max(current.endSec, lineEnd) - current.startSec
    const shouldSplit = nextText.length > maxChars || gap > maxGapSec || span > maxSpanSec

    if (shouldSplit) {
      current.text = normalizeWhitespace(current.text)
      if (current.text) {
        sections.push(current)
      }
      current = {
        startSec: line.startSec,
        endSec: lineEnd,
        text: line.text,
      }
      continue
    }

    current.endSec = Math.max(current.endSec, lineEnd)
    current.text = nextText
  }

  if (current) {
    current.text = normalizeWhitespace(current.text)
    if (current.text) {
      sections.push(current)
    }
  }

  return sections
}

function buildYoutubeMarkdownDocument(input: {
  title: string
  canonicalUrl: string
  publishedAtIso?: string
  fetchedAtIso: string
  contentSource: 'transcript' | 'description'
  transcriptSections?: YoutubeTranscriptSection[]
  descriptionText?: string
  metadata: Record<string, unknown>
}) {
  const transcriptBody = (input.transcriptSections ?? [])
    .map(section => `[${formatTimestamp(section.startSec)} - ${formatTimestamp(section.endSec)}] ${section.text}`)
    .join('\n\n')
  const descriptionBody = normalizeWhitespace(toSafeString(input.descriptionText))
  const contentHeading = input.contentSource === 'transcript' ? 'Transcript' : 'Description'
  const contentBody = input.contentSource === 'transcript' ? transcriptBody : descriptionBody

  const headerLines = [
    `# ${input.title}`,
    '',
    `Source URL: ${input.canonicalUrl}`,
  ]

  if (input.publishedAtIso) {
    headerLines.push(`Published At: ${input.publishedAtIso}`)
  }
  headerLines.push(`Fetched At: ${input.fetchedAtIso}`)

  return [
    ...headerLines,
    '',
    `## ${contentHeading}`,
    '',
    contentBody,
    '',
    '## Metadata',
    '',
    '```json',
    JSON.stringify(input.metadata, null, 2),
    '```',
    '',
  ].join('\n')
}

async function fetchYoutubeChannelFeed(channelId: string) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`

  try {
    const response = await fetchWithTimeout(feedUrl, 12_000, {
      'user-agent': 'cadet-rag-ingestor/0.1 (+youtube-feed)',
      accept: 'application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.5',
    })

    if (!response.ok) {
      return {
        ok: false as const,
        code: `youtube_feed_http_${response.status}`,
        message: `YouTube channel feed returned HTTP ${response.status} for ${channelId}`,
        retryable: response.status === 429 || response.status >= 500,
      }
    }

    const xml = await response.text()
    const videos = parseYoutubeFeedXml(xml)
    return {
      ok: true as const,
      xml,
      videos,
    }
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false as const,
      code: isAbort ? 'youtube_feed_timeout' : 'youtube_feed_fetch_failed',
      message: toErrorMessage(error),
      retryable: isAbort,
    }
  }
}

function getYoutubeDataApiKey() {
  return toSafeString(process.env.NUXT_YOUTUBE_DATA_API_KEY)
    || toSafeString(process.env.YOUTUBE_DATA_API_KEY)
    || ''
}

async function fetchYoutubeVideosViaDataApi(channelId: string, maxVideos: number, apiKey: string) {
  const videos: YoutubeFeedVideo[] = []
  let pageToken = ''

  try {
    while (videos.length < maxVideos) {
      const batchSize = Math.max(1, Math.min(50, maxVideos - videos.length))
      const url = new URL('https://www.googleapis.com/youtube/v3/search')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('channelId', channelId)
      url.searchParams.set('order', 'date')
      url.searchParams.set('type', 'video')
      url.searchParams.set('maxResults', String(batchSize))
      url.searchParams.set('key', apiKey)
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken)
      }

      const response = await fetchWithTimeout(url.toString(), 12_000, {
        'user-agent': 'cadet-rag-ingestor/0.1 (+youtube-data-api)',
        accept: 'application/json',
      })

      if (!response.ok) {
        const raw = await response.text().catch(() => '')
        return {
          ok: false as const,
          code: `youtube_api_http_${response.status}`,
          message: `YouTube Data API returned HTTP ${response.status} for channel ${channelId}${raw ? `: ${raw.slice(0, 300)}` : ''}`,
          retryable: response.status === 429 || response.status >= 500,
        }
      }

      const payload = await response.json().catch(() => null) as any
      const items = Array.isArray(payload?.items) ? payload.items : []

      for (const item of items) {
        const videoId = toSafeString(item?.id?.videoId)
        if (!videoId) {
          continue
        }

        const title = normalizeWhitespace(toSafeString(item?.snippet?.title)) || `YouTube video ${videoId}`
        const publishedRaw = toSafeString(item?.snippet?.publishedAt)
        const publishedMs = publishedRaw ? Date.parse(publishedRaw) : Number.NaN
        const canonicalUrl = canonicalizeUrl(`https://www.youtube.com/watch?v=${videoId}`)
          || `https://www.youtube.com/watch?v=${videoId}`

        videos.push({
          videoId,
          canonicalUrl,
          title,
          descriptionText: normalizeWhitespace(toSafeString(item?.snippet?.description)) || undefined,
          publishedAtMs: Number.isFinite(publishedMs) ? publishedMs : undefined,
        })

        if (videos.length >= maxVideos) {
          break
        }
      }

      pageToken = toSafeString(payload?.nextPageToken)
      if (!pageToken) {
        break
      }
    }

    return {
      ok: true as const,
      videos,
    }
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false as const,
      code: isAbort ? 'youtube_api_timeout' : 'youtube_api_fetch_failed',
      message: `YouTube Data API request failed for channel ${channelId}: ${toErrorMessage(error)}`,
      retryable: isAbort,
    }
  }
}

function extractYoutubeChannelIdFromText(value: string) {
  const match = value.match(/\bUC[a-zA-Z0-9_-]{20,}\b/)
  return match?.[0]
}

function extractYoutubeChannelIdFromChannelUrl(channelUrl: string) {
  const trimmed = toSafeString(channelUrl)
  if (!trimmed) {
    return null
  }

  try {
    const url = new URL(trimmed)
    if (!/youtube\.com$/i.test(url.hostname) && !/youtube\.com$/i.test(url.hostname.replace(/^www\./i, ''))) {
      return null
    }

    const parts = url.pathname.split('/').filter(Boolean)
    if (parts[0] === 'channel' && parts[1]) {
      const fromPath = extractYoutubeChannelIdFromText(parts[1])
      if (fromPath) {
        return fromPath
      }
    }
  }
  catch {
    return null
  }

  return null
}

function extractYoutubeChannelIdFromChannelPageHtml(html: string) {
  const patterns = [
    /<meta[^>]+itemprop=["']channelId["'][^>]+content=["'](UC[a-zA-Z0-9_-]{20,})["']/i,
    /"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]{20,})"/i,
    /"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]{20,})"/i,
    /"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]{20,})"/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return extractYoutubeChannelIdFromText(html)
}

async function resolveYoutubeChannelIdFromChannelUrl(channelUrl: string) {
  const direct = extractYoutubeChannelIdFromChannelUrl(channelUrl)
  if (direct) {
    return {
      ok: true as const,
      channelId: direct,
      resolution: 'url_path',
    }
  }

  const url = toSafeString(channelUrl)
  if (!url) {
    return {
      ok: false as const,
      code: 'youtube_channel_url_missing',
      message: 'youtube_channel source is missing channelUrl for fallback channel ID resolution',
      retryable: false,
    }
  }

  try {
    const response = await fetchWithTimeout(url, 12_000, {
      'user-agent': 'cadet-rag-ingestor/0.1 (+youtube-channel-resolver)',
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    })

    if (!response.ok) {
      return {
        ok: false as const,
        code: `youtube_channel_url_http_${response.status}`,
        message: `YouTube channel URL returned HTTP ${response.status} while resolving channelId: ${url}`,
        retryable: response.status === 429 || response.status >= 500,
      }
    }

    const html = await response.text()
    const resolved = extractYoutubeChannelIdFromChannelPageHtml(html)
    if (!resolved) {
      return {
        ok: false as const,
        code: 'youtube_channel_id_resolve_failed',
        message: `Could not resolve channelId from channelUrl: ${url}`,
        retryable: false,
      }
    }

    return {
      ok: true as const,
      channelId: resolved,
      resolution: 'channel_page_html',
    }
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false as const,
      code: isAbort ? 'youtube_channel_url_timeout' : 'youtube_channel_url_fetch_failed',
      message: `Failed to resolve channelId from channelUrl ${url}: ${toErrorMessage(error)}`,
      retryable: isAbort,
    }
  }
}

async function fetchYoutubeChannelFeedWithFallback(config: YoutubeSourceConfig) {
  const youtubeApiKey = getYoutubeDataApiKey()

  async function tryYoutubeApiDiscovery(channelId: string, contextMessage: string) {
    if (!youtubeApiKey) {
      return null
    }

    const apiResult = await fetchYoutubeVideosViaDataApi(channelId, config.maxVideosPerRun, youtubeApiKey)
    if (!apiResult.ok) {
      return {
        ok: false as const,
        code: apiResult.code,
        message: `${contextMessage}. YouTube Data API fallback also failed: ${apiResult.message}`,
        retryable: apiResult.retryable,
      }
    }

    return {
      ok: true as const,
      videos: apiResult.videos,
      resolvedChannelId: channelId,
      usedFallback: channelId !== config.channelId,
      via: 'youtube_data_api' as const,
    }
  }

  const primary = await fetchYoutubeChannelFeed(config.channelId)
  if (primary.ok) {
    return {
      ...primary,
      resolvedChannelId: config.channelId,
      usedFallback: false as const,
    }
  }

  const shouldTryChannelUrlFallback = primary.code === 'youtube_feed_http_404'
    || (/^youtube_feed_http_5\d\d$/.test(primary.code) && primary.retryable === true)

  if (!shouldTryChannelUrlFallback) {
    const apiFromConfigured = extractYoutubeChannelIdFromText(config.channelId)
      ? await tryYoutubeApiDiscovery(config.channelId, primary.message)
      : null
    return apiFromConfigured ?? primary
  }

  const resolved = await resolveYoutubeChannelIdFromChannelUrl(config.channelUrl)
  if (!resolved.ok) {
    const apiFromConfigured = extractYoutubeChannelIdFromText(config.channelId)
      ? await tryYoutubeApiDiscovery(
          config.channelId,
          `${primary.message}. Fallback channelId resolution from channelUrl also failed: ${resolved.message}`,
        )
      : null

    if (apiFromConfigured) {
      return apiFromConfigured
    }

    return {
      ok: false as const,
      code: primary.code,
      message: `${primary.message}. Fallback channelId resolution from channelUrl also failed: ${resolved.message}`,
      retryable: primary.retryable || resolved.retryable,
    }
  }

  if (resolved.channelId === config.channelId) {
    const apiFromConfigured = await tryYoutubeApiDiscovery(config.channelId, primary.message)
    return apiFromConfigured ?? primary
  }

  const retry = await fetchYoutubeChannelFeed(resolved.channelId)
  if (!retry.ok) {
    const apiFromResolved = await tryYoutubeApiDiscovery(
      resolved.channelId,
      `${primary.message}. Resolved channelId "${resolved.channelId}" via ${resolved.resolution}, but retry failed: ${retry.message}`,
    )

    if (apiFromResolved) {
      return {
        ...apiFromResolved,
        resolution: resolved.resolution,
      }
    }

    return {
      ok: false as const,
      code: retry.code,
      message: `${primary.message}. Resolved channelId "${resolved.channelId}" via ${resolved.resolution}, but retry failed: ${retry.message}`,
      retryable: retry.retryable,
    }
  }

  return {
    ...retry,
    resolvedChannelId: resolved.channelId,
    usedFallback: true as const,
    resolution: resolved.resolution,
  }
}

async function fetchYoutubeWatchPageData(video: YoutubeFeedVideo, preferredLanguage?: string) {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}${preferredLanguage ? `&hl=${encodeURIComponent(preferredLanguage)}` : ''}`

  try {
    const response = await fetchWithTimeout(watchUrl, 15_000, {
      'user-agent': 'cadet-rag-ingestor/0.1 (+youtube-watch)',
      accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
      'accept-language': preferredLanguage ? `${preferredLanguage},en;q=0.8` : 'en-US,en;q=0.8',
    })

    if (!response.ok) {
      return {
        ok: false as const,
        code: `youtube_watch_http_${response.status}`,
        message: `YouTube watch page returned HTTP ${response.status} for video ${video.videoId}`,
        retryable: response.status === 429 || response.status >= 500,
      }
    }

    const html = await response.text()
    const parsed = extractYoutubeVideoPageData(html, {
      videoId: video.videoId,
      fallbackCanonicalUrl: video.canonicalUrl,
      fallbackTitle: video.title,
      fallbackPublishedAtMs: video.publishedAtMs,
    })

    if (!parsed) {
      return {
        ok: false as const,
        code: 'youtube_watch_parse_failed',
        message: `Could not parse ytInitialPlayerResponse for video ${video.videoId}`,
        retryable: false,
      }
    }

    return {
      ok: true as const,
      html,
      video: parsed,
      fetchedAtMs: Date.now(),
    }
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false as const,
      code: isAbort ? 'youtube_watch_timeout' : 'youtube_watch_fetch_failed',
      message: toErrorMessage(error),
      retryable: isAbort,
    }
  }
}

function getYoutubeTranscriptApiBaseUrl() {
  return toSafeString(process.env.YOUTUBE_TRANSCRIPT_API_BASE_URL)
    || 'https://youtube-transcript-api-tau-one.vercel.app'
}

function getYoutubeInnerTubeAndroidApiKey() {
  return toSafeString(process.env.YOUTUBE_INNERTUBE_ANDROID_KEY)
    || 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'
}

function getYoutubeInnerTubeAndroidClientVersion() {
  return toSafeString(process.env.YOUTUBE_INNERTUBE_ANDROID_CLIENT_VERSION)
    || '19.44.38'
}

function getYoutubeInnerTubeAndroidUserAgent() {
  const clientVersion = getYoutubeInnerTubeAndroidClientVersion()
  return toSafeString(process.env.YOUTUBE_INNERTUBE_ANDROID_USER_AGENT)
    || `com.google.android.youtube/${clientVersion} (Linux; U; Android 14; en_US; Pixel 8 Build/UP1A.231005.007) gzip`
}

function extractYoutubeTextFromRenderer(value: any) {
  if (typeof value === 'string') {
    return value
  }

  const simpleText = toSafeString(value?.simpleText)
  if (simpleText) {
    return simpleText
  }

  if (Array.isArray(value?.runs)) {
    return value.runs
      .map((run: any) => toSafeString(run?.text))
      .filter(Boolean)
      .join('')
  }

  return ''
}

function extractYoutubeCaptionTracksFromInnerTubePlayer(payload: any) {
  const tracklist = payload?.captions?.playerCaptionsTracklistRenderer
  const captionTracksRaw = Array.isArray(tracklist?.captionTracks) ? tracklist.captionTracks : []

  return captionTracksRaw
    .map((track: any) => {
      const baseUrl = toSafeString(track?.baseUrl)
      if (!baseUrl) {
        return null
      }

      const name = normalizeWhitespace(extractYoutubeTextFromRenderer(track?.name))
      return {
        baseUrl,
        languageCode: toSafeString(track?.languageCode) || undefined,
        name: name || undefined,
        kind: toSafeString(track?.kind) || undefined,
      } satisfies YoutubeCaptionTrack
    })
    .filter(Boolean) as YoutubeCaptionTrack[]
}

async function fetchYoutubeInnerTubeAndroidPlayer(videoId: string, preferredLanguage?: string) {
  const apiKey = getYoutubeInnerTubeAndroidApiKey()
  const clientVersion = getYoutubeInnerTubeAndroidClientVersion()
  const userAgent = getYoutubeInnerTubeAndroidUserAgent()
  const language = toSafeString(preferredLanguage) || 'en'
  const gl = 'US'

  if (!apiKey) {
    return {
      ok: false as const,
      code: 'youtube_innertube_config_missing',
      message: 'InnerTube Android API key is missing',
      retryable: false,
    }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    let response: Response
    try {
      const url = `https://www.youtube.com/youtubei/v1/player?prettyPrint=false&key=${encodeURIComponent(apiKey)}`
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'user-agent': userAgent,
          'x-youtube-client-name': '3',
          'x-youtube-client-version': clientVersion,
          'accept-language': preferredLanguage ? `${preferredLanguage},en;q=0.8` : 'en-US,en;q=0.8',
          origin: 'https://www.youtube.com',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion,
              androidSdkVersion: 34,
              hl: language,
              gl,
              osName: 'Android',
              osVersion: '14',
              platform: 'MOBILE',
            },
          },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
        signal: controller.signal,
      })
    }
    finally {
      clearTimeout(timer)
    }

    if (!response.ok) {
      const raw = await response.text().catch(() => '')
      return {
        ok: false as const,
        code: `youtube_innertube_http_${response.status}`,
        message: `InnerTube player returned HTTP ${response.status} for video ${videoId}${raw ? `: ${raw.slice(0, 300)}` : ''}`,
        retryable: response.status === 429 || response.status >= 500,
      }
    }

    const contentType = toSafeString(response.headers.get('content-type')).toLowerCase()
    const text = await response.text()
    if (contentType.includes('text/html')) {
      return {
        ok: false as const,
        code: 'youtube_innertube_non_json',
        message: `InnerTube player returned HTML instead of JSON for video ${videoId}`,
        retryable: true,
      }
    }

    const payload = JSON.parse(text) as any
    const playabilityStatus = toSafeString(payload?.playabilityStatus?.status)
    if (playabilityStatus && !['OK', 'LIVE_STREAM_OFFLINE'].includes(playabilityStatus)) {
      return {
        ok: false as const,
        code: 'youtube_innertube_unplayable',
        message: `InnerTube playability status for video ${videoId}: ${playabilityStatus}`,
        retryable: false,
      }
    }

    return {
      ok: true as const,
      payload,
    }
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false as const,
      code: isAbort ? 'youtube_innertube_timeout' : 'youtube_innertube_fetch_failed',
      message: `InnerTube player request failed for video ${videoId}: ${toErrorMessage(error)}`,
      retryable: isAbort,
    }
  }
}

function setYoutubeCaptionFormat(baseUrl: string, format: 'json3' | 'srv3') {
  const url = toSafeString(baseUrl)
  if (!url) {
    return ''
  }

  if (/[?&]fmt=/.test(url)) {
    return url.replace(/([?&]fmt=)[^&]*/i, `$1${format}`)
  }

  return `${url}${url.includes('?') ? '&' : '?'}fmt=${format}`
}

async function fetchYoutubeTranscriptJson3(track: YoutubeCaptionTrack) {
  const rawUrl = toSafeString(track.baseUrl)
  if (!rawUrl) {
    return {
      ok: false as const,
      code: 'youtube_captions_track_invalid',
      message: 'Caption track URL is missing',
      retryable: false,
    }
  }

  const url = setYoutubeCaptionFormat(rawUrl, 'json3')
  try {
    const response = await fetchWithTimeout(url, 15_000, {
      'user-agent': 'cadet-rag-ingestor/0.1 (+youtube-captions-json3)',
      accept: 'application/json,text/json;q=0.9,*/*;q=0.5',
    })

    if (!response.ok) {
      return {
        ok: false as const,
        code: `youtube_innertube_caption_http_${response.status}`,
        message: `Transcript JSON3 request returned HTTP ${response.status}`,
        retryable: response.status === 429 || response.status >= 500,
      }
    }

    const contentType = toSafeString(response.headers.get('content-type')).toLowerCase()
    const text = await response.text()
    if (contentType.includes('text/html')) {
      return {
        ok: false as const,
        code: 'youtube_innertube_caption_non_json',
        message: 'Transcript JSON3 request returned HTML instead of JSON',
        retryable: true,
      }
    }

    try {
      return {
        ok: true as const,
        payload: JSON.parse(text) as any,
      }
    }
    catch {
      return {
        ok: false as const,
        code: 'youtube_innertube_json3_parse_failed',
        message: 'Failed to parse transcript JSON3 response',
        retryable: true,
      }
    }
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false as const,
      code: isAbort ? 'youtube_innertube_caption_timeout' : 'youtube_innertube_caption_fetch_failed',
      message: `Transcript JSON3 request failed: ${toErrorMessage(error)}`,
      retryable: isAbort,
    }
  }
}

async function fetchYoutubeInnerTubeAndroidSegments(videoId: string, preferredLanguage?: string): Promise<TranscriptFetchResult> {
  const player = await fetchYoutubeInnerTubeAndroidPlayer(videoId, preferredLanguage)
  if (!player.ok) {
    return player
  }

  const captionTracks = extractYoutubeCaptionTracksFromInnerTubePlayer(player.payload)
  const track = chooseYoutubeCaptionTrack(captionTracks, preferredLanguage)
  if (!track) {
    return {
      ok: false as const,
      code: 'youtube_no_caption_tracks',
      message: `No caption tracks available via InnerTube for video ${videoId}`,
      retryable: false,
    }
  }

  const transcriptJson3 = await fetchYoutubeTranscriptJson3(track)
  if (!transcriptJson3.ok) {
    return transcriptJson3
  }

  const transcriptLines = parseYoutubeTranscriptJson3(transcriptJson3.payload)
  if (transcriptLines.length === 0) {
    return {
      ok: false as const,
      code: 'youtube_empty_transcript',
      message: `InnerTube JSON3 transcript was empty for video ${videoId}`,
      retryable: false,
    }
  }

  return {
    ok: true as const,
    provider: 'youtube_innertube_android',
    segments: transcriptLines.map(line => ({
      text: line.text,
      startSec: line.startSec,
      endSec: line.endSec,
    })),
    rawPayload: {
      provider: 'youtube_innertube_android',
      playerPlayabilityStatus: toSafeString(player.payload?.playabilityStatus?.status) || null,
      captionTrackCount: captionTracks.length,
      selectedTrack: {
        languageCode: track.languageCode ?? null,
        kind: track.kind ?? null,
        name: track.name ?? null,
      },
      json3EventsCount: Array.isArray(transcriptJson3.payload?.events) ? transcriptJson3.payload.events.length : 0,
      json3Sha256: sha256Hex(JSON.stringify(transcriptJson3.payload)),
    },
  }
}

function isYoutubeTranscriptApiFieldValidationError(payload: any, fieldName: string) {
  if (!Array.isArray(payload?.detail)) {
    return false
  }

  return payload.detail.some((issue: any) => {
    const loc = Array.isArray(issue?.loc) ? issue.loc.map((part: unknown) => String(part)) : []
    return issue?.type === 'missing'
      && loc.length >= 2
      && loc[0] === 'body'
      && loc[1] === fieldName
  })
}

function looksLikeMalformedTranscriptApiText(text: string) {
  const value = toSafeString(text)
  if (!value) {
    return false
  }

  // Observed hosted-demo failure mode: transport/debug payload serialized as transcript text.
  if (/^\d+:\{[\s\S]*\}\s+\d+:null$/i.test(value)) {
    return true
  }

  return value.includes('"$@1"') && /\b\d+:null\b/.test(value)
}

async function fetchYoutubeTranscriptApiSegments(videoId: string): Promise<TranscriptFetchResult> {
  const apiBaseUrl = getYoutubeTranscriptApiBaseUrl().replace(/\/+$/, '')
  const usesHostedRateLimitedApi = /youtube-transcript-api-tau-one\.vercel\.app$/i.test(apiBaseUrl)
  const jitterMs = usesHostedRateLimitedApi
    ? Math.floor(Math.random() * 2_000) + 11_000
    : Math.floor(Math.random() * 1_500) + 500
  await sleep(jitterMs)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    let response: Response
    let validationPayload: any = null
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    try {
      response = await fetch(`${apiBaseUrl}/transcript`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ url: videoUrl }),
        signal: controller.signal,
      })

      if (response.status === 422) {
        validationPayload = await response.clone().json().catch(() => null)
        // Backward compatibility for older self-hosted versions that expected `video_url`.
        if (isYoutubeTranscriptApiFieldValidationError(validationPayload, 'video_url')) {
          response = await fetch(`${apiBaseUrl}/transcript`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({ video_url: videoUrl }),
            signal: controller.signal,
          })
          validationPayload = null
        }
      }
    }
    finally {
      clearTimeout(timer)
    }

    if (!response.ok) {
      const payload = (validationPayload ?? await response.json().catch(() => null)) as any
      const detail = toSafeString(payload?.detail)

      if (response.status === 403 || response.status === 404) {
        return {
          ok: false as const,
          code: 'youtube_missing_transcript',
          message: detail || `YouTube Transcript API returned HTTP ${response.status} for video ${videoId} (likely no subtitles available)`,
          retryable: false,
          missingTranscript: true,
        }
      }

      return {
        ok: false as const,
        code: `youtube_transcript_api_http_${response.status}`,
        message: detail || `YouTube Transcript API returned HTTP ${response.status} for video ${videoId}`,
        retryable: response.status === 429 || response.status >= 500,
      }
    }

    const payload = await response.json().catch(() => null) as any
    const transcriptText = normalizeWhitespace(toSafeString(payload?.transcript))
    const transcriptRows = Array.isArray(payload?.segments)
      ? payload.segments
      : (Array.isArray(payload?.transcript_segments) ? payload.transcript_segments : [])

    if (looksLikeMalformedTranscriptApiText(transcriptText)) {
      return {
        ok: false as const,
        code: 'youtube_transcript_api_malformed_payload',
        message: `YouTube Transcript API returned malformed transcript payload for video ${videoId}`,
        retryable: true,
      }
    }

    if (!transcriptText && transcriptRows.length === 0) {
      return {
        ok: false as const,
        code: 'youtube_missing_transcript',
        message: `YouTube Transcript API returned no transcript for video ${videoId}`,
        retryable: false,
        missingTranscript: true,
      }
    }

    const segments: TranscriptProviderSegment[] = []
    for (const row of transcriptRows) {
      const text = normalizeWhitespace(
        toSafeString(row?.text)
        || toSafeString(row?.t)
        || toSafeString(row?.snippet),
      )
      const startSec = Number(
        row?.startSec ?? row?.start ?? row?.s ?? row?.offset ?? row?.from,
      )
      const durSec = Number(row?.durSec ?? row?.dur ?? row?.duration ?? row?.d)
      const endSec = Number(row?.endSec ?? row?.end ?? row?.e)
      if (!text || !Number.isFinite(startSec) || startSec < 0) {
        continue
      }

      const normalizedEndSec = Number.isFinite(endSec) && endSec > startSec
        ? endSec
        : (Number.isFinite(durSec) && durSec > 0 ? startSec + durSec : startSec)

      segments.push({ text, startSec, endSec: normalizedEndSec })
    }

    if (segments.length === 0 && transcriptText) {
      // Hosted API returns a flattened transcript string without timestamps.
      segments.push({
        text: transcriptText,
        startSec: 0,
        endSec: 0,
      })
    }

    if (segments.length === 0) {
      return {
        ok: false as const,
        code: 'youtube_empty_transcript',
        message: `YouTube Transcript API transcript payload was empty/invalid for video ${videoId}`,
        retryable: false,
      }
    }

    return {
      ok: true as const,
      provider: 'youtube_transcript_api' as const,
      segments,
      rawPayload: payload,
    }
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false as const,
      code: isAbort ? 'youtube_transcript_api_timeout' : 'youtube_transcript_api_fetch_failed',
      message: `YouTube Transcript API request failed for video ${videoId}: ${toErrorMessage(error)}`,
      retryable: isAbort,
    }
  }
}

async function fetchYoutubeTranscriptXml(track: YoutubeCaptionTrack) {
  const rawUrl = toSafeString(track.baseUrl)
  if (!rawUrl) {
    return {
      ok: false as const,
      code: 'youtube_captions_track_invalid',
      message: 'Caption track URL is missing',
      retryable: false,
    }
  }

  let url = rawUrl
  if (!/[?&]fmt=/.test(url)) {
    url += `${url.includes('?') ? '&' : '?'}fmt=srv3`
  }

  try {
    const response = await fetchWithTimeout(url, 15_000, {
      'user-agent': 'cadet-rag-ingestor/0.1 (+youtube-captions)',
      accept: 'application/xml,text/xml;q=0.9,*/*;q=0.5',
    })

    if (!response.ok) {
      return {
        ok: false as const,
        code: `youtube_captions_http_${response.status}`,
        message: `Transcript request returned HTTP ${response.status}`,
        retryable: response.status === 429 || response.status >= 500,
      }
    }

    return {
      ok: true as const,
      xml: await response.text(),
    }
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false as const,
      code: isAbort ? 'youtube_captions_timeout' : 'youtube_captions_fetch_failed',
      message: toErrorMessage(error),
      retryable: isAbort,
    }
  }
}

async function fetchYoutubeCaptionTrackSegments(
  video: YoutubeVideoPageData,
  preferredLanguage?: string,
): Promise<TranscriptFetchResult> {
  const track = chooseYoutubeCaptionTrack(video.captions, preferredLanguage)
  if (!track) {
    return {
      ok: false as const,
      code: 'youtube_no_caption_tracks',
      message: `No caption tracks available for video ${video.videoId}`,
      retryable: false,
    }
  }

  const transcriptXml = await fetchYoutubeTranscriptXml(track)
  if (!transcriptXml.ok) {
    return transcriptXml
  }

  const transcriptLines = parseYoutubeTranscriptLines(transcriptXml.xml)
  if (transcriptLines.length === 0) {
    return {
      ok: false as const,
      code: 'youtube_empty_transcript',
      message: `Caption track transcript was empty for video ${video.videoId}`,
      retryable: false,
    }
  }

  return {
    ok: true as const,
    provider: 'youtube_captions_xml',
    segments: transcriptLines.map(line => ({
      text: line.text,
      startSec: line.startSec,
      endSec: line.endSec,
    })),
    rawPayload: {
      provider: 'youtube_captions_xml',
      format: 'srv3',
      track,
      xmlSha256: sha256Hex(transcriptXml.xml),
    },
  }
}

function isLikelyShortVideo(video: YoutubeVideoPageData) {
  if (video.isLive) {
    return false
  }

  return typeof video.durationSec === 'number'
    && video.durationSec > 0
    && video.durationSec <= 180
}

function isNonFatalYoutubeItemError(code: string) {
  return [
    'youtube_missing_transcript',
    'youtube_empty_transcript',
    'youtube_no_caption_tracks',
  ].includes(code)
}

async function processYoutubeSourceRun(
  source: SourceRow,
  existingItemsByExternalId: Map<string, ExistingSourceItem>,
): Promise<SourceRunResult> {
  const config = normalizeYoutubeConfig(source.crawlConfig)
  const stats = zeroStats()
  const errors: SourceRunError[] = []
  const sourceItemUpserts: Array<Record<string, unknown>> = []
  const transcriptFailureCodeCounts: Record<string, number> = {}

  if (!config) {
    const now = Date.now()
    return {
      status: 'failed',
      stats: {
        ...stats,
        failed: 1,
      },
      errors: [{
        code: 'invalid_youtube_config',
        message: 'YouTube crawlConfig is missing or invalid',
        retryable: false,
        timestamp: now,
      }],
      lastError: 'YouTube crawlConfig is missing or invalid',
      sourceItemUpserts,
    }
  }

  const feed = await fetchYoutubeChannelFeedWithFallback(config)
  if (!feed.ok) {
    const now = Date.now()
    return {
      status: 'failed',
      stats: {
        ...stats,
        failed: 1,
      },
      errors: [{
        code: feed.code,
        message: feed.message,
        retryable: feed.retryable,
        timestamp: now,
      }],
      lastError: feed.message,
      sourceItemUpserts,
    }
  }

  const effectiveChannelId = typeof feed.resolvedChannelId === 'string' ? feed.resolvedChannelId : config.channelId
  const discoveryMethod = typeof (feed as any).via === 'string' ? String((feed as any).via) : 'youtube_feed_rss'
  const videos = feed.videos.slice(0, config.maxVideosPerRun)
  for (const discovered of videos) {
    stats.discovered += 1

    const existing = existingItemsByExternalId.get(discovered.videoId)
    const watch = await fetchYoutubeWatchPageData(discovered, config.preferredLanguage)
    if (!watch.ok) {
      stats.failed += 1
      errors.push({
        code: watch.code,
        message: watch.message,
        retryable: watch.retryable,
        timestamp: Date.now(),
      })
      sourceItemUpserts.push({
        itemType: 'youtube_video',
        externalId: discovered.videoId,
        canonicalUrl: discovered.canonicalUrl,
        title: discovered.title,
        publishedAt: discovered.publishedAtMs,
        lastSeenAt: Date.now(),
        status: 'active',
        rawHash: existing?.rawHash,
        normalizedHash: existing?.normalizedHash,
        r2ContentKey: existing?.r2ContentKey,
        r2MetaKey: existing?.r2MetaKey,
        lastError: watch.message,
      })
      continue
    }

    const videoData = watch.video
    const descriptionFallbackText = normalizeWhitespace(
      videoData.descriptionText || discovered.descriptionText || '',
    ) || ''
    if (!config.includeShorts && isLikelyShortVideo(videoData)) {
      stats.skipped += 1
      sourceItemUpserts.push({
        itemType: 'youtube_video',
        externalId: videoData.videoId,
        canonicalUrl: videoData.canonicalUrl,
        title: videoData.title,
        publishedAt: videoData.publishedAtMs,
        lastSeenAt: watch.fetchedAtMs,
        lastFetchedAt: watch.fetchedAtMs,
        status: 'active',
        rawHash: existing?.rawHash,
        normalizedHash: existing?.normalizedHash,
        r2ContentKey: existing?.r2ContentKey,
        r2MetaKey: existing?.r2MetaKey,
        lastError: undefined,
      })
      continue
    }

    let contentSource: 'transcript' | 'description' = 'transcript'
    let transcriptLines: YoutubeTranscriptLine[] = []
    let transcriptSections: YoutubeTranscriptSection[] = []
    let transcriptRawPayload: unknown = null
    let transcriptErrorForFallback: SourceRunError | null = null

    const toTranscriptAttemptError = (result: Extract<TranscriptFetchResult, { ok: false }>) => ({
      code: result.code,
      message: result.message,
      retryable: result.retryable,
      timestamp: Date.now(),
    } satisfies SourceRunError)

    stats.transcriptAttempted += 1
    let transcript: TranscriptFetchResult = await fetchYoutubeInnerTubeAndroidSegments(videoData.videoId, config.preferredLanguage)
    let transcriptProviderForMetadata: 'youtube_innertube_android' | 'youtube_transcript_api' | 'youtube_captions_xml' | null = null
    const transcriptAttemptErrors: SourceRunError[] = []
    const transcriptProviderAttemptOrder = [
      'youtube_innertube_android',
      'youtube_captions_xml',
      'youtube_transcript_api',
    ] as const

    if (!transcript.ok) {
      transcriptAttemptErrors.push(toTranscriptAttemptError(transcript))

      const watchPageCaptionFallback = await fetchYoutubeCaptionTrackSegments(videoData, config.preferredLanguage)
      if (watchPageCaptionFallback.ok) {
        transcript = watchPageCaptionFallback
      }
      else {
        transcriptAttemptErrors.push(toTranscriptAttemptError(watchPageCaptionFallback))
        transcript = watchPageCaptionFallback
      }
    }

    if (!transcript.ok) {
      const apiFallback = await fetchYoutubeTranscriptApiSegments(videoData.videoId)
      if (apiFallback.ok) {
        transcript = apiFallback
      }
      else {
        transcriptAttemptErrors.push(toTranscriptAttemptError(apiFallback))
        transcript = apiFallback
      }
    }

    if (!transcript.ok) {
      const transcriptError = transcriptAttemptErrors[transcriptAttemptErrors.length - 1]
        ?? toTranscriptAttemptError(transcript)
      for (const attemptError of transcriptAttemptErrors) {
        errors.push(attemptError)
        transcriptFailureCodeCounts[attemptError.code] = (transcriptFailureCodeCounts[attemptError.code] ?? 0) + 1
      }

      if (descriptionFallbackText) {
        contentSource = 'description'
        transcriptErrorForFallback = transcriptError
        stats.transcriptDescriptionFallback += 1
      }
      else {
        const nonFatalTranscriptError = isNonFatalYoutubeItemError(transcript.code)
        if (nonFatalTranscriptError) {
          stats.skipped += 1
        }
        else {
          stats.failed += 1
        }
        sourceItemUpserts.push({
          itemType: 'youtube_video',
          externalId: videoData.videoId,
          canonicalUrl: videoData.canonicalUrl,
          title: videoData.title,
          publishedAt: videoData.publishedAtMs,
          lastSeenAt: watch.fetchedAtMs,
          lastFetchedAt: watch.fetchedAtMs,
          status: 'active',
          rawHash: existing?.rawHash,
          normalizedHash: existing?.normalizedHash,
          r2ContentKey: existing?.r2ContentKey,
          r2MetaKey: existing?.r2MetaKey,
          lastError: transcript.message,
        })
        continue
      }
    }
    else {
      transcriptProviderForMetadata = transcript.provider
      transcriptLines = transcript.segments.map(segment => ({
        startSec: segment.startSec,
        endSec: segment.endSec,
        durSec: Math.max(0, segment.endSec - segment.startSec),
        text: segment.text,
      })) satisfies YoutubeTranscriptLine[]
      transcriptSections = buildYoutubeTranscriptSections(transcriptLines)
      transcriptRawPayload = transcript.rawPayload

      if (transcriptSections.length === 0) {
        const transcriptError = {
          code: 'youtube_empty_transcript',
          message: `Transcript provider returned no usable transcript sections for video ${videoData.videoId}`,
          retryable: false,
          timestamp: Date.now(),
        } satisfies SourceRunError
        errors.push(transcriptError)
        transcriptFailureCodeCounts[transcriptError.code] = (transcriptFailureCodeCounts[transcriptError.code] ?? 0) + 1

        if (descriptionFallbackText) {
          contentSource = 'description'
          transcriptErrorForFallback = transcriptError
          stats.transcriptDescriptionFallback += 1
          transcriptLines = []
          transcriptSections = []
          transcriptRawPayload = null
        }
        else {
          stats.skipped += 1
          sourceItemUpserts.push({
            itemType: 'youtube_video',
            externalId: videoData.videoId,
            canonicalUrl: videoData.canonicalUrl,
            title: videoData.title,
            publishedAt: videoData.publishedAtMs,
            lastSeenAt: watch.fetchedAtMs,
            lastFetchedAt: watch.fetchedAtMs,
            status: 'active',
            rawHash: existing?.rawHash,
            normalizedHash: existing?.normalizedHash,
            r2ContentKey: existing?.r2ContentKey,
            r2MetaKey: existing?.r2MetaKey,
            lastError: transcriptError.message,
          })
          continue
        }
      }
    }

    stats.fetched += 1

    const itemId = buildYoutubeVideoItemId(videoData.videoId)
    const keys = buildR2Keys({
      tenantId: source.tenantId || 'default',
      sourceId: String(source._id),
      sourceType: 'youtube_channel',
      itemType: 'youtube_video',
      itemId,
    })

    const transcriptTextWithTimestamps = transcriptSections
      .map(section => `${formatTimestamp(section.startSec)}-${formatTimestamp(section.endSec)} ${section.text}`)
      .join('\n')
    const transcriptHasTimestamps = transcriptLines.some(line => line.startSec > 0 || line.endSec > line.startSec)
    if (contentSource === 'transcript') {
      stats.transcriptSucceeded += 1
      if (transcriptProviderForMetadata === 'youtube_innertube_android') {
        stats.transcriptSucceededInnerTubeAndroid += 1
      }
      else if (transcriptProviderForMetadata === 'youtube_transcript_api') {
        stats.transcriptSucceededApi += 1
      }
      else if (transcriptProviderForMetadata === 'youtube_captions_xml') {
        stats.transcriptSucceededCaptionsXml += 1
      }
      if (transcriptHasTimestamps) {
        stats.transcriptSucceededWithTimestamps += 1
      }
    }
    const descriptionTextForContent = contentSource === 'description' ? descriptionFallbackText : ''
    const rawHash = contentSource === 'transcript'
      ? sha256Hex(JSON.stringify(transcriptRawPayload))
      : sha256Hex(JSON.stringify({
          provider: 'youtube_description',
          video_id: videoData.videoId,
          canonical_url: videoData.canonicalUrl,
          title: videoData.title,
          description: descriptionTextForContent,
        }))
    const normalizedHash = sha256Hex([
      videoData.videoId,
      videoData.canonicalUrl,
      videoData.title,
      `content_source:${contentSource}`,
      contentSource === 'transcript' ? transcriptTextWithTimestamps : descriptionTextForContent,
    ].join('\n\n'))

    const isNew = !existing
    const isChanged = !isNew && existing.normalizedHash !== normalizedHash

    if (isNew) {
      stats.new += 1
    }
    else if (isChanged) {
      stats.changed += 1
    }
    else {
      stats.unchanged += 1
    }

    const fetchedAtIso = new Date(watch.fetchedAtMs).toISOString()
    const publishedAtIso = typeof videoData.publishedAtMs === 'number'
      ? new Date(videoData.publishedAtMs).toISOString()
      : undefined
    const metadata = {
      title: videoData.title,
      canonical_url: videoData.canonicalUrl,
      source_type: 'youtube_channel',
      source_id: String(source._id),
      item_type: 'youtube_video',
      external_id: videoData.videoId,
      tenant_id: source.tenantId || 'default',
      channel_id_effective: effectiveChannelId,
      channel_id_configured: config.channelId,
      video_discovery_method: discoveryMethod,
      fetched_at: fetchedAtIso,
      published_at: publishedAtIso,
      content_source: contentSource,
      transcript_available: contentSource === 'transcript',
      transcript_provider: contentSource === 'transcript' ? transcriptProviderForMetadata : null,
      transcript_error_code: transcriptErrorForFallback?.code ?? null,
      transcript_error_message: transcriptErrorForFallback?.message ?? null,
      caption_language: null,
      caption_kind: null,
      description_length: descriptionFallbackText.length,
      transcript_section_count: transcriptSections.length,
      transcript_line_count: transcriptLines.length,
      timestamps_preserved: contentSource === 'transcript' ? transcriptHasTimestamps : false,
    }

    if (isNew || isChanged) {
      const markdown = buildYoutubeMarkdownDocument({
        title: videoData.title,
        canonicalUrl: videoData.canonicalUrl,
        publishedAtIso,
        fetchedAtIso,
        contentSource,
        transcriptSections,
        descriptionText: descriptionTextForContent,
        metadata,
      })
      const metaJson = JSON.stringify({
        ...metadata,
        raw_hash: rawHash,
        normalized_hash: normalizedHash,
        duration_sec: videoData.durationSec ?? null,
        description_text: contentSource === 'description' ? descriptionTextForContent : null,
        transcript_sections: transcriptSections.map(section => ({
          start_sec: section.startSec,
          end_sec: section.endSec,
          start_label: formatTimestamp(section.startSec),
          end_label: formatTimestamp(section.endSec),
          text: section.text,
        })),
      }, null, 2)

      await putRagObject({
        key: keys.contentKey,
        body: markdown,
        contentType: 'text/markdown; charset=utf-8',
      })
      await putRagObject({
        key: keys.metaKey,
        body: metaJson,
        contentType: 'application/json; charset=utf-8',
      })
    }

    sourceItemUpserts.push({
      itemType: 'youtube_video',
      externalId: videoData.videoId,
      canonicalUrl: videoData.canonicalUrl,
      title: videoData.title,
      publishedAt: videoData.publishedAtMs,
      lastSeenAt: watch.fetchedAtMs,
      lastFetchedAt: watch.fetchedAtMs,
      status: 'active',
      rawHash,
      normalizedHash,
      r2ContentKey: keys.contentKey,
      r2MetaKey: keys.metaKey,
      lastChangeDetectedAt: isNew || isChanged ? Date.now() : undefined,
      lastError: transcriptErrorForFallback?.message,
    })

    logStructured('youtube_transcript_outcome', {
      sourceId: String(source._id),
      tenantId: source.tenantId || 'default',
      channelIdConfigured: config.channelId,
      channelIdEffective: effectiveChannelId,
      discoveryMethod,
      videoId: videoData.videoId,
      transcriptProviderAttemptOrder,
      transcriptAttemptErrorCodes: transcriptAttemptErrors.map(error => error.code),
      contentSource,
      transcriptSucceeded: contentSource === 'transcript',
      transcriptProvider: transcriptProviderForMetadata,
      timestampsPreserved: contentSource === 'transcript' ? transcriptHasTimestamps : false,
      transcriptLineCount: transcriptLines.length,
      transcriptSectionCount: transcriptSections.length,
      transcriptErrorCode: transcriptErrorForFallback?.code ?? null,
      transcriptErrorMessage: transcriptErrorForFallback?.message ?? null,
      innerTubeFailureCode: transcriptAttemptErrors.find(error => error.code.startsWith('youtube_innertube_'))?.code ?? null,
      innerTubeCaptionTrackCount: contentSource === 'transcript' && transcriptProviderForMetadata === 'youtube_innertube_android'
        ? Number((transcriptRawPayload as any)?.captionTrackCount ?? 0)
        : null,
      innerTubePlayabilityStatus: contentSource === 'transcript' && transcriptProviderForMetadata === 'youtube_innertube_android'
        ? toSafeString((transcriptRawPayload as any)?.playerPlayabilityStatus) || null
        : null,
    })
  }

  const lastError = errors.length > 0 ? errors[errors.length - 1]?.message : undefined
  const hasSuccess = stats.fetched > 0 || stats.new > 0 || stats.changed > 0 || stats.unchanged > 0
  const hasErrors = errors.length > 0
  const onlyNonFatalItemErrors = hasErrors && errors.every(error => isNonFatalYoutubeItemError(error.code))
  const hasFatalErrors = hasErrors && !onlyNonFatalItemErrors
  const status = !hasErrors
    ? 'succeeded'
    : onlyNonFatalItemErrors
        ? 'partial'
        : (hasSuccess || (stats.discovered > 0 && !hasFatalErrors))
            ? 'partial'
            : 'failed'
  const topTranscriptFailureCodes = Object.entries(transcriptFailureCodeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({ code, count }))

  logStructured('youtube_source_run_summary', {
    sourceId: String(source._id),
    tenantId: source.tenantId || 'default',
    channelIdConfigured: config.channelId,
    channelIdEffective: effectiveChannelId,
    discoveryMethod,
    status,
    stats,
    transcriptFailureCodeCounts,
    topTranscriptFailureCodes,
    errorCount: errors.length,
    lastError: lastError ?? null,
  })

  return {
    status,
    stats,
    errors: errors.slice(0, 20),
    lastError,
    sourceItemUpserts,
  }
}

async function processWebsiteSourceRun(
  source: SourceRow,
  existingItemsByExternalId: Map<string, ExistingSourceItem>,
): Promise<SourceRunResult> {
  const config = normalizeWebsiteConfig(source.crawlConfig)
  const stats = zeroStats()
  const errors: SourceRunError[] = []
  const sourceItemUpserts: Array<Record<string, unknown>> = []

  if (!config) {
    const now = Date.now()
    return {
      status: 'failed',
      stats: {
        ...stats,
        failed: 1,
      },
      errors: [{
        code: 'invalid_website_config',
        message: 'Website crawlConfig is missing or invalid',
        retryable: false,
        timestamp: now,
      }],
      lastError: 'Website crawlConfig is missing or invalid',
      sourceItemUpserts,
    }
  }

  const queue: Array<{ url: string, depth: number }> = []
  const queued = new Set<string>()
  const visited = new Set<string>()

  for (const seed of config.seedUrls) {
    const canonicalSeed = canonicalizeUrl(seed)
    if (!canonicalSeed) {
      stats.skipped += 1
      continue
    }

    const seedUrl = new URL(canonicalSeed)
    if (!isAllowedDomain(seedUrl.hostname, config.allowedDomains) || !isUrlAllowedByPathRules(canonicalSeed, config)) {
      stats.skipped += 1
      continue
    }

    if (!queued.has(canonicalSeed)) {
      queued.add(canonicalSeed)
      queue.push({ url: canonicalSeed, depth: 0 })
    }
  }

  while (queue.length > 0 && visited.size < config.maxPagesPerRun) {
    const current = queue.shift()!
    if (visited.has(current.url)) {
      continue
    }

    visited.add(current.url)
    stats.discovered += 1

    const outcome = await fetchAndExtractPage(current.url)
    if (!outcome.ok) {
      stats.failed += 1
      errors.push({
        code: outcome.code,
        message: outcome.message,
        retryable: outcome.retryable,
        timestamp: Date.now(),
      })
      continue
    }

    const finalUrl = new URL(outcome.page.canonicalUrl)
    if (!isAllowedDomain(finalUrl.hostname, config.allowedDomains)) {
      stats.skipped += 1
      continue
    }

    if (!isUrlAllowedByPathRules(outcome.page.canonicalUrl, config)) {
      stats.skipped += 1
      continue
    }

    stats.fetched += 1

    const itemId = hashForItemId(outcome.page.canonicalUrl)
    const keys = buildR2Keys({
      tenantId: source.tenantId || 'default',
      sourceId: String(source._id),
      sourceType: 'website',
      itemType: 'web_page',
      itemId,
    })

    const rawHash = sha256Hex(outcome.page.rawHtml)
    const normalizedHash = sha256Hex([
      outcome.page.canonicalUrl,
      outcome.page.title,
      outcome.page.contentText,
    ].join('\n\n'))

    const existing = existingItemsByExternalId.get(outcome.page.canonicalUrl)
    const isNew = !existing
    const isChanged = !isNew && existing.normalizedHash !== normalizedHash

    if (isNew) {
      stats.new += 1
    }
    else if (isChanged) {
      stats.changed += 1
    }
    else {
      stats.unchanged += 1
    }

    const metadata = {
      title: outcome.page.title,
      canonical_url: outcome.page.canonicalUrl,
      source_type: 'website',
      source_id: String(source._id),
      item_type: 'web_page',
      external_id: outcome.page.canonicalUrl,
      fetched_at: new Date(outcome.page.fetchedAtMs).toISOString(),
      tenant_id: source.tenantId || 'default',
    }

    if (isNew || isChanged) {
      const markdown = buildMarkdownDocument(outcome.page, metadata)
      const metaJson = JSON.stringify({
        ...metadata,
        raw_hash: rawHash,
        normalized_hash: normalizedHash,
        content_length: outcome.page.contentText.length,
      }, null, 2)

      await putRagObject({
        key: keys.contentKey,
        body: markdown,
        contentType: 'text/markdown; charset=utf-8',
      })
      await putRagObject({
        key: keys.metaKey,
        body: metaJson,
        contentType: 'application/json; charset=utf-8',
      })
    }

    sourceItemUpserts.push({
      itemType: 'web_page',
      externalId: outcome.page.canonicalUrl,
      canonicalUrl: outcome.page.canonicalUrl,
      title: outcome.page.title,
      lastSeenAt: Date.now(),
      lastFetchedAt: outcome.page.fetchedAtMs,
      status: 'active',
      rawHash,
      normalizedHash,
      r2ContentKey: keys.contentKey,
      r2MetaKey: keys.metaKey,
      lastChangeDetectedAt: isNew || isChanged ? Date.now() : undefined,
      lastError: undefined,
    })

    if (current.depth < config.maxDepth) {
      for (const link of outcome.links) {
        if (visited.has(link) || queued.has(link)) {
          continue
        }

        const linkUrl = new URL(link)
        if (!isAllowedDomain(linkUrl.hostname, config.allowedDomains)) {
          continue
        }
        if (!isUrlAllowedByPathRules(link, config)) {
          continue
        }
        if (visited.size + queue.length >= config.maxPagesPerRun) {
          continue
        }

        queued.add(link)
        queue.push({ url: link, depth: current.depth + 1 })
      }
    }
  }

  const lastError = errors.length > 0 ? errors[errors.length - 1]?.message : undefined
  const status = stats.fetched === 0 && stats.failed > 0
    ? 'failed'
    : stats.failed > 0
      ? 'partial'
      : 'succeeded'

  return {
    status,
    stats,
    errors: errors.slice(0, 20),
    lastError,
    sourceItemUpserts,
  }
}

function buildSourceMissingResult(): SourceRunResult {
  const now = Date.now()
  return {
    status: 'failed',
    stats: {
      ...zeroStats(),
      failed: 1,
    },
    errors: [{
      code: 'source_missing',
      message: 'Source not found',
      retryable: false,
      timestamp: now,
    }],
    lastError: 'Source not found',
    sourceItemUpserts: [],
  }
}

function buildPhase4NotImplementedResult(sourceType: string): SourceRunResult {
  const now = Date.now()
  return {
    status: 'failed',
    stats: {
      ...zeroStats(),
      failed: 1,
    },
    errors: [{
      code: 'adapter_not_implemented_phase4',
      message: `Adapter not implemented yet for source type "${sourceType}"`,
      retryable: false,
      timestamp: now,
    }],
    lastError: `Adapter not implemented yet for source type "${sourceType}"`,
    sourceItemUpserts: [],
  }
}

async function loadExistingSourceItems(convex: ConvexAdminClientLike, sourceId: string) {
  const result = await convex.query((anyApi as any).ragIngestionInternal.listSourceItemsForSourceFromNuxt, {
    sourceId,
  }) as { items?: ExistingSourceItem[] }

  const map = new Map<string, ExistingSourceItem>()
  for (const item of result.items ?? []) {
    map.set(item.externalId, item)
  }
  return map
}

export async function executePreparedBatchPhase3(convex: ConvexAdminClientLike, batchId: string) {
  await convex.mutation((anyApi as any).ragIngestionInternal.startBatchExecutionFromNuxt, { batchId })

  const plan = await convex.query((anyApi as any).ragIngestionInternal.getBatchExecutionPlanFromNuxt, { batchId }) as {
    batch?: { _id: string } | null
    items?: BatchPlanItem[]
  } | null

  if (!plan?.batch) {
    throw new Error('Prepared batch not found')
  }

  for (const entry of plan.items ?? []) {
    const sourceRunId = String(entry.sourceRun._id)
    const source = entry.source

    await convex.mutation((anyApi as any).ragIngestionInternal.markSourceRunStartedFromNuxt, {
      sourceRunId,
      startedAt: Date.now(),
    })

    let result: SourceRunResult
    try {
      if (!source) {
        result = buildSourceMissingResult()
      }
      else if (source.type === 'website') {
        const existingItems = await loadExistingSourceItems(convex, String(source._id))
        result = await processWebsiteSourceRun(source, existingItems)
      }
      else if (source.type === 'youtube_channel') {
        const existingItems = await loadExistingSourceItems(convex, String(source._id))
        result = await processYoutubeSourceRun(source, existingItems)
      }
      else {
        result = buildPhase4NotImplementedResult(source.type)
      }
    }
    catch (error) {
      const now = Date.now()
      result = {
        status: 'failed',
        stats: {
          ...zeroStats(),
          failed: 1,
        },
        errors: [{
          code: 'source_run_unhandled_error',
          message: toErrorMessage(error),
          retryable: false,
          timestamp: now,
        }],
        lastError: toErrorMessage(error),
        sourceItemUpserts: [],
      }
    }

    await convex.mutation((anyApi as any).ragIngestionInternal.completeSourceRunFromNuxt, {
      sourceRunId,
      status: result.status,
      stats: result.stats,
      errors: result.errors,
      lastError: result.lastError,
      finishedAt: Date.now(),
      sourceItemUpserts: result.sourceItemUpserts,
    })
  }

  return await convex.mutation((anyApi as any).ragIngestionInternal.finalizeBatchExecutionFromNuxt, {
    batchId,
    finishedAt: Date.now(),
  })
}
