import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ============================================================
// TYPES
// ============================================================

interface OrgMembership {
  org_id: string | null
  role: string
}

interface AuthContextType {
  session: Session | null
  user: User | null
  isLoading: boolean
  orgId: string | null
  userRole: string | null
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ----------------------------------------------------------
  // Fetch org membership for the current user
  // ----------------------------------------------------------
  async function fetchOrgMembership(userId: string): Promise<OrgMembership | null> {
    try {
      console.log('fetchOrgMembership for userId:', userId)

      const { data, error } = await supabase
        .from('user_org_memberships')
        .select('org_id, role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      console.log('membership data:', data)
      console.log('membership error:', error)

      if (error) {
        console.error('Error fetching org membership:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Failed to fetch org membership:', err)
      return null
    }
  }

  // ----------------------------------------------------------
  // Create a membership row for new users (org_id = null)
  // ----------------------------------------------------------
  async function createMembershipIfNeeded(userId: string) {
    try {
      const { data: existing } = await supabase
        .from('user_org_memberships')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

      if (existing) return

      const { error } = await supabase
        .from('user_org_memberships')
        .insert({
          user_id: userId,
          role: 'owner',
          org_id: null
        })

      if (error) {
        console.error('Could not auto-create membership:', error)
      }
    } catch (err) {
      console.error('Membership creation error:', err)
    }
  }

  // ----------------------------------------------------------
  // Handle session changes
  // ----------------------------------------------------------
  async function handleSessionChange(newSession: Session | null) {
    setSession(newSession)
    setUser(newSession?.user ?? null)

    if (newSession?.user) {
      const membership = await fetchOrgMembership(newSession.user.id)
      setOrgId(membership?.org_id ?? null)
      setUserRole(membership?.role ?? null)
    } else {
      setOrgId(null)
      setUserRole(null)
    }
  }

  // ----------------------------------------------------------
  // Initialize auth listener
  // ----------------------------------------------------------
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('AUTH EVENT:', event, newSession?.user?.email)

        // Skip INITIAL_SESSION with no session — wait for SIGNED_IN instead
        if (event === 'INITIAL_SESSION' && !newSession) {
          return
        }

        // Real auth event received — cancel the timeout
        if (timeoutId) clearTimeout(timeoutId)

        // Update session and user synchronously
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          setTimeout(async () => {
            const membership = await fetchOrgMembership(newSession.user.id)
            console.log('MEMBERSHIP RESULT:', membership)
            setOrgId(membership?.org_id ?? null)
            setUserRole(membership?.role ?? null)
            setIsLoading(false)
          }, 0)
        } else {
          setOrgId(null)
          setUserRole(null)
          setIsLoading(false)
        }
      }
    )

    // Safety timeout — if no real auth event fires within 3 seconds,
    // assume no session and show login
    timeoutId = setTimeout(() => {
      console.log('AUTH TIMEOUT: No auth event received, showing login')
      setIsLoading(false)
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [])

  // ----------------------------------------------------------
  // Auth actions
  // ----------------------------------------------------------

  async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signUpWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }

    if (data.user) {
      await createMembershipIfNeeded(data.user.id)
    }

    return { error: null }
  }

  async function signInWithGoogle(): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setOrgId(null)
    setUserRole(null)
  }

  async function resetPassword(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <AuthContext.Provider value={{
      session,
      user,
      isLoading,
      orgId,
      userRole,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}