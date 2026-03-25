<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { recommendationReviewTestIds } from '@/lib/admin/recommendationReviews'

defineProps<{
  description: string
  open: boolean
  pending?: boolean
  confirmLabel: string
  title: string
}>()

defineEmits<{
  (event: 'cancel'): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <AlertDialog :open="open">
    <AlertDialogContent :data-testid="recommendationReviewTestIds.confirmationDialog">
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="$emit('cancel')">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction :disabled="pending" @click="$emit('confirm')">
          {{ pending ? 'Working…' : confirmLabel }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
