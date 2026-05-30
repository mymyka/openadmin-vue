<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Skeleton } from '@/components/ui/skeleton'
import { useOpenApi } from '@/composables/useOpenApi'
import type { EndpointInfo } from '@/composables/useOpenApi'

const props = defineProps<{ endpoint: EndpointInfo }>()

const { fetchEndpoint } = useOpenApi()
const value = ref<string | number | boolean | null>(null)
const isLoading = ref(true)
const hasError = ref(false)

onMounted(async () => {
  try {
    const data = await fetchEndpoint(props.endpoint.path)
    value.value = data.value ?? null
  } catch {
    hasError.value = true
  } finally {
    isLoading.value = false
  }
})

function displayValue(v: string | number | boolean | null): string {
  if (v === null) return '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}
</script>

<template>
  <div class="rounded-lg border p-6 flex flex-col gap-3 transition-colors" :class="hasError ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'">
    <p class="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground font-mono">
      {{ endpoint.summary }}
    </p>
    <div>
      <Skeleton v-if="isLoading" class="h-9 w-28 bg-muted" />
      <p
        v-else
        class="text-[2rem] font-normal leading-none tracking-tight text-foreground font-mono"
        :class="{ 'text-destructive': hasError }"
      >
        {{ hasError ? 'Error' : displayValue(value) }}
      </p>
    </div>
    <p v-if="endpoint.description" class="text-sm text-muted-foreground leading-snug">
      {{ endpoint.description }}
    </p>
  </div>
</template>
