import { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar, Settings, BarChart3, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAssistant } from '@/context/AssistantContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

// ============================================================
// TYPES
// ============================================================

interface CalendarConfig {
  calendar_id: string
  calendar_provider: string
  is_active: boolean
  front_overhang_mins: number
  back_overhang_mins: number
  min_event_duration_mins: number
  max_event_duration_mins: number
  default_event_duration_mins: number
  max_bookings_per_caller: number
  min_booking_lead_time_hours: number
  max_booking_lead_time_days: number
  min_cancellation_lead_time_hours: number
  event_metadata_visible: boolean
  respect_transparent_events: boolean
  event_match_window_mins: number
}

interface Shift {
  open_time: string
  close_time: string
}

interface ScheduleOverride {
  id: number
  override_date: string
  is_closed: boolean
  open_time: string | null
  close_time: string | null
  reason: string | null
  is_active: boolean
}

interface CalendarLink {
  assistant_id: string
  calendar_id: string
  is_authorized: boolean
}

// ============================================================
// CONSTANTS
// ============================================================

const days = [0, 1, 2, 3, 4, 5, 6] // Monday=0 through Sunday=6
const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const timeOptions = Array.from({ length: 64 }, (_, i) => {
  const hour = Math.floor(i / 4) + 6
  const minute = (i % 4) * 15
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
})

const calendarSettingsConfig = [
  { key: 'front_overhang_mins', label: 'Buffer Before Appointments', helpText: 'Minutes of buffer time before each appointment. Prevents back-to-back bookings.', min: 5, max: 60 },
  { key: 'back_overhang_mins', label: 'Buffer After Appointments', helpText: 'Minutes of buffer time after each appointment.', min: 0, max: 60 },
  { key: 'min_event_duration_mins', label: 'Minimum Appointment Length', helpText: 'Shortest appointment allowed (minutes).', min: 5, max: 480 },
  { key: 'max_event_duration_mins', label: 'Maximum Appointment Length', helpText: 'Longest appointment allowed (minutes).', min: 5, max: 480 },
  { key: 'default_event_duration_mins', label: 'Default Appointment Length', helpText: 'Default length when caller doesn\'t specify.', min: 5, max: 480 },
  { key: 'max_bookings_per_caller', label: 'Max Bookings Per Caller', helpText: 'Maximum upcoming appointments per caller.', min: 1, max: 20 },
  { key: 'min_booking_lead_time_hours', label: 'Minimum Booking Notice', helpText: 'Hours in advance appointments must be booked.', min: 0, max: 72 },
  { key: 'max_booking_lead_time_days', label: 'Maximum Booking Window', helpText: 'How far ahead callers can book (days).', min: 1, max: 90 },
  { key: 'min_cancellation_lead_time_hours', label: 'Minimum Cancellation Notice', helpText: 'Hours in advance appointments can be cancelled.', min: 0, max: 72 },
  { key: 'event_match_window_mins', label: 'Appointment Match Window', helpText: 'How precisely callers must specify time for cancel/reschedule (minutes).', min: 5, max: 120 },
]

const toggleSettingsConfig = [
  { key: 'event_metadata_visible', label: 'Show Caller Details in Calendar', helpText: 'Show caller name, phone, and email in Google Calendar event descriptions.' },
  { key: 'respect_transparent_events', label: "Block 'Free' Calendar Events", helpText: "Events marked 'free' on Google Calendar still block booking." },
]

// ============================================================
// COMPONENT
// ============================================================

export default function Calendars() {
  const [calendars, setCalendars] = useState<CalendarConfig[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<Record<number, Shift[]>>({})
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
  const [calendarLinks, setCalendarLinks] = useState<CalendarLink[]>([])
  const [settings, setSettings] = useState<CalendarConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [showAddOverride, setShowAddOverride] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // New override form state
  const [newOverrideDate, setNewOverrideDate] = useState('')
  const [newOverrideIsClosed, setNewOverrideIsClosed] = useState(true)
  const [newOverrideOpenTime, setNewOverrideOpenTime] = useState('09:00')
  const [newOverrideCloseTime, setNewOverrideCloseTime] = useState('17:00')
  const [newOverrideReason, setNewOverrideReason] = useState('')

  const { selectedAssistant } = useAssistant()
  const { orgId } = useAuth()

  const [showPastOverrides, setShowPastOverrides] = useState(false)

  const selectedCalendar = calendars.find(c => c.calendar_id === selectedCalendarId) || null
  const today = new Date().toISOString().split('T')[0]
  const filteredOverrides = overrides
    .filter(o => showPastOverrides || o.override_date >= today)
    .sort((a, b) => b.override_date.localeCompare(a.override_date))


  // ----------------------------------------------------------
  // Fetch all calendar data
  // ----------------------------------------------------------
  useEffect(() => {
    if (!orgId || !selectedAssistant) return

    async function fetchCalendarData() {
      setIsLoading(true)
      const assistantId = selectedAssistant!.assistant_id

      try {
        // Fetch calendars linked to this assistant
        const [calConfigResult, calLinksResult] = await Promise.all([
          supabase
            .from('calendar_config')
            .select('*')
            .eq('org_id', orgId!),
          supabase
            .from('assistant_calendar_link')
            .select('*')
            .eq('org_id', orgId!)
            .eq('assistant_id', assistantId),
        ])

        const cals = calConfigResult.data || []
        const links = calLinksResult.data || []

        setCalendars(cals)
        setCalendarLinks(links)

        // Select first calendar by default
        if (cals.length > 0 && !selectedCalendarId) {
          setSelectedCalendarId(cals[0].calendar_id)
        }
      } catch (err) {
        console.error('Error fetching calendar data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    setTimeout(() => { fetchCalendarData() }, 0)
  }, [orgId, selectedAssistant])

  // ----------------------------------------------------------
  // Fetch schedule, overrides, and settings when calendar changes
  // ----------------------------------------------------------
  useEffect(() => {
    if (!selectedCalendarId) return

    async function fetchCalendarDetails() {
      try {
        const [hoursResult, overridesResult] = await Promise.all([
          supabase
            .from('calendar_availability_hours')
            .select('*')
            .eq('calendar_id', selectedCalendarId!)
            .order('day_of_week')
            .order('open_time'),
          supabase
            .from('calendar_availability_overrides')
            .select('*')
            .eq('calendar_id', selectedCalendarId!)
            .eq('is_active', true)
            .order('override_date'),
        ])

        // Build schedule map: day_of_week -> shifts
        const scheduleMap: Record<number, Shift[]> = {}
        for (let i = 0; i < 7; i++) scheduleMap[i] = []

        ;(hoursResult.data || []).forEach((h: any) => {
          const day = h.day_of_week
          scheduleMap[day] = scheduleMap[day] || []
          scheduleMap[day].push({
            open_time: h.open_time?.slice(0, 5) || '09:00',
            close_time: h.close_time?.slice(0, 5) || '17:00',
          })
        })

        setSchedule(scheduleMap)
        setOverrides(overridesResult.data || [])

        // Set settings from the selected calendar config
        const cal = calendars.find(c => c.calendar_id === selectedCalendarId)
        if (cal) setSettings({ ...cal })

      } catch (err) {
        console.error('Error fetching calendar details:', err)
      }
    }

    setTimeout(() => { fetchCalendarDetails() }, 0)
  }, [selectedCalendarId, calendars])

  // ----------------------------------------------------------
  // Schedule handlers
  // ----------------------------------------------------------
  const handleAddShift = (day: number) => {
    setSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { open_time: '09:00', close_time: '17:00' }]
    }))
  }

  const handleRemoveShift = (day: number, index: number) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }))
  }

  const handleUpdateShift = (day: number, index: number, field: 'open_time' | 'close_time', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day].map((shift, i) => i === index ? { ...shift, [field]: value } : shift)
    }))
  }

  const handleSaveSchedule = async () => {
    if (!selectedCalendarId) return
    setIsSavingSchedule(true)
    setSaveMessage(null)

    try {
      // Delete all existing hours for this calendar
      await supabase
        .from('calendar_availability_hours')
        .delete()
        .eq('calendar_id', selectedCalendarId)

      // Insert new hours
      const rows: any[] = []
      Object.entries(schedule).forEach(([day, shifts]) => {
        shifts.forEach(shift => {
          rows.push({
            calendar_id: selectedCalendarId,
            day_of_week: parseInt(day),
            open_time: shift.open_time + ':00',
            close_time: shift.close_time + ':00',
          })
        })
      })

      if (rows.length > 0) {
        const { error } = await supabase
          .from('calendar_availability_hours')
          .insert(rows)

        if (error) throw error
      }

      setSaveMessage({ type: 'success', text: 'Schedule saved successfully!' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Error saving schedule:', err)
      setSaveMessage({ type: 'error', text: 'Failed to save schedule. Please try again.' })
    } finally {
      setIsSavingSchedule(false)
    }
  }

  // ----------------------------------------------------------
  // Override handlers
  // ----------------------------------------------------------
  const handleToggleOverride = async (id: number, currentActive: boolean) => {
    try {
      await supabase
        .from('calendar_availability_overrides')
        .update({ is_active: !currentActive })
        .eq('id', id)

      setOverrides(prev => prev.map(o => o.id === id ? { ...o, is_active: !currentActive } : o))
    } catch (err) {
      console.error('Error toggling override:', err)
    }
  }

  const handleDeleteOverride = async (id: number) => {
    try {
      await supabase
        .from('calendar_availability_overrides')
        .update({ is_active: false })
        .eq('id', id)

      setOverrides(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      console.error('Error deleting override:', err)
    }
  }

  const handleAddOverride = async () => {
    if (!selectedCalendarId || !newOverrideDate) return

    try {
      const row: any = {
        calendar_id: selectedCalendarId,
        override_date: newOverrideDate,
        is_closed: newOverrideIsClosed,
        reason: newOverrideReason || null,
        is_active: true,
      }

      if (!newOverrideIsClosed) {
        row.open_time = newOverrideOpenTime + ':00'
        row.close_time = newOverrideCloseTime + ':00'
      }

      const { data, error } = await supabase
        .from('calendar_availability_overrides')
        .insert(row)
        .select()

      if (error) throw error

      if (data) {
        setOverrides(prev => [data[0], ...prev])
      }

      // Reset form
      setShowAddOverride(false)
      setNewOverrideDate('')
      setNewOverrideIsClosed(true)
      setNewOverrideOpenTime('09:00')
      setNewOverrideCloseTime('17:00')
      setNewOverrideReason('')
      setSaveMessage({ type: 'success', text: 'Override saved!' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Error adding override:', err)
    }
  }

  // ----------------------------------------------------------
  // Settings handlers
  // ----------------------------------------------------------
  const handleSettingChange = (key: string, value: number | boolean) => {
    if (!settings) return
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
  }

  const handleSaveSettings = async () => {
    if (!selectedCalendarId || !settings) return
    setIsSavingSettings(true)
    setSaveMessage(null)

    try {
      const { error } = await supabase
        .from('calendar_config')
        .update({
          front_overhang_mins: settings.front_overhang_mins,
          back_overhang_mins: settings.back_overhang_mins,
          min_event_duration_mins: settings.min_event_duration_mins,
          max_event_duration_mins: settings.max_event_duration_mins,
          default_event_duration_mins: settings.default_event_duration_mins,
          max_bookings_per_caller: settings.max_bookings_per_caller,
          min_booking_lead_time_hours: settings.min_booking_lead_time_hours,
          max_booking_lead_time_days: settings.max_booking_lead_time_days,
          min_cancellation_lead_time_hours: settings.min_cancellation_lead_time_hours,
          event_metadata_visible: settings.event_metadata_visible,
          respect_transparent_events: settings.respect_transparent_events,
          event_match_window_mins: settings.event_match_window_mins,
        })
        .eq('calendar_id', selectedCalendarId)

      if (error) throw error

      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setIsSavingSettings(false)
    }
  }

  // ----------------------------------------------------------
  // Authorization handler
  // ----------------------------------------------------------
  const handleToggleAuthorization = async (link: CalendarLink) => {
    const newValue = !link.is_authorized

    // Show confirmation when deauthorizing
    if (!newValue) {
      const confirmed = window.confirm(
        'Deauthorizing this calendar will prevent the assistant from booking, cancelling, or rescheduling appointments on this calendar. Are you sure?'
      )
      if (!confirmed) return
    }

    try {
      await supabase
        .from('assistant_calendar_link')
        .update({ is_authorized: newValue })
        .eq('assistant_id', link.assistant_id)
        .eq('calendar_id', link.calendar_id)

      setCalendarLinks(prev =>
        prev.map(l =>
          l.assistant_id === link.assistant_id && l.calendar_id === link.calendar_id
            ? { ...l, is_authorized: newValue }
            : l
        )
      )
    } catch (err) {
      console.error('Error toggling authorization:', err)
    }
  }

  // ----------------------------------------------------------
  // LOADING STATE
  // ----------------------------------------------------------

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading calendar data...</span>
        </div>
      </div>
    )
  }

  if (calendars.length === 0) {
    return (
      <div className="p-8 text-center py-16">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Calendars Found</h3>
        <p className="text-gray-500">No calendars are configured for this organization. Contact support to set up a calendar.</p>
      </div>
    )
  }

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Calendars</h1>
        <p className="text-gray-500 mt-1">Manage your calendars and scheduling preferences</p>
      </div>

      {/* Calendar Selector */}
      <div className="flex gap-4 mb-8">
        {calendars.map((calendar) => (
          <button
            key={calendar.calendar_id}
            onClick={() => setSelectedCalendarId(calendar.calendar_id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors ${
              selectedCalendarId === calendar.calendar_id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-5 h-5 text-gray-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{calendar.calendar_id}</p>
              <p className="text-xs text-gray-500">{calendar.calendar_provider}</p>
            </div>
            {calendar.is_active && (
              <span className="w-2 h-2 rounded-full bg-green-500 ml-2" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Schedule */}
        <div className="lg:col-span-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {days.map((day, index) => (
                  <div key={day} className="flex items-start gap-4">
                    <div className="w-24 pt-3">
                      <span className="text-sm font-medium text-gray-900">{dayLabels[index]}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {(schedule[day] || []).map((shift, shiftIndex) => (
                        <div key={shiftIndex} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={shift.open_time}
                            onChange={(e) => handleUpdateShift(day, shiftIndex, 'open_time', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={shift.close_time}
                            onChange={(e) => handleUpdateShift(day, shiftIndex, 'close_time', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            onClick={() => handleRemoveShift(day, shiftIndex)}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddShift(day)}
                        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Shift
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t flex items-center gap-4">
                <Button
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={handleSaveSchedule}
                  disabled={isSavingSchedule}
                >
                  {isSavingSchedule ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Save Schedule'
                  )}
                </Button>
                {saveMessage && (
                  <span className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {saveMessage.text}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Schedule Overrides */}
          <Card className="border-gray-200 shadow-sm mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Schedule Overrides</CardTitle>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPastOverrides}
                      onChange={(e) => setShowPastOverrides(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs text-gray-500">Show past</span>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add Override Form — at the top */}
              {showAddOverride ? (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Add Override</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">Date</Label>
                      <Input
                        type="date"
                        value={newOverrideDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOverrideDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Closed all day</Label>
                      <Switch checked={newOverrideIsClosed} onCheckedChange={setNewOverrideIsClosed} />
                    </div>
                    {!newOverrideIsClosed && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={newOverrideOpenTime}
                          onChange={(e) => setNewOverrideOpenTime(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={newOverrideCloseTime}
                          onChange={(e) => setNewOverrideCloseTime(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-sm">Reason (optional)</Label>
                      <Input
                        value={newOverrideReason}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOverrideReason(e.target.value)}
                        placeholder="e.g., Christmas, Sick day"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleAddOverride}>
                        Save Override
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddOverride(false)}>
                        Cancel
                      </Button>
                      {saveMessage && (
                        <span className={`text-sm font-medium ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                          {saveMessage.text}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="mb-6 border-gray-300" onClick={() => setShowAddOverride(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Override
                </Button>
              )}

              {/* Override list */}
              {filteredOverrides.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  {overrides.length === 0
                    ? 'No overrides set. Add overrides for holidays or special hours.'
                    : 'No upcoming overrides. Toggle "Show past" to see previous overrides.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase pb-3">Date</th>
                        <th className="text-left text-xs font-medium text-gray-500 pb-3">Status</th>
                        <th className="text-left text-xs font-medium text-gray-500 pb-3">Reason</th>
                        <th className="text-left text-xs font-medium text-gray-500 pb-3">Active</th>
                        <th className="text-left text-xs font-medium text-gray-500 pb-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredOverrides.map((override) => (
                        <tr key={override.id} className={override.override_date < new Date().toISOString().split('T')[0] ? 'opacity-50' : ''}>
                          <td className="py-3 text-sm text-gray-900">{override.override_date}</td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                              override.is_closed
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {override.is_closed ? 'Closed' : `Custom: ${override.open_time?.slice(0, 5)} - ${override.close_time?.slice(0, 5)}`}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-gray-600">{override.reason || '—'}</td>
                          <td className="py-3">
                            <Switch
                              checked={override.is_active}
                              onCheckedChange={() => handleToggleOverride(override.id, override.is_active)}
                            />
                          </td>
                          <td className="py-3">
                            <button onClick={() => handleDeleteOverride(override.id)} className="p-1 text-gray-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Calendar Settings */}
          {settings && (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Calendar Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {calendarSettingsConfig.map((config) => (
                  <div key={config.key}>
                    <Label className="text-sm font-medium">{config.label}</Label>
                    <Input
                      type="number"
                      value={(settings as any)[config.key] ?? 0}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleSettingChange(config.key, parseInt(e.target.value) || 0)
                      }
                      className="mt-1"
                      min={config.min}
                      max={config.max}
                    />
                    <p className="text-xs text-gray-500 mt-1">{config.helpText}</p>
                  </div>
                ))}

                {toggleSettingsConfig.map((config) => (
                  <div key={config.key} className="flex items-center justify-between pt-2">
                    <div>
                      <Label className="text-sm font-medium">{config.label}</Label>
                      <p className="text-xs text-gray-500">{config.helpText}</p>
                    </div>
                    <Switch
                      checked={(settings as any)[config.key] ?? false}
                      onCheckedChange={(checked) => handleSettingChange(config.key, checked)}
                    />
                  </div>
                ))}

                <div className="mt-4 space-y-2">
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                  >
                    {isSavingSettings ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  {saveMessage && (
                    <p className={`text-sm font-medium text-center ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {saveMessage.text}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assistant Calendar Authorization */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Assistant Authorization</CardTitle>
            </CardHeader>
            <CardContent>
              {calendarLinks.length === 0 ? (
                <p className="text-sm text-gray-500">No calendar links found for this assistant.</p>
              ) : (
                <div className="space-y-4">
                  {calendarLinks.map((link, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{link.calendar_id}</p>
                        <p className="text-xs text-gray-500">Linked to assistant</p>
                      </div>
                      <Switch
                        checked={link.is_authorized}
                        onCheckedChange={() => handleToggleAuthorization(link)}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Deauthorizing will prevent the assistant from booking, cancelling, or rescheduling appointments.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}