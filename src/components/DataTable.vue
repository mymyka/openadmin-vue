<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive, onUnmounted } from 'vue'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useOpenApi } from '@/composables/useOpenApi'
import type { EndpointInfo } from '@/composables/useOpenApi'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
import { EllipsisVertical, ChevronLeft, ChevronRight, File, Search, Columns2, Check, ArrowUp, ArrowDown, ChevronsUpDown, GripVertical } from '@lucide/vue'

interface Action {
  color: string
  method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  body?: Record<string, unknown> | null
}

const props = defineProps<{ endpoint: EndpointInfo; refreshToken?: number }>()

const { fetchEndpoint } = useOpenApi()
const rows = ref<Record<string, unknown>[]>([])
const isLoading = ref(true)
const isFirstLoad = ref(true)
const hasError = ref(false)
const errorMessage = ref<string | null>(null)
const page = ref(0)
const perPage = ref(10)
const isLastPage = ref(false)
const search = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc'>('asc')

const settingsOpen = ref(false)
const perPageDraft = ref(10)

function openSettings() {
  perPageDraft.value = perPage.value
  settingsOpen.value = true
}

function applySettings() {
  const v = Math.max(1, Math.floor(perPageDraft.value))
  perPage.value = v
  page.value = 0
  settingsOpen.value = false
  loadPage(0)
}

const allHeaders = computed(() =>
  rows.value.length ? Object.keys(rows.value[0]).filter(k => k !== '__actions__') : []
)

const hiddenColumns = ref<Set<string>>(new Set())
const columnOrder = ref<string[]>([])

watch(allHeaders, (headers) => {
  const kept = columnOrder.value.filter(h => headers.includes(h))
  const added = headers.filter(h => !columnOrder.value.includes(h))
  columnOrder.value = [...kept, ...added]
}, { immediate: true })

const dataHeaders = computed(() =>
  columnOrder.value.filter(h => !hiddenColumns.value.has(h))
)

function toggleColumn(key: string) {
  const next = new Set(hiddenColumns.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  hiddenColumns.value = next
}

const draggedCol = ref<string | null>(null)
const dragOverCol = ref<string | null>(null)

function onColDragStart(h: string) {
  draggedCol.value = h
}

function onColDragOver(e: DragEvent, h: string) {
  e.preventDefault()
  if (!draggedCol.value) return
  dragOverCol.value = draggedCol.value !== h ? h : null
}

function onColDrop(h: string) {
  dragOverCol.value = null
  const dragged = draggedCol.value
  draggedCol.value = null
  if (!dragged || dragged === h) return
  const order = [...columnOrder.value]
  const from = order.indexOf(dragged)
  const to = order.indexOf(h)
  order.splice(from, 1)
  order.splice(to, 0, dragged)
  columnOrder.value = order
}

function onColDragEnd() {
  draggedCol.value = null
  dragOverCol.value = null
}

const hasActions = computed(() =>
  rows.value.some(r => Array.isArray(r.__actions__) && (r.__actions__ as Action[]).length > 0)
)

const totalCols = computed(() => dataHeaders.value.length + (hasActions.value ? 1 : 0))

function toggleSort(col: string) {
  if (sortColumn.value !== col) {
    sortColumn.value = col
    sortDirection.value = 'asc'
  } else if (sortDirection.value === 'asc') {
    sortDirection.value = 'desc'
  } else {
    sortColumn.value = null
  }
  page.value = 0
  loadPage(0)
}

async function loadPage(p: number) {
  isLoading.value = true
  hasError.value = false
  try {
    const params: Record<string, string | number> = {}
    if (props.endpoint.paginated) {
      params.page = p
      params.per_page = perPage.value
    }
    if (props.endpoint.searchable && search.value.trim()) {
      params.search = search.value.trim()
    }
    if (props.endpoint.sortColumns?.length) {
      params.ordered_sort = sortColumn.value ? JSON.stringify([sortColumn.value]) : '[]'
      if (sortColumn.value) params[sortColumn.value] = sortDirection.value
    }
    const data = await fetchEndpoint(props.endpoint.path, Object.keys(params).length ? params : undefined)
    rows.value = data.data ?? []
    if (props.endpoint.paginated) {
      isLastPage.value = rows.value.length < perPage.value
    }
  } catch (e) {
    hasError.value = true
    errorMessage.value = e instanceof Error ? e.message : null
  } finally {
    isLoading.value = false
    isFirstLoad.value = false
  }
}

onMounted(() => loadPage(0))
watch(() => props.refreshToken, (v, prev) => { if (v !== prev) loadPage(page.value) })

watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    page.value = 0
    loadPage(0)
  }, 300)
})

onUnmounted(() => { if (searchDebounce) clearTimeout(searchDebounce) })

function prevPage() {
  if (page.value > 0) {
    page.value--
    loadPage(page.value)
  }
}

function nextPage() {
  if (!isLastPage.value) {
    page.value++
    loadPage(page.value)
  }
}

function formatHeader(key: string): string {
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function actionLabel(action: Action): string {
  const slug = (action.url.split('/').at(-1) ?? action.url).split('?')[0]
  return formatHeader(slug)
}

function formatCell(v: unknown): string {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

type CellDisplayType = 'text' | 'image' | 'file' | 'loading'
const urlTypeCache = reactive<Record<string, 'image' | 'file' | 'loading'>>({})

async function fetchUrlType(url: string) {
  urlTypeCache[url] = 'loading'
  try {
    const resp = await fetch(url, { method: 'HEAD' })
    const ct = resp.headers.get('content-type') ?? ''
    urlTypeCache[url] = ct.startsWith('image/') ? 'image' : 'file'
  } catch {
    urlTypeCache[url] = 'file'
  }
}

function getCellType(v: unknown): CellDisplayType {
  if (typeof v !== 'string') return 'text'
  if (!v.startsWith('http://') && !v.startsWith('https://')) return 'text'
  const path = v.split('?')[0].split('#')[0]
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif)$/i.test(path)) return 'image'
  if (/\.[a-z0-9]{1,6}$/i.test(path)) return 'file'
  if (!(v in urlTypeCache)) fetchUrlType(v)
  return urlTypeCache[v] ?? 'loading'
}

function fileLabel(url: string): string {
  return url.split('/').at(-1)?.split('?')[0] || 'File'
}

function rowActions(row: Record<string, unknown>): Action[] {
  return Array.isArray(row.__actions__) ? (row.__actions__ as Action[]) : []
}

function actionItemClass(color: string): string {
  if (color === 'danger') return 'text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10'
  if (color === 'warning') return 'text-amber-400 data-[highlighted]:text-amber-400 data-[highlighted]:bg-amber-400/10'
  if (color === 'info') return 'text-blue-400 data-[highlighted]:text-blue-400 data-[highlighted]:bg-blue-400/10'
  return 'text-foreground data-[highlighted]:bg-accent'
}

const loadingRow = ref<string | null>(null)

async function runAction(action: Action, rowKey: string) {
  if (loadingRow.value === rowKey) return
  loadingRow.value = rowKey
  try {
    const url = action.url.startsWith('/') ? `/admin${action.url}` : action.url
    await fetch(url, {
      method: action.method,
      ...(action.body ? {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      } : {}),
    })
    const scrollY = window.scrollY
    await loadPage(page.value)
    window.scrollTo({ top: scrollY, behavior: 'instant' })
  } finally {
    loadingRow.value = null
  }
}
</script>

<template>
  <div class="rounded-lg border overflow-hidden transition-colors" :class="hasError ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'">
    <div
      v-if="endpoint.searchable || (!isFirstLoad && !hasError && allHeaders.length > 1)"
      class="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2"
    >
      <div v-if="endpoint.searchable" class="relative flex-1 min-w-0">
        <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          v-model="search"
          placeholder="Search…"
          class="h-8 pl-8 text-sm"
        />
      </div>

      <DropdownMenuRoot v-if="!isFirstLoad && !hasError && allHeaders.length > 1">
        <DropdownMenuTrigger
          class="ml-auto inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
        >
          <Columns2 class="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            align="end"
            :side-offset="4"
            class="z-50 min-w-[160px] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            <div class="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Columns</div>
            <DropdownMenuSeparator class="my-1 -mx-1 h-px bg-border" />
            <DropdownMenuItem
              v-for="h in allHeaders"
              :key="h"
              class="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-foreground data-[highlighted]:bg-accent gap-2"
              @select="(e) => { e.preventDefault(); toggleColumn(h) }"
            >
              <Check v-if="!hiddenColumns.has(h)" class="size-3.5 shrink-0" />
              <span v-else class="size-3.5 shrink-0" />
              {{ formatHeader(h) }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
    <Table>
      <TableHeader>
        <TableRow class="border-border bg-muted hover:bg-muted">
          <template v-if="isLoading && isFirstLoad">
            <TableHead v-for="i in 4" :key="i" class="py-3">
              <Skeleton class="h-3.5 w-20 bg-muted-foreground/20" />
            </TableHead>
          </template>
          <template v-else>
            <TableHead
              v-for="h in dataHeaders"
              :key="h"
              draggable="true"
              :class="[
                'text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground py-3 font-mono transition-colors',
                endpoint.sortColumns?.includes(h) ? 'cursor-pointer select-none hover:text-foreground' : 'cursor-grab',
                dragOverCol === h ? 'bg-primary/10 text-foreground' : '',
                draggedCol === h ? 'opacity-40' : '',
              ]"
              @dragstart="onColDragStart(h)"
              @dragover="onColDragOver($event, h)"
              @drop="onColDrop(h)"
              @dragend="onColDragEnd"
              @click="endpoint.sortColumns?.includes(h) ? toggleSort(h) : undefined"
            >
              <span class="inline-flex items-center gap-1">
                <GripVertical class="size-3 shrink-0 opacity-25 cursor-grab" />
                {{ formatHeader(h) }}
                <template v-if="endpoint.sortColumns?.includes(h)">
                  <ArrowUp v-if="sortColumn === h && sortDirection === 'asc'" class="size-3 shrink-0" />
                  <ArrowDown v-else-if="sortColumn === h && sortDirection === 'desc'" class="size-3 shrink-0" />
                  <ChevronsUpDown v-else class="size-3 shrink-0 opacity-40" />
                </template>
              </span>
            </TableHead>
            <TableHead
              v-if="hasActions"
              class="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground py-3 font-mono w-10"
            />
          </template>
        </TableRow>
      </TableHeader>
      <TableBody :class="{ 'opacity-40 pointer-events-none': isLoading && !isFirstLoad, 'transition-opacity duration-200': !isFirstLoad }">
        <template v-if="isLoading && isFirstLoad">
          <TableRow v-for="i in 6" :key="i" class="border-border">
            <TableCell v-for="j in 4" :key="j" class="py-3">
              <Skeleton class="h-4 w-full bg-muted-foreground/20" />
            </TableCell>
          </TableRow>
        </template>

        <template v-else-if="hasError">
          <TableRow>
            <TableCell :colspan="Math.max(totalCols, 1)" class="py-8 text-center text-muted-foreground text-sm">
              {{ errorMessage ?? 'Failed to load data' }}
            </TableCell>
          </TableRow>
        </template>

        <template v-else-if="rows.length === 0">
          <TableRow>
            <TableCell :colspan="Math.max(totalCols, 1)" class="py-8 text-center text-muted-foreground text-sm">
              No data available
            </TableCell>
          </TableRow>
        </template>

        <template v-else>
          <TableRow
            v-for="(row, i) in rows"
            :key="i"
            class="border-border hover:bg-muted/60 transition-colors"
          >
            <TableCell
              v-for="h in dataHeaders"
              :key="h"
              class="py-3 text-sm text-foreground"
            >
              <template v-if="getCellType(row[h]) === 'image'">
                <Avatar class="size-8">
                  <AvatarImage :src="String(row[h])" :alt="h" />
                  <AvatarFallback class="text-xs">?</AvatarFallback>
                </Avatar>
              </template>
              <a
                v-else-if="getCellType(row[h]) === 'file'"
                :href="String(row[h])"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <File class="size-3.5 shrink-0" />
                <span class="truncate max-w-[200px]">{{ fileLabel(String(row[h])) }}</span>
              </a>
              <Skeleton
                v-else-if="getCellType(row[h]) === 'loading'"
                class="size-8 rounded-full bg-muted-foreground/20"
              />
              <template v-else>
                {{ formatCell(row[h]) }}
              </template>
            </TableCell>

            <TableCell v-if="hasActions" class="py-2 w-10 text-right pr-3">
              <template v-if="rowActions(row).length > 0">
                <DropdownMenuRoot>
                  <DropdownMenuTrigger
                    class="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <EllipsisVertical class="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      :side-offset="4"
                      align="end"
                      class="z-50 min-w-[140px] overflow-hidden rounded-md border border-border bg-popover p-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    >
                      <DropdownMenuItem
                        v-for="(action, ai) in rowActions(row)"
                        :key="ai"
                        :class="[
                          'relative flex cursor-pointer select-none items-center rounded-sm px-3 py-1.5 text-sm outline-none transition-colors',
                          actionItemClass(action.color),
                        ]"
                        @select="runAction(action, `${i}-${ai}`)"
                      >
                        {{ actionLabel(action) }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenuRoot>
              </template>
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
    <div
      v-if="endpoint.paginated && !isFirstLoad && !hasError"
      class="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30"
    >
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="icon" class="h-7 w-7" @click="openSettings">
          <EllipsisVertical class="w-4 h-4" />
        </Button>
        <span class="text-xs text-muted-foreground">Page {{ page + 1 }}</span>
      </div>
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="icon" class="h-7 w-7" :disabled="page === 0" @click="prevPage">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" class="h-7 w-7" :disabled="isLastPage" @click="nextPage">
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>

  <DialogRoot v-model:open="settingsOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
        <DialogTitle class="text-sm font-semibold text-foreground mb-4">Table Settings</DialogTitle>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-muted-foreground font-medium mb-1.5 block">Rows per page</label>
            <Input
              v-model="perPageDraft"
              type="number"
              min="1"
              max="200"
              class="h-8 text-sm"
              @keydown.enter="applySettings"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <DialogClose as-child>
            <Button variant="ghost" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" @click="applySettings">Apply</Button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
