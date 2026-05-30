import { ref, computed } from 'vue'

export interface EndpointInfo {
  path: string
  pageSlug: string
  type: 'stat' | 'table' | 'markdown'
  itemSlug: string
  summary: string
  description?: string
  tag?: string
  paginated?: boolean
}

export interface Page {
  slug: string
  title: string
  tag?: string
  stats: EndpointInfo[]
  tables: EndpointInfo[]
  markdowns: EndpointInfo[]
}

export interface Section {
  title?: string
  pages: Page[]
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Singleton state shared across all composable instances
const spec = ref<any>(null)
const specLoading = ref(false)
const specError = ref<string | null>(null)

let loadPromise: Promise<void> | null = null

async function loadSpec(): Promise<void> {
  if (spec.value || loadPromise) return loadPromise ?? undefined
  loadPromise = (async () => {
    specLoading.value = true
    try {
      const res = await fetch('/admin/openapi.json')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      spec.value = await res.json()
    } catch (e) {
      specError.value = String(e)
    } finally {
      specLoading.value = false
    }
  })()
  return loadPromise
}

const sections = computed<Section[]>(() => {
  if (!spec.value) return []

  const pages = new Map<string, Page>()
  const pageOrder: string[] = []

  for (const [path, pathItem] of Object.entries<any>(spec.value.paths ?? {})) {
    const get = pathItem?.get
    if (!get) continue

    const parts = path.replace(/^\//, '').split('/')
    if (parts.length < 3) continue

    const [pageSlug, type, itemSlug] = parts
    if (!['stat', 'table', 'markdown'].includes(type)) continue

    const tag: string | undefined = get.tags?.[0] || undefined

    if (!pages.has(pageSlug)) {
      pageOrder.push(pageSlug)
      pages.set(pageSlug, {
        slug: pageSlug,
        title: slugToTitle(pageSlug),
        tag,
        stats: [],
        tables: [],
        markdowns: [],
      })
    }

    const page = pages.get(pageSlug)!
    const params: any[] = get.parameters ?? []
    const paginated = params.some((p: any) => p.name === 'page' && p.in === 'query')

    const endpoint: EndpointInfo = {
      path,
      pageSlug,
      type: type as EndpointInfo['type'],
      itemSlug,
      summary: get.summary || slugToTitle(itemSlug),
      description: get.description,
      tag,
      paginated,
    }

    if (type === 'stat') page.stats.push(endpoint)
    else if (type === 'table') page.tables.push(endpoint)
    else page.markdowns.push(endpoint)
  }

  // Group pages into sections, preserving insertion order
  const sectionTagOrder: (string | undefined)[] = []
  const sectionMap = new Map<string | undefined, Page[]>()

  for (const slug of pageOrder) {
    const page = pages.get(slug)!
    const tag = page.tag
    if (!sectionMap.has(tag)) {
      sectionTagOrder.push(tag)
      sectionMap.set(tag, [])
    }
    sectionMap.get(tag)!.push(page)
  }

  // Untagged section first, then tagged sections in insertion order
  const untagged = sectionTagOrder.filter(t => !t)
  const tagged = sectionTagOrder.filter(t => !!t)

  return [...untagged, ...tagged].map(tag => ({
    title: tag,
    pages: sectionMap.get(tag)!,
  }))
})

const allPages = computed<Page[]>(() =>
  sections.value.flatMap(s => s.pages)
)

async function fetchEndpoint(path: string, params?: Record<string, string | number>): Promise<any> {
  const url = new URL(`/admin${path}`, location.origin)
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  }
  const res = await fetch(url.toString())
  if (!res.ok) {
    let detail: string | undefined
    try {
      const body = await res.json()
      detail = typeof body?.detail === 'string' ? body.detail
        : typeof body?.message === 'string' ? body.message
        : typeof body?.error === 'string' ? body.error
        : undefined
    } catch {}
    throw new Error(detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

function getPage(slug: string): Page | undefined {
  return allPages.value.find(p => p.slug === slug)
}

export function useOpenApi() {
  return { spec, loading: specLoading, error: specError, sections, allPages, loadSpec, getPage, fetchEndpoint }
}
