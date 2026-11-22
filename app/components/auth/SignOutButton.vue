<script setup lang="ts">
import { ref } from 'vue'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

const { client, loggedIn } = useUserSession()
const pending = ref(false)
const failed = ref(false)

async function signOut() {
  if (!client || pending.value) return
  pending.value = true
  failed.value = false

  const signedOut = await client.signOut().then(
    ({ error }) => !error,
    () => false,
  )
  if (signedOut) {
    window.location.assign('/')
    return
  }
  failed.value = true
  pending.value = false
}
</script>

<template>
  <div v-if="loggedIn" class="flex flex-col items-start gap-2">
    <Button
      type="button"
      variant="secondary"
      :aria-disabled="pending || undefined"
      @click="signOut"
    >
      Sign out
    </Button>
    <Alert v-if="failed" variant="destructive">
      <AlertDescription>Sign out failed. You are still signed in. Try again.</AlertDescription>
    </Alert>
  </div>
</template>
