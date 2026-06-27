'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { profile, User } from '@/lib/api'

interface UserContextValue {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  refresh: async () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      // api() auto-redirects to /login on 401, so we only swallow other errors.
      setUser(await profile.get())
    } catch {
      /* keep last known user; api() handles auth failures */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <UserContext.Provider value={{ user, loading, refresh }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
