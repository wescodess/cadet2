export function useDisplayName() {
    const { user } = useUserSession()

    const displayName = computed(() => {
        const candidate = user.value?.name?.trim()
        if (candidate) {
            return candidate
        }
        return user.value?.email?.trim() || 'Workspace user'
    })

    const firstName = computed(() => {
        const name = user.value?.name?.trim()
        if (name) {
            return name.split(/\s+/)[0] || 'there'
        }
        return user.value?.email?.split('@')[0] || 'there'
    })

    const initials = computed(() => {
        const source = displayName.value
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join('')

        return source || 'WU'
    })

    return { displayName, firstName, initials }
}
