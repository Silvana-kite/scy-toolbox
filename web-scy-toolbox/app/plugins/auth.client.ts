export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  await auth.loadSession()
  if (auth.user) await usePersonalTools().flushPendingUses()
})
