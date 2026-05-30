<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useOpenApi } from '@/composables/useOpenApi'
import type { EndpointInfo } from '@/composables/useOpenApi'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
import { EllipsisVertical, ChevronLeft, ChevronRight } from '@lucide/vue'

interface Action {
  color: string
  method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  body?: Record<string, unknown> | null
}

const props = defineProps<{ endpoint: EndpointInfo }>()

const { fetchEndpoint } = useOpenApi()
const rows = ref<Record<string, unknown>[]>([])
const isLoading = ref(true)
const hasError = ref(false)
const page = ref(0)
const perPage = ref(10)
const isLastPage = ref(false)

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

const dataHeaders = computed(() =>
  rows.value.length ? Object.keys(rows.value[0]).filter(k => k !== '__actions__') : []
)

const hasActions = computed(() =>
  rows.value.some(r => Array.isArray(r.__actions__) && (r.__actions__ as Action[]).length > 0)
)

const totalCols = computed(() => dataHeaders.value.length + (hasActions.value ? 1 : 0))

async function loadPage(p: number) {
  isLoading.value = true
  hasError.value = false
  try {
    const params = props.endpoint.paginated ? { page: p, per_page: perPage.value } : undefined
    const data = await fetchEndpoint(props.endpoint.path, params)
    rows.value = data.data ?? []
    if (props.endpoint.paginated) {
      isLastPage.value = rows.value.length < perPage.value
    }
  } catch {
    hasError.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadPage(0))

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
  <div class="rounded-lg border border-border overflow-hidden bg-card">
    <Table>
      <TableHeader>
        <TableRow class="border-border bg-muted hover:bg-muted">
          <template v-if="isLoading">
            <TableHead v-for="i in 4" :key="i" class="py-3">
              <Skeleton class="h-3.5 w-20 bg-muted-foreground/20" />
            </TableHead>
          </template>
          <template v-else>
            <TableHead
              v-for="h in dataHeaders"
              :key="h"
              class="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground py-3 font-mono"
            >
              {{ formatHeader(h) }}
            </TableHead>
            <TableHead
              v-if="hasActions"
              class="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground py-3 font-mono w-10"
            />
          </template>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="isLoading">
          <TableRow v-for="i in 6" :key="i" class="border-border">
            <TableCell v-for="j in 4" :key="j" class="py-3">
              <Skeleton class="h-4 w-full bg-muted-foreground/20" />
            </TableCell>
          </TableRow>
        </template>

        <template v-else-if="hasError">
          <TableRow>
            <TableCell :colspan="Math.max(totalCols, 1)" class="py-8 text-center text-muted-foreground text-sm">
              Failed to load data
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
              {{ formatCell(row[h]) }}
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
      v-if="endpoint.paginated && !isLoading && !hasError"
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
