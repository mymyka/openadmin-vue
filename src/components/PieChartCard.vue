<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { VisSingleContainer, VisDonut } from '@unovis/vue'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useOpenApi } from '@/composables/useOpenApi'
import type { EndpointInfo } from '@/composables/useOpenApi'

const props = defineProps<{ endpoint: EndpointInfo }>()
const { fetchEndpoint } = useOpenApi()

interface PieChartResponse {
  data: Record<string, string | number>[]
  config: Record<string, { label: string; color: string }>
}

const rawData = ref<PieChartResponse | null>(null)
const isLoading = ref(true)
const isFirstLoad = ref(true)
const hasError = ref(false)
const errorMsg = ref<string | null>(null)

async function load() {
  isLoading.value = true
  hasError.value = false
  try {
    rawData.value = await fetchEndpoint(props.endpoint.path)
  } catch (e) {
    hasError.value = true
    errorMsg.value = e instanceof Error ? e.message : null
  } finally {
    isLoading.value = false
    isFirstLoad.value = false
  }
}

onMounted(load)

// The label column: its values match config keys (identifies each slice)
const nameKey = computed(() => {
  if (!rawData.value?.data?.length) return ''
  const cfgKeys = new Set(Object.keys(rawData.value.config))
  const dataKeys = Object.keys(rawData.value.data[0])
  return dataKeys.find(k =>
    rawData.value!.data.every(row => cfgKeys.has(String(row[k])))
  ) ?? ''
})

// The numeric value column
const valueKey = computed(() => {
  if (!rawData.value?.data?.length) return ''
  const nk = nameKey.value
  const dataKeys = Object.keys(rawData.value.data[0])
  return dataKeys.find(k => k !== nk && typeof rawData.value!.data[0][k] === 'number') ?? ''
})

const chartData = computed(() => rawData.value?.data ?? [])

// ChartConfig: one entry per slice using the slice's config
const chartConfig = computed<ChartConfig>(() => {
  if (!rawData.value) return {}
  return Object.fromEntries(
    Object.entries(rawData.value.config).map(([k, v]) => [k, { label: v.label, color: v.color }])
  )
})

const valueAccessor = computed(() => {
  const vk = valueKey.value
  return (d: any) => (vk ? (d[vk] as number) : 0)
})

const colorAccessor = computed(() => {
  const cfg = rawData.value?.config ?? {}
  const nk = nameKey.value
  return (d: any, i: number) => {
    const sliceKey = nk ? String(d[nk]) : ''
    return cfg[sliceKey]?.color ?? `hsl(var(--chart-${(i % 5) + 1}))`
  }
})

// Total for center label
const total = computed(() => {
  const vk = valueKey.value
  return chartData.value.reduce((sum, d) => sum + ((d[vk] as number) || 0), 0)
})

// Legend items
const legendItems = computed(() => {
  const cfg = rawData.value?.config ?? {}
  const nk = nameKey.value
  const vk = valueKey.value
  return chartData.value.map((d, i) => {
    const key = nk ? String(d[nk]) : String(i)
    const sliceCfg = cfg[key]
    return {
      key,
      label: sliceCfg?.label ?? key,
      color: sliceCfg?.color ?? `hsl(var(--chart-${(i % 5) + 1}))`,
      value: vk ? (d[vk] as number) : 0,
    }
  })
})
</script>

<template>
  <Card :class="hasError ? 'border-destructive/40 bg-destructive/5' : ''">
    <CardHeader class="pb-2">
      <CardTitle class="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground font-mono">
        {{ endpoint.summary }}
      </CardTitle>
      <CardDescription v-if="endpoint.description">{{ endpoint.description }}</CardDescription>
    </CardHeader>
    <CardContent>
      <Skeleton v-if="isLoading && isFirstLoad" class="h-44 w-full bg-muted" />
      <p v-else-if="hasError && errorMsg" class="text-xs text-destructive/80 font-mono">{{ errorMsg }}</p>
      <template v-else-if="!hasError && chartData.length && valueKey">
        <div class="flex gap-4 items-center">
          <!-- Pie chart -->
          <ChartContainer :config="chartConfig" class="h-44 w-44 shrink-0">
            <VisSingleContainer :data="chartData">
              <VisDonut
                :value="valueAccessor"
                :color="colorAccessor"
                :arc-width="55"
                :pad-angle="0.015"
                :corner-radius="2"
                :show-background="false"
                :central-label="total.toLocaleString()"
              />
            </VisSingleContainer>
          </ChartContainer>

          <!-- Legend -->
          <div class="flex flex-col gap-1.5 min-w-0">
            <div
              v-for="item in legendItems"
              :key="item.key"
              class="flex items-center gap-2 text-xs"
            >
              <span
                class="size-2.5 rounded-sm shrink-0"
                :style="{ background: item.color }"
              />
              <span class="text-muted-foreground truncate">{{ item.label }}</span>
              <span class="ml-auto font-mono font-medium tabular-nums text-foreground pl-3">
                {{ item.value.toLocaleString() }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
