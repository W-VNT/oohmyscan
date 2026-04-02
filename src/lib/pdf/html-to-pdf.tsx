/**
 * Lightweight HTML → react-pdf renderer.
 * Handles the subset produced by TipTap StarterKit:
 * <h2>, <h3>, <p>, <strong>, <em>, <u>, <ul>, <ol>, <li>, <br>
 */
import { View, Text, StyleSheet } from '@react-pdf/renderer'

const s = StyleSheet.create({
  h2: { fontSize: 11, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  h3: { fontSize: 9.5, fontWeight: 'bold', marginTop: 8, marginBottom: 3 },
  p: { fontSize: 8, lineHeight: 1.6, marginBottom: 4 },
  li: { fontSize: 8, lineHeight: 1.6, marginBottom: 2, paddingLeft: 12 },
  bullet: { position: 'absolute', left: 0, fontSize: 8 },
})

interface HtmlNode {
  tag: string
  attrs?: Record<string, string>
  children: (HtmlNode | string)[]
}

/** Decode HTML entities */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

/** Very simple HTML parser — handles flat structure from TipTap output */
function parseHtml(html: string): HtmlNode[] {
  const nodes: HtmlNode[] = []
  // Split by top-level tags
  const tagRegex = /<(\w+)[^>]*>([\s\S]*?)<\/\1>/g
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1]
    const inner = match[2]
    nodes.push({ tag, children: parseInline(inner) })
  }

  // If no tags found, treat as plain text paragraphs
  if (nodes.length === 0 && html.trim()) {
    html.split('\n').filter((l) => l.trim()).forEach((line) => {
      nodes.push({ tag: 'p', children: [decodeEntities(line.trim())] })
    })
  }

  return nodes
}

/** Parse inline elements: <strong>, <em>, <u>, plain text */
function parseInline(html: string): (HtmlNode | string)[] {
  const result: (HtmlNode | string)[] = []
  // Match self-closing <br> OR content tags with required closing tag
  const inlineRegex = /<br\s*\/?>|<(strong|em|u|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = inlineRegex.exec(html)) !== null) {
    // Text before this tag
    if (match.index > lastIndex) {
      const text = decodeEntities(html.slice(lastIndex, match.index).replace(/<[^>]+>/g, ''))
      if (text) result.push(text)
    }

    if (match[0].startsWith('<br')) {
      result.push('\n')
    } else if (match[1] === 'li') {
      result.push({ tag: 'li', children: parseInline(match[2]) })
    } else {
      result.push({ tag: match[1], children: parseInline(match[2]) })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < html.length) {
    const text = decodeEntities(html.slice(lastIndex).replace(/<[^>]+>/g, ''))
    if (text) result.push(text)
  }

  return result
}

function renderInline(children: (HtmlNode | string)[]): React.ReactNode[] {
  return children.map((child, i) => {
    if (typeof child === 'string') return child
    if (child.tag === 'strong') return <Text key={i} style={{ fontWeight: 'bold' }}>{renderInline(child.children)}</Text>
    if (child.tag === 'em') return <Text key={i} style={{ fontStyle: 'italic' }}>{renderInline(child.children)}</Text>
    if (child.tag === 'u') return <Text key={i} style={{ textDecoration: 'underline' }}>{renderInline(child.children)}</Text>
    return <Text key={i}>{renderInline(child.children)}</Text>
  })
}

/** Render HTML as inline Text children (for table cells) */
export function renderHtmlInline(html: string): React.ReactNode[] {
  if (!html) return []
  const nodes = parseHtml(html)
  const result: React.ReactNode[] = []

  nodes.forEach((node, i) => {
    if (i > 0) result.push('\n')
    result.push(...renderInline(node.children))
  })

  return result.length > 0 ? result : [html]
}

/** Render parsed HTML nodes to react-pdf components */
export function HtmlContent({ html }: { html: string }) {
  const nodes = parseHtml(html)

  return (
    <View>
      {nodes.map((node, i) => {
        if (node.tag === 'h2') {
          return <Text key={i} style={s.h2}>{renderInline(node.children)}</Text>
        }
        if (node.tag === 'h3') {
          return <Text key={i} style={s.h3}>{renderInline(node.children)}</Text>
        }
        if (node.tag === 'ul' || node.tag === 'ol') {
          // Render list items
          const items = node.children.filter((c) => typeof c !== 'string' && c.tag === 'li') as HtmlNode[]
          return (
            <View key={i}>
              {items.map((li, j) => (
                <View key={j} style={s.li}>
                  <Text style={s.bullet}>{node.tag === 'ol' ? `${j + 1}.` : '•'}</Text>
                  <Text style={{ fontSize: 8, lineHeight: 1.6 }}>{renderInline(li.children)}</Text>
                </View>
              ))}
            </View>
          )
        }
        // Default: paragraph
        return <Text key={i} style={s.p}>{renderInline(node.children)}</Text>
      })}
    </View>
  )
}
