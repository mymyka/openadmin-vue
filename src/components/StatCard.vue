<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Skeleton } from '@/components/ui/skeleton'
import { useOpenApi } from '@/composables/useOpenApi'
import type { EndpointInfo } from '@/composables/useOpenApi'

const props = defineProps<{ endpoint: EndpointInfo; refreshToken?: number }>()

const { fetchEndpoint } = useOpenApi()
const value = ref<string | number | boolean | null>(null)
const isLoading = ref(true)
const isFirstLoad = ref(true)
const hasError = ref(false)
const errorMessage = ref<string | null>(null)

async function load() {
  isLoading.value = true
  hasError.value = false
  try {
    const data = await fetchEndpoint(props.endpoint.path)
    value.value = data.value ?? null
  } catch (e) {
    hasError.value = true
    errorMessage.value = e instanceof Error ? e.message : null
  } finally {
    isLoading.value = false
    isFirstLoad.value = false
  }
}

onMounted(load)
watch(() => props.refreshToken, (v, prev) => { if (v !== prev) load() })

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
      <Skeleton v-if="isLoading && isFirstLoad" class="h-9 w-28 bg-muted" />
      <p
        v-else-if="!hasError"
        class="text-[2rem] font-normal leading-none tracking-tight text-foreground font-mono transition-opacity duration-200"
        :class="isLoading ? 'opacity-40' : 'opacity-100'"
      >
        {{ displayValue(value) }}
      </p>
      <p v-else-if="errorMessage" class="text-xs text-destructive/80 mt-1 font-mono">
        {{ errorMessage }}
      </p>
    </div>
    <p v-if="endpoint.description" class="text-sm text-muted-foreground leading-snug">
      {{ endpoint.description }}
    </p>
  </div>
</template>
