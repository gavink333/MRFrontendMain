import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

// ============================================================
// TYPES — matches your actual database schema
// ============================================================

export interface Assistant {
  // From assistant_config
  assistant_id: string
  assistant_name: string | null
  inbound_number: string
  is_active: boolean
  block_list: string[] | null
  call_logging_enabled: boolean
  transcripts_enabled: boolean
  summary_enabled: boolean
  org_id: string

  // From org_assistant_pricing_tiers (joined)
  tier_name: string | null
  billing_unit_time: string | null

  // Computed stats (from call_logs and booked_events)
  totalCallsThisMonth: number
  totalBookingsThisMonth: number
}

interface AssistantContextType {
  assistants: Assistant[]
  selectedAssistant: Assistant | null
  setSelectedAssistant: (assistant: Assistant | null) => void
  isLoadingAssistants: boolean
  refreshAssistants: () => Promise<void>
}

// ============================================================
// CONTEXT
// ============================================================

const AssistantContext = createContext<AssistantContextType | undefined>(undefined)

// ============================================================
// PROVIDER
// ============================================================

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [selectedAssistant, setSelectedAssistantState] = useState<Assistant | null>(null)
  const [isLoadingAssistants, setIsLoadingAssistants] = useState(false)

  const { orgId, user } = useAuth()

  // Wrapper that also persists to localStorage
  const setSelectedAssistant = (assistant: Assistant | null) => {
    setSelectedAssistantState(assistant)
    if (assistant) {
      localStorage.setItem('selectedAssistantId', assistant.assistant_id)
    } else {
      localStorage.removeItem('selectedAssistantId')
    }
  }

  // ----------------------------------------------------------
  // Fetch assistants when org is available
  // ----------------------------------------------------------
  async function fetchAssistants() {
    if (!orgId || !user) return

    setIsLoadingAssistants(true)
    // console.log('Fetching assistants for org:', orgId)

    try {
      // 1. Fetch assistant configs for this org
      const { data: assistantData, error: assistantError } = await supabase
        .from('assistant_config')
        .select('*')
        .eq('org_id', orgId)

      if (assistantError) {
        console.error('Error fetching assistants:', assistantError)
        setIsLoadingAssistants(false)
        return
      }

      if (!assistantData || assistantData.length === 0) {
        // console.log('No assistants found for org:', orgId)
        setAssistants([])
        setIsLoadingAssistants(false)
        return
      }

      // console.log('Found assistants:', assistantData.length)

      // 2. Fetch pricing tiers for this org
      const { data: tierData } = await supabase
        .from('org_assistant_pricing_tiers')
        .select('assistant_id, tier_name, billing_unit_time')
        .eq('org_id', orgId)
        .eq('is_active', true)

      // 3. Fetch this month's call counts per assistant
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { data: callCounts } = await supabase
        .from('call_logs')
        .select('assistant_id')
        .eq('org_id', orgId)
        .gte('call_started_at', monthStart)

      // 4. Fetch this month's booking counts per assistant
      const { data: bookingCounts } = await supabase
        .from('booked_events')
        .select('assistant_id')
        .eq('org_id', orgId)
        .is('cancelled_at', null)
        .gte('event_start', monthStart)

      // 5. Build the assistant objects
      const enrichedAssistants: Assistant[] = assistantData.map((a: any) => {
        const assistantTier = tierData?.find((t: any) => t.assistant_id === a.assistant_id)
        const orgTier = tierData?.find((t: any) => t.assistant_id === null)
        const tier = assistantTier || orgTier

        const callCount = callCounts?.filter((c: any) => c.assistant_id === a.assistant_id).length || 0
        const bookingCount = bookingCounts?.filter((b: any) => b.assistant_id === a.assistant_id).length || 0

        return {
          assistant_id: a.assistant_id,
          assistant_name: a.assistant_name,
          inbound_number: a.inbound_number,
          is_active: a.is_active,
          block_list: a.block_list,
          call_logging_enabled: a.call_logging_enabled,
          transcripts_enabled: a.transcripts_enabled,
          summary_enabled: a.summary_enabled,
          org_id: a.org_id,
          tier_name: tier?.tier_name || null,
          billing_unit_time: tier?.billing_unit_time || null,
          totalCallsThisMonth: callCount,
          totalBookingsThisMonth: bookingCount,
        }
      })

      // console.log('Enriched assistants:', enrichedAssistants)
      setAssistants(enrichedAssistants)

      // Restore previously selected assistant from localStorage, or default to first
      const savedId = localStorage.getItem('selectedAssistantId')
      const restored = savedId ? enrichedAssistants.find(a => a.assistant_id === savedId) : null
      setSelectedAssistantState(restored || enrichedAssistants[0])

    } catch (err) {
      console.error('Failed to fetch assistants:', err)
    } finally {
      setIsLoadingAssistants(false)
    }
  }

  // Refetch when orgId changes
  useEffect(() => {
    if (orgId) {
      setTimeout(() => {
        fetchAssistants()
      }, 0)
    }
  }, [orgId])

  return (
    <AssistantContext.Provider value={{
      assistants,
      selectedAssistant,
      setSelectedAssistant,
      isLoadingAssistants,
      refreshAssistants: fetchAssistants,
    }}>
      {children}
    </AssistantContext.Provider>
  )
}

// ============================================================
// HOOK
// ============================================================

export function useAssistant() {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider')
  }
  return context
}