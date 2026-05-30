<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter, useRoute, RouterView } from 'vue-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar'
import { useOpenApi } from '@/composables/useOpenApi'

const { loadSpec, sections, allPages } = useOpenApi()
const router = useRouter()
const route = useRoute()

const currentSlug = computed(() => route.params.pageSlug as string | undefined)

onMounted(async () => {
  await loadSpec()
  if (route.path === '/' && allPages.value.length) {
    router.replace(`/${allPages.value[0].slug}`)
  }
})

function navigate(slug: string) {
  router.push(`/${slug}`)
}
</script>

<template>
  <SidebarProvider>
    <Sidebar collapsible="icon">
      <SidebarHeader class="px-4 py-4 border-b border-sidebar-border">
        <div class="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" class="shrink-0">
            <path
              d="M9 1v16M1 9h16M2.636 2.636l12.728 12.728M15.364 2.636 2.636 15.364"
              stroke="#00d992"
              stroke-width="1.75"
              stroke-linecap="round"
            />
          </svg>
          <span class="text-base font-semibold text-sidebar-primary-foreground tracking-tight">
            OpenAdmin
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <template v-for="section in sections" :key="section.title ?? '__default'">
          <SidebarGroup>
            <SidebarGroupLabel v-if="section.title">
              {{ section.title }}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem v-for="page in section.pages" :key="page.slug">
                  <SidebarMenuButton
                    :is-active="currentSlug === page.slug"
                    class="cursor-pointer"
                    @click="navigate(page.slug)"
                  >
                    <span>{{ page.title }}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </template>
      </SidebarContent>
    </Sidebar>

    <SidebarInset>
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.path" />
        </Transition>
      </RouterView>
    </SidebarInset>
  </SidebarProvider>
</template>
