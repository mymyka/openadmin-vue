<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { marked } from 'marked'
import { Skeleton } from '@/components/ui/skeleton'
import { useOpenApi } from '@/composables/useOpenApi'
import type { EndpointInfo } from '@/composables/useOpenApi'

const props = defineProps<{ endpoint: EndpointInfo }>()

const { fetchEndpoint } = useOpenApi()
const html = ref('')
const isLoading = ref(true)

onMounted(async () => {
  try {
    const data = await fetchEndpoint(props.endpoint.path)
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    const result = marked.parse(text)
    html.value = result instanceof Promise ? await result : result
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div>
    <div v-if="isLoading" class="flex flex-col gap-2.5">
      <Skeleton class="h-4 w-3/4" />
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-5/6" />
      <Skeleton class="h-4 w-2/3" />
    </div>
    <div
      v-else
      class="admin-prose"
      v-html="html"
    />
  </div>
</template>
