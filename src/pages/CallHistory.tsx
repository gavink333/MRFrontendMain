import { useState, useEffect } from 'react'
import { Search, ChevronDown, ChevronUp, Phone, Clock, Play, X, Calendar, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatDuration, formatDateTime } from '@/lib/utils'
import { useAssistant } from '@/context/AssistantContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

// ============================================================
// TYPES
// ============================================================

interface CallLog {
  id: string
  call_id: string
  call_started_at: string
  call_ended_at: string | null
  caller_number: string | null
  inbound_number: string | null
  duration_seconds: number | null
  tools_called: any[] | null
  end_reason: string | null
  transcript: string | null
  transcript_summary: string | null
  recording_url: string | null
  cost: number | null
}

const endReasonOptions = [
  { value: 'all', label: 'All' },
  { value: 'customer-ended-call', label: 'Customer Ended' },
  { value: 'assistant-ended-call', label: 'Assistant Ended' },
  { value: 'other', label: 'Other' },
]

// ============================================================
// HELPERS
// ============================================================

function formatPhone(number: string | null): string {
  if (!number) return 'Unknown'
  if (number.includes('(')) return number
  const digits = number.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return number
}

function getToolNames(toolsCalled: any[] | null): string[] {
  if (!toolsCalled || !Array.isArray(toolsCalled)) return []
  return toolsCalled.map((t: any) => {
    if (typeof t === 'string') return t
    if (t?.tool) return t.tool
    if (t?.name) return t.name
    return 'unknown'
  }).filter(Boolean)
}

// ============================================================
// COMPONENT
// ============================================================

const GATEKEEPER_URL = 'https://vapiserverurl-497754777228.northamerica-northeast2.run.app'

function RecordingPlayer({ gcsPath }: { gcsPath: string }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecording = async () => {
    // If it's already a full URL (old Vapi recordings), use directly
    if (gcsPath.startsWith('http')) {
      setAudioUrl(gcsPath)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const resp = await fetch(`${GATEKEEPER_URL}/get-recording-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ gcs_path: gcsPath })
      })

      if (!resp.ok) {
        setError('Failed to load recording')
        return
      }

      const data = await resp.json()
      setAudioUrl(data.url)
    } catch (err) {
      setError('Failed to load recording')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecording()
  }, [gcsPath])

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading recording...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
        <span className="text-sm text-red-500">{error}</span>
      </div>
    )
  }

  if (audioUrl) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <audio controls className="w-full">
          <source src={audioUrl} />
          Your browser does not support audio playback.
        </audio>
      </div>
    )
  }

  return null
}


function CallSummary({ callId, existingSummary }: { callId: string; existingSummary: string | null }) {
  const [summary, setSummary] = useState<string | null>(existingSummary)
  const [isLoading, setIsLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (existingSummary || fetched) return

    async function fetchSummary() {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const resp = await fetch(`${GATEKEEPER_URL}/get-call-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ call_id: callId })
        })

        if (resp.ok) {
          const data = await resp.json()
          if (data.summary) {
            setSummary(data.summary)
          }
        }
      } catch (err) {
        console.error('Failed to fetch summary:', err)
      } finally {
        setIsLoading(false)
        setFetched(true)
      }
    }

    fetchSummary()
  }, [callId, existingSummary, fetched])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 bg-white p-4 rounded-lg border border-gray-200">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading summary...</span>
      </div>
    )
  }

  return (
    <p className="text-sm text-gray-600 bg-white p-4 rounded-lg border border-gray-200">
      {summary || 'Summary not available'}
    </p>
  )
}



export default function CallHistory() {
  const [calls, setCalls] = useState<CallLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endReasonFilter, setEndReasonFilter] = useState('all')

  // Expansion and pagination
  const [expandedCall, setExpandedCall] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const callsPerPage = 25

  const { selectedAssistant } = useAssistant()
  const { orgId } = useAuth()

  // ----------------------------------------------------------
  // Fetch calls from Supabase
  // ----------------------------------------------------------
  useEffect(() => {
    if (!orgId || !selectedAssistant) return

    async function fetchCalls() {
      setIsLoading(true)
      const assistantId = selectedAssistant!.assistant_id

      try {
        let query = supabase
          .from('call_logs')
          .select('*', { count: 'exact' })
          .eq('org_id', orgId!)
          .eq('assistant_id', assistantId)
          .order('call_started_at', { ascending: false, nullsFirst: false })

        // Apply date filters
        if (startDate) {
          query = query.gte('call_started_at', new Date(startDate).toISOString())
        }
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59)
          query = query.lte('call_started_at', end.toISOString())
        }

        // Apply end reason filter
        if (endReasonFilter !== 'all') {
          query = query.eq('end_reason', endReasonFilter)
        }

        // Apply phone number search
        if (searchQuery) {
          const cleanSearch = searchQuery.replace(/\D/g, '')
          if (cleanSearch) {
            query = query.ilike('caller_number', `%${cleanSearch}%`)
          }
        }

        // Pagination
        const from = (currentPage - 1) * callsPerPage
        const to = from + callsPerPage - 1
        query = query.range(from, to)

        const { data, error, count } = await query

        if (error) {
          console.error('Error fetching call logs:', error)
          setCalls([])
          setTotalCount(0)
        } else {
          setCalls(data || [])
          setTotalCount(count || 0)
        }
      } catch (err) {
        console.error('Failed to fetch call logs:', err)
        setCalls([])
      } finally {
        setIsLoading(false)
      }
    }

    setTimeout(() => { fetchCalls() }, 0)
  }, [orgId, selectedAssistant, searchQuery, startDate, endDate, endReasonFilter, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, startDate, endDate, endReasonFilter])

  const toggleExpand = (callId: string) => {
    setExpandedCall(expandedCall === callId ? null : callId)
  }

  const totalPages = Math.ceil(totalCount / callsPerPage)

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
        <p className="text-gray-500 mt-1">View and search all calls handled by your receptionist</p>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by phone number..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Date Range */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                  className="pl-10 w-40"
                />
              </div>
              <span className="text-gray-400">to</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                  className="pl-10 w-40"
                />
              </div>
            </div>
            
            {/* End Reason Filter */}
            <div className="relative min-w-[180px]">
              <select
                value={endReasonFilter}
                onChange={(e) => setEndReasonFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {endReasonOptions.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            </div>
            
            {/* Clear Filters */}
            {(searchQuery || startDate || endDate || endReasonFilter !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery('')
                  setStartDate('')
                  setEndDate('')
                  setEndReasonFilter('all')
                }}
                className="border-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading call history...</span>
          </div>
        </div>
      ) : calls.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12">
          <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No calls found</h3>
          <p className="text-gray-500">
            {searchQuery || startDate || endDate || endReasonFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Calls will appear here once your receptionist handles its first call'}
          </p>
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="mb-4 text-sm text-gray-500">
            Showing {((currentPage - 1) * callsPerPage) + 1}–{Math.min(currentPage * callsPerPage, totalCount)} of {totalCount} calls
          </div>

          {/* Call Log Table */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Date/Time</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Caller</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Duration</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">Tools Used</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4">End Reason</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calls.map((call) => {
                      const toolNames = getToolNames(call.tools_called)
                      const callKey = call.call_id || call.id

                      return (
                        <>
                          <tr 
                            key={callKey} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleExpand(callKey)}
                          >
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {call.call_started_at ? formatDateTime(call.call_started_at) : '—'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {formatPhone(call.caller_number)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                {call.duration_seconds != null ? formatDuration(call.duration_seconds) : '—'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <div className="flex flex-wrap gap-1">
                                {toolNames.length > 0 ? toolNames.map((tool, i) => (
                                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    {tool}
                                  </span>
                                )) : (
                                  <span className="text-gray-400 text-xs">No tools</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {call.end_reason ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  call.end_reason === 'customer-ended-call' ? 'bg-green-100 text-green-800' :
                                  call.end_reason === 'assistant-ended-call' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {call.end_reason.replace(/-/g, ' ')}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {expandedCall === callKey ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </td>
                          </tr>
                          {expandedCall === callKey && (
                            <tr key={`${callKey}-expanded`}>
                              <td colSpan={6} className="bg-gray-50 px-6 py-6">
                                <div className="max-w-4xl">
                                  {/* Summary */}
                                  <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
                                    <CallSummary callId={call.call_id || call.id} existingSummary={call.transcript_summary} />
                                  </div>

                                  {/* Transcript */}
                                  <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Transcript</h4>
                                    {call.transcript ? (
                                      <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-600 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                                        {call.transcript}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 bg-white p-4 rounded-lg border border-gray-200">
                                        Transcripts are not enabled for this assistant. Contact support to enable.
                                      </p>
                                    )}
                                  </div>

                                  {/* Recording */}
                                  <div className="mb-6">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recording</h4>
                                    {call.recording_url ? (
                                      <RecordingPlayer gcsPath={call.recording_url} />
                                    ) : (
                                      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200 opacity-50">
                                        <button className="w-10 h-10 rounded-full bg-gray-300 text-white flex items-center justify-center cursor-not-allowed">
                                          <Play className="w-4 h-4 ml-0.5" />
                                        </button>
                                        <span className="text-sm text-gray-500">Recording not available</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Call Metadata */}
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Call Metadata</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg border border-gray-200">
                                      <div>
                                        <p className="text-xs text-gray-500">Call ID</p>
                                        <p className="text-sm text-gray-900 font-mono truncate">{call.call_id || call.id}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Start Time</p>
                                        <p className="text-sm text-gray-900">{call.call_started_at ? formatDateTime(call.call_started_at) : '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">End Time</p>
                                        <p className="text-sm text-gray-900">{call.call_ended_at ? formatDateTime(call.call_ended_at) : '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500">Inbound Number</p>
                                        <p className="text-sm text-gray-900">{formatPhone(call.inbound_number)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-gray-300"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-300"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

