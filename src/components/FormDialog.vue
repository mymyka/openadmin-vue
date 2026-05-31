<script setup lang="ts">
import { ref, reactive } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
} from 'reka-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from '@lucide/vue'
import type { FormEndpointInfo } from '@/composables/useOpenApi'

const props = defineProps<{ form: FormEndpointInfo }>()

const open = ref(false)
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const submitSuccess = ref(false)
const formData = reactive<Record<string, unknown>>({})

function initFormData() {
  for (const key of Object.keys(formData)) delete formData[key]
  for (const field of props.form.fields) {
    formData[field.name] = field.default !== undefined
      ? field.default
      : field.type === 'boolean' ? false : ''
  }
}

function openDialog() {
  initFormData()
  submitError.value = null
  submitSuccess.value = false
  open.value = true
}

function fieldValue(name: string): string | number {
  const v = formData[name]
  if (typeof v === 'number') return v
  return String(v ?? '')
}

function setField(name: string, value: unknown) {
  formData[name] = value
}

async function submit() {
  isSubmitting.value = true
  submitError.value = null
  try {
    const res = await fetch(`/admin${props.form.path}`, {
      method: props.form.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (!res.ok) {
      let detail: string | undefined
      try {
        const body = await res.json()
        detail = typeof body?.detail === 'string' ? body.detail : undefined
      } catch {}
      throw new Error(detail ?? `HTTP ${res.status}`)
    }
    submitSuccess.value = true
    setTimeout(() => { open.value = false }, 900)
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Request failed'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Button size="sm" variant="outline" class="h-8 gap-1.5 text-xs font-medium" @click="openDialog">
    <Plus class="size-3.5" />
    {{ form.summary }}
  </Button>

  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 focus:outline-none">
        <DialogTitle class="text-sm font-semibold text-foreground">{{ form.summary }}</DialogTitle>
        <p v-if="form.description" class="text-xs text-muted-foreground mt-1 mb-5">{{ form.description }}</p>
        <div v-else class="mb-5" />

        <div class="space-y-4">
          <div v-for="field in form.fields" :key="field.name">
            <label class="text-xs font-medium text-muted-foreground mb-1.5 block">
              {{ field.title }}<span v-if="field.required" class="text-destructive ml-0.5">*</span>
            </label>

            <!-- Boolean toggle -->
            <button
              v-if="field.type === 'boolean'"
              type="button"
              role="switch"
              :aria-checked="!!formData[field.name]"
              class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="formData[field.name] ? 'bg-primary' : 'bg-input'"
              @click="setField(field.name, !formData[field.name])"
            >
              <span
                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-md ring-0 transition-transform"
                :class="formData[field.name] ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>

            <!-- Enum select -->
            <select
              v-else-if="field.enum?.length"
              :value="String(formData[field.name] ?? '')"
              class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow]"
              @change="setField(field.name, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in field.enum" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- Text / number input -->
            <Input
              v-else
              :model-value="fieldValue(field.name)"
              :type="field.type === 'integer' || field.type === 'number' ? 'number' : 'text'"
              @update:model-value="setField(field.name, $event)"
            />
          </div>
        </div>

        <p v-if="submitError" class="text-xs text-destructive mt-4 font-mono">{{ submitError }}</p>
        <p v-if="submitSuccess" class="text-xs text-green-500 mt-4">Done!</p>

        <div class="flex justify-end gap-2 mt-6">
          <DialogClose as-child>
            <Button variant="ghost" size="sm" :disabled="isSubmitting">Cancel</Button>
          </DialogClose>
          <Button size="sm" :disabled="isSubmitting || submitSuccess" @click="submit">
            {{ isSubmitting ? 'Submitting…' : 'Submit' }}
          </Button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
