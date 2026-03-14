import { useState } from 'react'
import { Plus, Trash2, Calendar, Settings, BarChart3, AlertCircle, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  mockCalendars, 
  mockWeeklySchedule, 
  mockOverrides, 
  mockCalendarSettings,
  mockAssistantCalendarLinks,
  ScheduleOverride,
  CalendarSettings
} from '@/data/mockData'

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const timeOptions = Array.from({ length: 32 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6
  const minute = (i % 2) * 30
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
})

// Calendar Settings as per v3 Spec Section 6.4
const calendarSettingsConfig = [
  { key: 'frontOverhangMins', label: 'Buffer Before Appointments', helpText: 'Minutes of buffer time before each appointment. Prevents back-to-back bookings.', min: 5, max: 60 },
  { key: 'backOverhangMins', label: 'Buffer After Appointments', helpText: 'Minutes of buffer time after each appointment.', min: 0, max: 60 },
  { key: 'minEventDurationMins', label: 'Minimum Appointment Length', helpText: 'Shortest appointment allowed (minutes).', min: 5, max: null },
  { key: 'maxEventDurationMins', label: 'Maximum Appointment Length', helpText: 'Longest appointment allowed (minutes).', min: null, max: 480 },
  { key: 'defaultEventDurationMins', label: 'Default Appointment Length', helpText: 'Default length when caller doesn\'t specify.', min: null, max: null },
  { key: 'maxBookingsPerCaller', label: 'Max Bookings Per Caller', helpText: 'Maximum upcoming appointments per caller.', min: 1, max: 20 },
  { key: 'minBookingLeadTimeHours', label: 'Minimum Booking Notice', helpText: 'Hours in advance appointments must be booked.', min: 0, max: 72 },
  { key: 'maxBookingLeadTimeDays', label: 'Maximum Booking Window', helpText: 'How far ahead callers can book (days).', min: 1, max: 90 },
  { key: 'minCancellationLeadTimeHours', label: 'Minimum Cancellation Notice', helpText: 'Hours in advance appointments can be cancelled.', min: 0, max: 72 },
  { key: 'eventMatchWindowMins', label: 'Appointment Match Window', helpText: 'How precisely callers must specify time for cancel/reschedule (minutes).', min: 5, max: 120 },
]

const toggleSettingsConfig = [
  { key: 'eventMetadataVisible', label: 'Show Caller Details in Calendar', helpText: 'Show caller name, phone, and email in Google Calendar event descriptions.' },
  { key: 'respectTransparentEvents', label: 'Block \'Free\' Calendar Events', helpText: 'Events marked \'free\' on Google Calendar still block booking.' },
]

export default function Calendars() {
  const [selectedCalendar, setSelectedCalendar] = useState(mockCalendars[0])
  const [schedule, setSchedule] = useState(mockWeeklySchedule)
  const [settings, setSettings] = useState<CalendarSettings>(mockCalendarSettings)
  const [calendarLinks, setCalendarLinks] = useState(mockAssistantCalendarLinks)
  const [overrides, setOverrides] = useState<ScheduleOverride[]>(mockOverrides)
  const [showAddOverride, setShowAddOverride] = useState(false)

  const handleAddShift = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: [...(prev[day as keyof typeof prev] || []), { openTime: '09:00', closeTime: '17:00' }]
    }))
  }

  const handleRemoveShift = (day: string, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day as keyof typeof prev].filter((_, i) => i !== index)
    }))
  }

  const handleUpdateShift = (day: string, index: number, field: 'openTime' | 'closeTime', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day as keyof typeof prev].map((shift, i) => 
        i === index ? { ...shift, [field]: value } : shift
      )
    }))
  }

  const handleToggleAuthorization = (index: number) => {
    setCalendarLinks((prev) => 
      prev.map((link, i) => i === index ? { ...link, isAuthorized: !link.isAuthorized } : link)
    )
  }

  const handleSettingChange = (key: keyof CalendarSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleToggleOverride = (id: number) => {
    setOverrides(prev => 
      prev.map(override => override.id === id ? { ...override, isActive: !override.isActive } : override)
    )
  }

  const handleDeleteOverride = (id: number) => {
    setOverrides(prev => prev.filter(override => override.id !== id))
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Calendars</h1>
        <p className="text-gray-500 mt-1">Manage your calendars and scheduling preferences</p>
      </div>

      {/* Calendar Selector */}
      <div className="flex gap-4 mb-8">
        {mockCalendars.map((calendar) => (
          <button
            key={calendar.id}
            onClick={() => setSelectedCalendar(calendar)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors ${
              selectedCalendar.id === calendar.id
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-5 h-5 text-gray-500" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{calendar.email}</p>
              <p className="text-xs text-gray-500">{calendar.provider}</p>
            </div>
            {calendar.isActive && (
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
                      {schedule[day as keyof typeof schedule]?.map((shift, shiftIndex) => (
                        <div key={shiftIndex} className="flex items-center gap-2">
                          <select
                            value={shift.openTime}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateShift(day, shiftIndex, 'openTime', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {timeOptions.map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <span className="text-gray-500">to</span>
                          <select
                            value={shift.closeTime}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateShift(day, shiftIndex, 'closeTime', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            {timeOptions.map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
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
              <div className="mt-6 pt-6 border-t">
                <Button className="bg-purple-600 hover:bg-purple-700">Save Schedule</Button>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Overrides */}
          <Card className="border-gray-200 shadow-sm mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Schedule Overrides</CardTitle>
            </CardHeader>
            <CardContent>
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
                    {overrides.map((override) => (
                      <tr key={override.id}>
                        <td className="py-3 text-sm text-gray-900">{override.date}</td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                            override.isClosed 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {override.isClosed ? 'Closed' : `Custom: ${override.customHours?.[0]?.openTime} - ${override.customHours?.[0]?.closeTime}`}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-gray-600">{override.reason}</td>
                        <td className="py-3">
                          <Switch checked={override.isActive} onCheckedChange={() => handleToggleOverride(override.id)} />
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
              <Button variant="outline" className="mt-4 border-gray-300" onClick={() => setShowAddOverride(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Override
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Calendar Settings - All 12 settings */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Calendar Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Number inputs */}
              {calendarSettingsConfig.map((config) => (
                <div key={config.key}>
                  <Label className="text-sm font-medium">{config.label}</Label>
                  <Input 
                    type="number" 
                    value={settings[config.key as keyof CalendarSettings] as number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSettingChange(config.key as keyof CalendarSettings, parseInt(e.target.value))}
                    className="mt-1"
                    min={config.min || undefined}
                    max={config.max || undefined}
                  />
                  <p className="text-xs text-gray-500 mt-1">{config.helpText}</p>
                </div>
              ))}
              
              {/* Toggle switches */}
              {toggleSettingsConfig.map((config) => (
                <div key={config.key} className="flex items-center justify-between pt-2">
                  <div>
                    <Label className="text-sm font-medium">{config.label}</Label>
                    <p className="text-xs text-gray-500">{config.helpText}</p>
                  </div>
                  <Switch 
                    checked={settings[config.key as keyof CalendarSettings] as boolean}
                    onCheckedChange={(checked) => handleSettingChange(config.key as keyof CalendarSettings, checked)}
                  />
                </div>
              ))}
              
              <Button className="w-full bg-purple-600 hover:bg-purple-700 mt-4">Save Changes</Button>
            </CardContent>
          </Card>

          {/* Assistant Calendar Authorization */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Assistant Authorization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {calendarLinks.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{link.calendarEmail}</p>
                      <p className="text-xs text-gray-500">Linked to assistant</p>
                    </div>
                    <Switch 
                      checked={link.isAuthorized} 
                      onCheckedChange={() => handleToggleAuthorization(index)}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Deauthorizing will prevent the assistant from booking, cancelling, or rescheduling appointments.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Booking Analytics */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Booking Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">By Appointment Type</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-24">Electrical</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: '40%' }} />
                      </div>
                      <span className="text-sm text-gray-900 w-8">12</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-24">Plumbing</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '27%' }} />
                      </div>
                      <span className="text-sm text-gray-900 w-8">8</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-24">General</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '33%' }} />
                      </div>
                      <span className="text-sm text-gray-900 w-8">23</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-900 mb-2">After Hours Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    12 bookings 
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      (28% of total)
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
