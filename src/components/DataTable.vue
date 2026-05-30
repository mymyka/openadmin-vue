<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useOpenApi } from '@/composables/useOpenApi'
import type { EndpointInfo } from '@/composables/useOpenApi'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import { EllipsisVertical } from '@lucide/vue'

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

const dataHeaders = computed(() =>
  rows.value.length ? Object.keys(rows.value[0]).filter(k => k !== '__actions__') : []
)

const hasActions = computed(() =>
  rows.value.some(r => Array.isArray(r.__actions__) && (r.__actions__ as Action[]).length > 0)
)

const totalCols = computed(() => dataHeaders.value.length + (hasActions.value ? 1 : 0))

onMounted(async () => {
  try {
    const data = await fetchEndpoint(props.endpoint.path)
    rows.value = data.data ?? []
  } catch {
    hasError.value = true
  } finally {
    isLoading.value = false
  }
})

function formatHeader(key: string): string {
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function actionLabel(action: Action): string {
  const slug = action.url.split('/').at(-1) ?? action.url
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
  </div>
</template>
