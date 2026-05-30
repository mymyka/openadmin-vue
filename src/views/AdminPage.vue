<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import StatCard from '@/components/StatCard.vue'
import DataTable from '@/components/DataTable.vue'
import MarkdownBlock from '@/components/MarkdownBlock.vue'
import { useOpenApi } from '@/composables/useOpenApi'

const route = useRoute()
const { getPage, loading } = useOpenApi()

const pageSlug = computed(() => route.params.pageSlug as string)
const page = computed(() => getPage(pageSlug.value))
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <!-- Header bar -->
    <header class="flex items-center gap-3 h-14 border-b border-border px-4 bg-background sticky top-0 z-10">
      <SidebarTrigger class="text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" class="h-4 bg-border" />
      <span class="text-sm font-medium text-foreground tracking-tight">
        {{ page?.title ?? pageSlug }}
      </span>
    </header>

    <!-- Page content -->
    <main class="flex-1 p-6 flex flex-col gap-8">

      <!-- Spec loading state -->
      <div v-if="loading && !page" class="text-sm text-muted-foreground font-mono">
        Loading…
      </div>

      <!-- Page not found -->
      <div v-else-if="!page" class="text-sm text-muted-foreground font-mono">
        Page not found: {{ pageSlug }}
      </div>

      <template v-else>
        <!-- Markdown blocks -->
        <MarkdownBlock
          v-for="md in page.markdowns"
          :key="md.path"
          :endpoint="md"
        />

        <!-- Stats grid -->
        <div
          v-if="page.stats.length"
          class="grid gap-4"
          :class="{
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4': page.stats.length >= 4,
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': page.stats.length === 3,
            'grid-cols-1 sm:grid-cols-2': page.stats.length === 2,
            'grid-cols-1': page.stats.length === 1,
          }"
        >
          <StatCard
            v-for="stat in page.stats"
            :key="stat.path"
            :endpoint="stat"
          />
        </div>

        <!-- Tables -->
        <div v-if="page.tables.length">
          <!-- Single table — no tabs -->
          <template v-if="page.tables.length === 1">
            <h2 class="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground font-mono mb-3">
              {{ page.tables[0].summary }}
            </h2>
            <DataTable :endpoint="page.tables[0]" />
          </template>

          <!-- Multiple tables — tabbed -->
          <Tabs v-else :key="pageSlug" :default-value="page.tables[0].itemSlug">
            <div class="flex justify-center mb-4">
              <TabsList class="bg-muted border border-border">
                <TabsTrigger
                  v-for="table in page.tables"
                  :key="table.itemSlug"
                  :value="table.itemSlug"
                  class="text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-background"
                >
                  {{ table.summary }}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent
              v-for="table in page.tables"
              :key="table.itemSlug"
              :value="table.itemSlug"
            >
              <DataTable :endpoint="table" />
            </TabsContent>
          </Tabs>
        </div>
      </template>
    </main>
  </div>
</template>
