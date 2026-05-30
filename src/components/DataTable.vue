<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useOpenApi } from '@/composables/useOpenApi'
import type { EndpointInfo } from '@/composables/useOpenApi'

const props = defineProps<{ endpoint: EndpointInfo }>()

const { fetchEndpoint } = useOpenApi()
const rows = ref<Record<string, string | number | boolean>[]>([])
const isLoading = ref(true)
const hasError = ref(false)

const headers = computed(() =>
  rows.value.length ? Object.keys(rows.value[0]) : []
)

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
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function formatCell(v: string | number | boolean | undefined): string {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}
</script>

<template>
  <div class="rounded-lg border border-border overflow-hidden bg-background">
    <Table>
      <TableHeader>
        <TableRow class="border-border bg-muted/40 hover:bg-muted/40">
          <template v-if="isLoading">
            <TableHead v-for="i in 4" :key="i" class="py-3">
              <Skeleton class="h-3.5 w-20" />
            </TableHead>
          </template>
          <TableHead
            v-else
            v-for="h in headers"
            :key="h"
            class="text-[12.5px] font-medium tracking-[0.08em] uppercase text-muted-foreground py-3"
          >
            {{ formatHeader(h) }}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="isLoading">
          <TableRow v-for="i in 6" :key="i" class="border-border">
            <TableCell v-for="j in 4" :key="j" class="py-3">
              <Skeleton class="h-4 w-full" />
            </TableCell>
          </TableRow>
        </template>

        <template v-else-if="hasError">
          <TableRow>
            <TableCell :colspan="Math.max(headers.length, 1)" class="py-8 text-center text-muted-foreground text-base">
              Failed to load data
            </TableCell>
          </TableRow>
        </template>

        <template v-else-if="rows.length === 0">
          <TableRow>
            <TableCell :colspan="Math.max(headers.length, 1)" class="py-8 text-center text-muted-foreground text-base">
              No data available
            </TableCell>
          </TableRow>
        </template>

        <template v-else>
          <TableRow
            v-for="(row, i) in rows"
            :key="i"
            class="border-border"
          >
            <TableCell
              v-for="h in headers"
              :key="h"
              class="py-3 text-base text-foreground"
            >
              {{ formatCell(row[h]) }}
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
