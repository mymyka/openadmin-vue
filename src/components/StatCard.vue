<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
  <Card class="bg-card border-border">
    <CardHeader class="pb-2 pt-5 px-5">
      <p class="text-[12.5px] font-medium tracking-[0.12em] uppercase text-muted-foreground">
        {{ endpoint.summary }}
      </p>
    </CardHeader>
    <CardContent class="px-5 pb-5">
      <Skeleton v-if="isLoading" class="h-9 w-28" />
      <p
        v-else
        class="text-[2rem] font-normal leading-none tracking-tight text-foreground"
        :class="{ 'text-destructive': hasError }"
      >
        {{ hasError ? 'Error' : displayValue(value) }}
      </p>
      <p v-if="endpoint.description" class="mt-1.5 text-sm text-muted-foreground leading-snug">
        {{ endpoint.description }}
      </p>
    </CardContent>
  </Card>
</template>
