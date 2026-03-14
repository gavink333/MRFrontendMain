import { useState, useEffect } from 'react'
import { 
  Phone, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp,
  XCircle,
  ChevronDown,
  Loader2
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAssistant } from '@/context/AssistantContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

// ============================================================
// TYPES
// ============================================================

interface DashboardData {
  // KPI cards
  totalCalls: number
  totalBookings: number
  activeBookings: number
  cancelledBookings: number
  bookingConversionRate: number
  totalCallMinutes: number
  cancellationRate: number
  avgCallDurationSeconds: number
  uniqueCallers: number
  afterHoursBookings: number
  afterHoursPercentage: number

  // Charts
  callVolumeDaily: { date: string; calls: number }[]
  bookingsDaily: { date: string; active: number; cancelled: number }[]
  callsByHour: { hour: string; calls: number }[]
  callsByDay: { day: string; calls: number }[]

  // Widgets
  newVsRepeat: { name: string; value: number; color: string }[]
  callEndReasons: { name: string; value: number; color: string }[]
  topCallers: { rank: number; phone: string; totalCalls: number; totalMinutes: number }[]

  // Activity feed
  recentActivity: { id: string; type: string; message: string; time: string }[]
}

// ============================================================
// HELPERS
// ============================================================

function generateMonthOptions(): { value: string; label: string }[] {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    })
  }
  return months
}

function getMonthRange(monthStr: string): { start: string; end: string } {
  const [year, month] = monthStr.split('-').map(Number)
  const start = new Date(year, month - 1, 1).toISOString()
  const end = new Date(year, month, 0, 23, 59, 59).toISOString()
  return { start, end }
}

function formatPhone(number: string): string {
  if (!number) return 'Unknown'
  if (number.includes('(')) return number
  const digits = number.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return number
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_LABELS = [
  '6 AM','7 AM','8 AM','9 AM','10 AM','11 AM',
  '12 PM','1 PM','2 PM','3 PM','4 PM','5 PM',
  '6 PM','7 PM','8 PM','9 PM'
]

// ============================================================
// COMPONENT
// ============================================================

export default function Dashboard() {
  const months = generateMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(months[0].value)
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { selectedAssistant } = useAssistant()
  const { orgId } = useAuth()

  // ----------------------------------------------------------
  // Fetch all dashboard data when month or assistant changes
  // ----------------------------------------------------------
  useEffect(() => {
    if (!orgId || !selectedAssistant) return

    async function fetchDashboardData() {
      setIsLoading(true)
      const assistantId = selectedAssistant!.assistant_id
      const { start, end } = getMonthRange(selectedMonth)

      try {
        // ---- PARALLEL FETCH: All queries at once ----
        const [
          callLogsResult,
          bookingsResult,
          allBookingsResult,
          callsByHourResult,
          callsByDayResult,
          newVsRepeatResult,
          callEndReasonsResult,
          topCallersResult,
          afterHoursResult,
          recentCallsResult,
          recentBookingsResult,
        ] = await Promise.all([
          // Call logs for this month + assistant
          supabase
            .from('call_logs')
            .select('call_started_at, duration_seconds, caller_number, end_reason, tools_called')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId)
            .gte('call_started_at', start)
            .lte('call_started_at', end),

          // Active bookings this month
          supabase
            .from('booked_events')
            .select('event_start, event_title, cancelled_at, caller_id_number')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId)
            .gte('event_start', start)
            .lte('event_start', end),

          // All bookings (including cancelled) for cancellation rate
          supabase
            .from('booked_events')
            .select('event_start, cancelled_at')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId)
            .gte('event_start', start)
            .lte('event_start', end),

          // Calls by hour (KPI view)
          supabase
            .from('kpi_calls_by_hour')
            .select('hour_of_day, total_calls')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId),

          // Calls by day of week (KPI view)
          supabase
            .from('kpi_calls_by_day_of_week')
            .select('day_of_week, day_name, total_calls')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId),

          // New vs repeat callers (KPI view) for selected month
          supabase
            .from('kpi_new_vs_repeat_callers')
            .select('new_callers, repeat_callers')
            .eq('org_id', orgId!)
            .eq('month', `${selectedMonth}-01`),

          // Call end reasons (KPI view)
          supabase
            .from('kpi_call_end_reasons')
            .select('end_reason, total, percentage')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId),

          // Top callers (KPI view)
          supabase
            .from('kpi_top_callers')
            .select('caller_number, total_calls, total_minutes')
            .eq('org_id', orgId!)
            .order('total_calls', { ascending: false })
            .limit(5),

          // After hours bookings (KPI view) for selected month
          supabase
            .from('kpi_after_hours_bookings')
            .select('after_hours_bookings, after_hours_pct, total_bot_bookings')
            .eq('org_id', orgId!)
            .eq('month', `${selectedMonth}-01`),

          // Recent calls (last 10)
          supabase
            .from('call_logs')
            .select('call_started_at, caller_number, duration_seconds')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId)
            .order('call_started_at', { ascending: false })
            .limit(10),

          // Recent bookings (last 10)
          supabase
            .from('booked_events')
            .select('event_start, event_title, cancelled_at, created_at')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId)
            .order('created_at', { ascending: false })
            .limit(10),
        ])

        // ---- PROCESS CALL LOGS ----
        const calls = callLogsResult.data || []
        const totalCalls = calls.length
        const totalSeconds = calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0)
        const totalCallMinutes = Math.round((totalSeconds / 60) * 10) / 10
        const avgCallDurationSeconds = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0
        const uniqueCallers = new Set(calls.map(c => c.caller_number).filter(Boolean)).size

        // ---- PROCESS BOOKINGS ----
        const allBookings = allBookingsResult.data || []
        const totalBookings = allBookings.length
        const cancelledBookings = allBookings.filter(b => b.cancelled_at).length
        const activeBookings = totalBookings - cancelledBookings
        const cancellationRate = totalBookings > 0 ? Math.round((cancelledBookings / totalBookings) * 1000) / 10 : 0

        // Calls with bookings (for conversion rate)
        const callsWithBookings = calls.filter(c => {
          const tools = c.tools_called
          if (Array.isArray(tools)) {
            return tools.some((t: any) => {
              const toolName = typeof t === 'string' ? t : t?.tool
              return toolName === 'book_appointment'
            })
          }
          return false
        }).length
        const bookingConversionRate = totalCalls > 0 ? Math.round((callsWithBookings / totalCalls) * 1000) / 10 : 0

        // ---- PROCESS CALL VOLUME DAILY ----
        const callsByDate: Record<string, number> = {}
        calls.forEach(c => {
          if (c.call_started_at) {
            const date = c.call_started_at.split('T')[0]
            callsByDate[date] = (callsByDate[date] || 0) + 1
          }
        })
        // Fill in all days of the month
        const [year, month] = selectedMonth.split('-').map(Number)
        const daysInMonth = new Date(year, month, 0).getDate()
        const callVolumeDaily = Array.from({ length: daysInMonth }, (_, i) => {
          const date = `${selectedMonth}-${String(i + 1).padStart(2, '0')}`
          return { date, calls: callsByDate[date] || 0 }
        })

        // ---- PROCESS BOOKINGS DAILY ----
        const bookingsByDate: Record<string, { active: number; cancelled: number }> = {}
        allBookings.forEach(b => {
          if (b.event_start) {
            const date = b.event_start.split('T')[0]
            if (!bookingsByDate[date]) bookingsByDate[date] = { active: 0, cancelled: 0 }
            if (b.cancelled_at) {
              bookingsByDate[date].cancelled++
            } else {
              bookingsByDate[date].active++
            }
          }
        })
        const bookingsDaily = Array.from({ length: daysInMonth }, (_, i) => {
          const date = `${selectedMonth}-${String(i + 1).padStart(2, '0')}`
          return {
            date,
            active: bookingsByDate[date]?.active || 0,
            cancelled: bookingsByDate[date]?.cancelled || 0
          }
        })

        // ---- PROCESS CALLS BY HOUR ----
        const hourData = callsByHourResult.data || []
        const callsByHour = HOUR_LABELS.map((label, i) => {
          const hourNum = i + 6 // 6 AM = index 0
          const found = hourData.find((h: any) => h.hour_of_day === hourNum)
          return { hour: label, calls: found ? Number(found.total_calls) : 0 }
        })

        // ---- PROCESS CALLS BY DAY OF WEEK ----
        const dayData = callsByDayResult.data || []
        const callsByDay = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, i) => {
          // PostgreSQL day_of_week: 0=Sun, 1=Mon, ..., 6=Sat
          // We want Mon=1, Tue=2, ..., Sun=0
          const pgDay = i === 6 ? 0 : i + 1
          const found = dayData.find((d: any) => d.day_of_week === pgDay)
          return { day: dayName, calls: found ? Number(found.total_calls) : 0 }
        })

        // ---- PROCESS NEW VS REPEAT ----
        const nvrData = newVsRepeatResult.data?.[0]
        const newCallers = Number(nvrData?.new_callers || 0)
        const repeatCallers = Number(nvrData?.repeat_callers || 0)
        const totalNvr = newCallers + repeatCallers
        const newVsRepeat = totalNvr > 0 ? [
          { name: 'New Callers', value: Math.round((newCallers / totalNvr) * 100), color: '#8B5CF6' },
          { name: 'Repeat Callers', value: Math.round((repeatCallers / totalNvr) * 100), color: '#3B82F6' },
        ] : [
          { name: 'New Callers', value: 0, color: '#8B5CF6' },
          { name: 'Repeat Callers', value: 0, color: '#3B82F6' },
        ]

        // ---- PROCESS CALL END REASONS ----
        const endReasonData = callEndReasonsResult.data || []
        const endReasonColors: Record<string, string> = {
          'customer-ended-call': '#22C55E',
          'assistant-ended-call': '#F59E0B',
        }
        const callEndReasons = endReasonData.map((r: any) => ({
          name: r.end_reason === 'customer-ended-call' ? 'Customer Ended' :
                r.end_reason === 'assistant-ended-call' ? 'Assistant Ended' :
                r.end_reason || 'Other',
          value: Number(r.percentage || 0),
          color: endReasonColors[r.end_reason] || '#6B7280'
        }))

        // ---- PROCESS TOP CALLERS ----
        const topCallers = (topCallersResult.data || []).map((c: any, i: number) => ({
          rank: i + 1,
          phone: formatPhone(c.caller_number || 'Unknown'),
          totalCalls: Number(c.total_calls || 0),
          totalMinutes: Math.round(Number(c.total_minutes || 0))
        }))

        // ---- PROCESS AFTER HOURS ----
        const ahData = afterHoursResult.data?.[0]
        const afterHoursBookings = Number(ahData?.after_hours_bookings || 0)
        const afterHoursPercentage = Math.round(Number(ahData?.after_hours_pct || 0))

        // ---- PROCESS RECENT ACTIVITY ----
        const recentCalls = (recentCallsResult.data || []).map((c: any) => ({
          id: `call-${c.call_started_at}`,
          type: 'call',
          message: `Call from ${formatPhone(c.caller_number || 'Unknown')} — ${Math.floor((c.duration_seconds || 0) / 60)}m ${(c.duration_seconds || 0) % 60}s`,
          time: timeAgo(c.call_started_at),
          sortDate: c.call_started_at
        }))

        const recentBookingsList = (recentBookingsResult.data || []).map((b: any) => ({
          id: `booking-${b.created_at}`,
          type: b.cancelled_at ? 'cancellation' : 'booking',
          message: b.cancelled_at
            ? `Appointment cancelled: ${b.event_title || 'Untitled'}`
            : `Appointment booked: ${b.event_title || 'Untitled'} on ${new Date(b.event_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${new Date(b.event_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
          time: timeAgo(b.created_at),
          sortDate: b.created_at
        }))

        // Merge and sort by date
        const recentActivity = [...recentCalls, ...recentBookingsList]
          .sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime())
          .slice(0, 10)
          .map(({ sortDate, ...rest }) => rest)

        // ---- SET STATE ----
        setData({
          totalCalls,
          totalBookings,
          activeBookings,
          cancelledBookings,
          bookingConversionRate,
          totalCallMinutes,
          cancellationRate,
          avgCallDurationSeconds,
          uniqueCallers,
          afterHoursBookings,
          afterHoursPercentage,
          callVolumeDaily,
          bookingsDaily,
          callsByHour,
          callsByDay,
          newVsRepeat,
          callEndReasons,
          topCallers,
          recentActivity,
        })

      } catch (err) {
        console.error('Dashboard data fetch error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    setTimeout(() => { fetchDashboardData() }, 0)
  }, [selectedMonth, selectedAssistant, orgId])

  // ----------------------------------------------------------
  // RENDER HELPERS
  // ----------------------------------------------------------

  const formatDurationDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  // ----------------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------------

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading dashboard data...</span>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------
  // KPI DEFINITIONS
  // ----------------------------------------------------------

  const primaryKPIs = [
    { label: 'Total Calls', value: data.totalCalls, icon: Phone },
    { label: 'Appointments Booked', value: `${data.activeBookings} active`, icon: Calendar, subValue: `of ${data.totalBookings} total` },
    { label: 'Booking Conversion', value: `${data.bookingConversionRate}%`, icon: TrendingUp },
  ]

  const secondaryKPIs = [
    { label: 'Total Call Minutes', value: `${data.totalCallMinutes} min`, icon: Clock },
    { label: 'Cancellation Rate', value: `${data.cancellationRate}%`, icon: XCircle },
    { label: 'Avg Call Duration', value: formatDurationDisplay(data.avgCallDurationSeconds), icon: Clock },
    { label: 'Unique Callers', value: data.uniqueCallers, icon: Users },
  ]

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your receptionist performance</p>
        </div>
        
        {/* Month Selector */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* After-Hours Bookings Card */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">After-Hours Bookings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{data.afterHoursBookings}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.afterHoursPercentage}% of total
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary KPI Cards */}
        {primaryKPIs.map((kpi, index) => (
          <Card key={index} className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  {kpi.subValue && (
                    <p className="text-xs text-gray-400 mt-0.5">{kpi.subValue}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <kpi.icon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary KPI Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {secondaryKPIs.map((kpi, index) => (
          <Card key={index} className="border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <kpi.icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Call Volume Chart */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Call Volume Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.callVolumeDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bookings Chart */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Bookings Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.bookingsDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="active" name="Active" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Calls by Hour */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Calls by Hour of Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.callsByHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
                <Bar dataKey="calls" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Calls by Day */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Calls by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.callsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                />
                <Bar dataKey="calls" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 - Donuts and Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* New vs Repeat */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">New vs Repeat Callers</CardTitle>
          </CardHeader>
          <CardContent>
            {data.newVsRepeat[0].value === 0 && data.newVsRepeat[1].value === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
                No caller data for this month
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.newVsRepeat}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.newVsRepeat.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  {data.newVsRepeat.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name} ({item.value}%)</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center mt-3">
                  Repeat callers indicate trust in your AI receptionist
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Call End Reasons */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Call End Reasons</CardTitle>
          </CardHeader>
          <CardContent>
            {data.callEndReasons.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
                No call data for this month
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.callEndReasons}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.callEndReasons.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  {data.callEndReasons.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name} ({item.value}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Callers */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Top Callers</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCallers.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                No caller data yet
              </div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Rank</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Phone</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Calls</th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Minutes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.topCallers.map((caller) => (
                      <tr key={caller.rank}>
                        <td className="py-3 text-sm text-gray-900 font-medium">#{caller.rank}</td>
                        <td className="py-3 text-sm text-gray-900">{caller.phone}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">{caller.totalCalls}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">{caller.totalMinutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              No recent activity — calls and bookings will appear here
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'booking' ? 'bg-green-100' :
                    activity.type === 'cancellation' ? 'bg-red-100' : 'bg-purple-100'
                  }`}>
                    {activity.type === 'booking' && <Calendar className="w-4 h-4 text-green-600" />}
                    {activity.type === 'cancellation' && <XCircle className="w-4 h-4 text-red-600" />}
                    {activity.type === 'call' && <Phone className="w-4 h-4 text-purple-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}