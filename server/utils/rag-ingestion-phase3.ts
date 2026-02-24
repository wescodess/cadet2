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

type YoutubeVideoPageData = {
  videoId: string
  canonicalUrl: string
  title: string
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

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return typeof error === 'string' && error.trim() ? error.trim() : 'Unknown error'
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

    const linkMatch = entryXml.match(/<link\b[^>]*\bhref=(?:"([^"]+)"|'([^']+)')[^>]*\/?>/i)
    const canonicalUrl = canonicalizeUrl(linkMatch?.[1] || linkMatch?.[2] || `https://www.youtube.com/watch?v=${videoId}`)
      || `https://www.youtube.com/watch?v=${videoId}`

    const publishedRaw = toSafeString(entryXml.match(/<published>([\s\S]*?)<\/published>/i)?.[1])
    const publishedMs = publishedRaw ? Date.parse(publishedRaw) : Number.NaN

    items.push({
      videoId,
      canonicalUrl,
      title,
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

  return {
    videoId: input.videoId,
    canonicalUrl,
    title,
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

  return lines
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
  transcriptSections: YoutubeTranscriptSection[]
  metadata: Record<string, unknown>
}) {
  const transcriptBody = input.transcriptSections
    .map(section => `[${formatTimestamp(section.startSec)} - ${formatTimestamp(section.endSec)}] ${section.text}`)
    .join('\n\n')

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
    '## Transcript',
    '',
    transcriptBody,
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

  const feed = await fetchYoutubeChannelFeed(config.channelId)
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

    const track = chooseYoutubeCaptionTrack(videoData.captions, config.preferredLanguage)
    if (!track) {
      stats.failed += 1
      const message = `No caption tracks available for video ${videoData.videoId}`
      errors.push({
        code: 'youtube_no_caption_tracks',
        message,
        retryable: false,
        timestamp: Date.now(),
      })
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
        lastError: message,
      })
      continue
    }

    const transcript = await fetchYoutubeTranscriptXml(track)
    if (!transcript.ok) {
      stats.failed += 1
      errors.push({
        code: transcript.code,
        message: transcript.message,
        retryable: transcript.retryable,
        timestamp: Date.now(),
      })
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

    const transcriptLines = parseYoutubeTranscriptLines(transcript.xml)
    const transcriptSections = buildYoutubeTranscriptSections(transcriptLines)
    if (transcriptSections.length === 0) {
      stats.failed += 1
      const message = `Transcript was empty for video ${videoData.videoId}`
      errors.push({
        code: 'youtube_empty_transcript',
        message,
        retryable: false,
        timestamp: Date.now(),
      })
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
        lastError: message,
      })
      continue
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
    const rawHash = sha256Hex(transcript.xml)
    const normalizedHash = sha256Hex([
      videoData.videoId,
      videoData.canonicalUrl,
      videoData.title,
      transcriptTextWithTimestamps,
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
      fetched_at: fetchedAtIso,
      published_at: publishedAtIso,
      caption_language: track.languageCode || null,
      caption_kind: track.kind || null,
      transcript_section_count: transcriptSections.length,
      transcript_line_count: transcriptLines.length,
      timestamps_preserved: true,
    }

    if (isNew || isChanged) {
      const markdown = buildYoutubeMarkdownDocument({
        title: videoData.title,
        canonicalUrl: videoData.canonicalUrl,
        publishedAtIso,
        fetchedAtIso,
        transcriptSections,
        metadata,
      })
      const metaJson = JSON.stringify({
        ...metadata,
        raw_hash: rawHash,
        normalized_hash: normalizedHash,
        duration_sec: videoData.durationSec ?? null,
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
      lastError: undefined,
    })
  }

  const lastError = errors.length > 0 ? errors[errors.length - 1]?.message : undefined
  const hasSuccess = stats.fetched > 0 || stats.new > 0 || stats.changed > 0 || stats.unchanged > 0
  const onlyNonFatalItemErrors = errors.length > 0 && errors.every(error => isNonFatalYoutubeItemError(error.code))
  const status = stats.failed === 0
    ? 'succeeded'
    : (hasSuccess || (stats.discovered > 0 && onlyNonFatalItemErrors))
        ? 'partial'
        : 'failed'

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
