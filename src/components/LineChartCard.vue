<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { VisXYContainer, VisLine, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useOpenApi } from '@/composables/useOpenApi'
import type { EndpointInfo } from '@/composables/useOpenApi'

const props = defineProps<{ endpoint: EndpointInfo }>()
const { fetchEndpoint } = useOpenApi()

interface LineChartResponse {
  data: Record<string, string | number>[]
  config: Record<string, { label: string; color: string }>
}

const rawData = ref<LineChartResponse | null>(null)
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

const xKey = computed(() => {
  if (!rawData.value?.data?.length) return ''
  const cfgKeys = Object.keys(rawData.value.config)
  return Object.keys(rawData.value.data[0]).find(k => !cfgKeys.includes(k)) ?? ''
})

const seriesKeys = computed(() => Object.keys(rawData.value?.config ?? {}))

const chartConfig = computed<ChartConfig>(() => {
  if (!rawData.value) return {}
  return Object.fromEntries(
    Object.entries(rawData.value.config).map(([k, v]) => [k, { label: v.label, color: v.color }])
  )
})

const chartData = computed(() => rawData.value?.data ?? [])

const xTickFormat = computed(() => {
  const data = chartData.value
  const xk = xKey.value
  return (i: number) => {
    const d = data[Math.round(i)]
    return xk && d != null ? String(d[xk]) : ''
  }
})

const crosshairTemplate = computed(() => {
  const cfg = rawData.value?.config ?? {}
  const data = chartData.value
  const xk = xKey.value
  const keys = seriesKeys.value

  return (_item: Record<string, string | number>, x: number | Date) => {
    const idx = typeof x === 'number' ? Math.round(x) : 0
    const row = data[idx]
    if (!row) return ''

    const label = xk ? row[xk] : ''
    const items = keys.map(key => {
      const seriesLabel = cfg[key]?.label ?? key
      const val = row[key]
      const formatted = typeof val === 'number' ? val.toLocaleString() : (val ?? '')
      return `<div style="display:flex;align-items:center;gap:8px;padding:1px 0">
        <span style="display:inline-block;width:12px;height:2px;background:var(--color-${key});flex-shrink:0;border-radius:1px"></span>
        <span style="color:var(--muted-foreground)">${seriesLabel}</span>
        <span style="margin-left:auto;font-weight:600;padding-left:14px;font-variant-numeric:tabular-nums">${formatted}</span>
      </div>`
    }).join('')

    return `<div style="
      background:var(--background);
      border:1px solid var(--border);
      border-radius:8px;
      padding:8px 10px;
      font-size:11px;
      min-width:130px;
      box-shadow:0 4px 20px rgba(0,0,0,0.3);
      display:grid;
      gap:3px;
      font-family:var(--font-sans,sans-serif);
    ">
      ${label ? `<div style="font-weight:500;color:var(--foreground);margin-bottom:2px">${label}</div>` : ''}
      ${items}
    </div>`
  }
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
      <template v-else-if="!hasError && chartData.length">
        <ChartContainer :config="chartConfig" class="h-44">
          <VisXYContainer :data="chartData" :padding="{ top: 12, bottom: 0 }">
            <VisLine
              v-for="key in seriesKeys"
              :key="key"
              :x="(_d: any, i: number) => i"
              :y="(d: any) => d[key] as number"
              :color="`var(--color-${key})`"
              :line-width="2"
            />
            <VisAxis
              type="x"
              :tick-format="xTickFormat"
              :grid-line="false"
              :tick-line="false"
              :num-ticks="6"
            />
            <VisCrosshair :template="crosshairTemplate" />
            <VisTooltip :vertical-shift="24" />
          </VisXYContainer>
        </ChartContainer>
      </template>
    </CardContent>
  </Card>
</template>
