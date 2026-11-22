function escape(raw) {
  const unicode = /^\\u(?:\{([0-9a-f]+)\}|([0-9a-f]{4}))/i.exec(raw)
  if (unicode)
    return {
      length: unicode[0].length,
      value: String.fromCodePoint(parseInt(unicode[1] ?? unicode[2], 16)),
    }
  const hex = /^\\x([0-9a-f]{2})/i.exec(raw)
  if (hex) return { length: hex[0].length, value: String.fromCharCode(parseInt(hex[1], 16)) }
  const continuation = /^\\(?:\r\n|[\r\n\u2028\u2029])/.exec(raw)
  if (continuation) return { length: continuation[0].length, value: '' }
  const known = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0' }
  return { length: 2, value: known[raw[1]] ?? raw[1] }
}

export function decodedLocations(raw, offset) {
  const locations = []
  for (let i = 0; i < raw.length;) {
    const decoded = raw[i] === '\\' ? escape(raw.slice(i)) : { length: 1, value: raw[i] }
    for (let n = 0; n < decoded.value.length; n++) locations.push(offset + i)
    i += decoded.length
  }
  locations.push(offset + raw.length)
  return locations
}

export function originalFindings(findings, value) {
  if (!value.locations) return findings
  return findings.map((item) => {
    const start = item.index - value.index
    const index = value.locations[start] ?? value.index
    const end = value.locations[start + item.length] ?? index + 1
    return { ...item, index, length: Math.max(1, end - index) }
  })
}
