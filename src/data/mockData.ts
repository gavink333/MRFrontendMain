// Mock data for Phase 1 - Visual Scaffold (v3 spec)

export const mockUser = {
  email: 'hubert.janus@example.com',
  orgName: 'Janus Services',
  orgId: 'org_123',
}

// ============================================================================
// ASSISTANTS - v3 Spec Section 3.1
// ============================================================================

export interface Assistant {
  id: string
  name: string
  inboundNumber: string
  status: 'active' | 'inactive'
  subscriptionPlan: string
  billingCycle: string
  totalCallsThisMonth: number
  totalBookingsThisMonth: number
}

export const mockAssistants: Assistant[] = [
  {
    id: 'assistant_001',
    name: 'Main Receptionist',
    inboundNumber: '+1 (989) 295-5900',
    status: 'active',
    subscriptionPlan: 'Professional Plan',
    billingCycle: 'Monthly',
    totalCallsThisMonth: 47,
    totalBookingsThisMonth: 12,
  },
  {
    id: 'assistant_002',
    name: 'After Hours Line',
    inboundNumber: '+1 (732) 984-3940',
    status: 'active',
    subscriptionPlan: 'Starter Plan',
    billingCycle: 'Monthly',
    totalCallsThisMonth: 23,
    totalBookingsThisMonth: 8,
  },
]

// Current selected assistant (for demo purposes)
export const mockCurrentAssistant = mockAssistants[0]

// ============================================================================
// DASHBOARD KPIs - v3 Spec Section 4.3 & 4.5
// ============================================================================

export const mockKPIs = {
  // Primary KPIs (Section 4.3)
  totalCalls: 147,
  appointmentsBooked: 43,
  appointmentsBookedActive: 38, // active = not cancelled
  bookingConversionRate: 29.3, // percentage
  totalCallMinutes: 84.5,
  
  // Secondary KPIs (Section 4.5)
  cancellationRate: 4.7, // percentage
  avgCallDurationSeconds: 84, // seconds (1m 24s)
  uniqueCallers: 38,
  
  // After-Hours Bookings (Section 4.4) - THE MOST IMPORTANT METRIC
  afterHoursBookings: 12,
  afterHoursPercentage: 28, // percentage of all bookings
}

// ============================================================================
// SUBSCRIPTION PLAN - v3 Spec Section 4.2
// ============================================================================

export const mockSubscriptionPlan = {
  planName: 'Professional Plan',
  billingCycle: 'Monthly',
  status: 'Active' as const,
}

// ============================================================================
// MONTH SELECTOR - v3 Spec Section 4.1
// ============================================================================

export const mockMonths = [
  { value: '2026-03', label: 'March 2026' },
  { value: '2026-02', label: 'February 2026' },
  { value: '2026-01', label: 'January 2026' },
  { value: '2025-12', label: 'December 2025' },
  { value: '2025-11', label: 'November 2025' },
  { value: '2025-10', label: 'October 2025' },
  { value: '2025-09', label: 'September 2025' },
  { value: '2025-08', label: 'August 2025' },
  { value: '2025-07', label: 'July 2025' },
  { value: '2025-06', label: 'June 2025' },
  { value: '2025-05', label: 'May 2025' },
  { value: '2025-04', label: 'April 2025' },
]

// ============================================================================
// CHARTS DATA - v3 Spec Section 4.6
// ============================================================================

// Call Volume Over Time (bar chart)
export const mockCallVolumeData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  calls: Math.floor(Math.random() * 8) + 3, // 3-10 calls per day
}))

// Bookings Over Time (bar chart with active/cancelled)
export const mockBookingsData = Array.from({ length: 30 }, (_, i) => {
  const total = Math.floor(Math.random() * 5) + 1
  const cancelled = Math.floor(Math.random() * Math.min(total, 2))
  return {
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    active: total - cancelled,
    cancelled,
    total,
  }
})

// Calls by Hour of Day (bar chart)
export const mockCallsByHour = [
  { hour: '6 AM', calls: 2 },
  { hour: '7 AM', calls: 4 },
  { hour: '8 AM', calls: 8 },
  { hour: '9 AM', calls: 12 },
  { hour: '10 AM', calls: 18 },
  { hour: '11 AM', calls: 15 },
  { hour: '12 PM', calls: 10 },
  { hour: '1 PM', calls: 14 },
  { hour: '2 PM', calls: 20 }, // Peak
  { hour: '3 PM', calls: 16 },
  { hour: '4 PM', calls: 12 },
  { hour: '5 PM', calls: 8 },
  { hour: '6 PM', calls: 5 },
  { hour: '7 PM', calls: 3 },
  { hour: '8 PM', calls: 2 },
  { hour: '9 PM', calls: 1 },
]

// Calls by Day of Week (bar chart)
export const mockCallsByDay = [
  { day: 'Mon', calls: 28 },
  { day: 'Tue', calls: 32 },
  { day: 'Wed', calls: 30 },
  { day: 'Thu', calls: 25 },
  { day: 'Fri', calls: 22 },
  { day: 'Sat', calls: 8 },
  { day: 'Sun', calls: 4 },
]

// ============================================================================
// WIDGETS DATA - v3 Spec Section 4.7
// ============================================================================

// New vs Repeat Callers (donut chart)
export const mockNewVsRepeat = [
  { name: 'New Callers', value: 65, color: '#8B5CF6' }, // 65%
  { name: 'Repeat Callers', value: 35, color: '#3B82F6' }, // 35%
]
export const mockNewCallersCount = 24
export const mockRepeatCallersCount = 13

// Call End Reasons
export const mockCallEndReasons = [
  { name: 'Customer Ended', value: 70, color: '#22C55E' },
  { name: 'Assistant Ended', value: 25, color: '#F59E0B' },
  { name: 'Other', value: 5, color: '#6B7280' },
]

// Top Callers (leaderboard)
export const mockTopCallers = [
  { rank: 1, phone: '+1 (989) 295-5900', totalCalls: 8, totalMinutes: 42 },
  { rank: 2, phone: '+1 (555) 123-4567', totalCalls: 6, totalMinutes: 28 },
  { rank: 3, phone: '+1 (212) 555-0199', totalCalls: 5, totalMinutes: 35 },
  { rank: 4, phone: '+1 (312) 555-0188', totalCalls: 4, totalMinutes: 18 },
  { rank: 5, phone: '+1 (415) 555-0177', totalCalls: 3, totalMinutes: 12 },
]

// Recent Activity Feed
export const mockRecentActivity = [
  { id: 1, type: 'booking', message: 'Appointment booked: Consultation on Mar 15 at 10:00 AM', time: '10 minutes ago' },
  { id: 2, type: 'call', message: 'Call from +1 (989) 295-5900 — 2m 34s', time: '25 minutes ago' },
  { id: 3, type: 'cancellation', message: 'Appointment cancelled: Annual Checkup', time: '1 hour ago' },
  { id: 4, type: 'booking', message: 'Appointment booked: Outlet Repair on Mar 14 at 2:00 PM', time: '2 hours ago' },
  { id: 5, type: 'call', message: 'Call from +1 (555) 123-4567 — 1m 12s', time: '3 hours ago' },
  { id: 6, type: 'booking', message: 'Appointment booked: Plumbing Inspection on Mar 13 at 9:00 AM', time: '4 hours ago' },
  { id: 7, type: 'call', message: 'Call from +1 (212) 555-0199 — 3m 45s', time: '5 hours ago' },
  { id: 8, type: 'booking', message: 'Appointment booked: General Consultation on Mar 12 at 11:00 AM', time: '6 hours ago' },
  { id: 9, type: 'call', message: 'Call from +1 (312) 555-0188 — 0m 58s', time: '7 hours ago' },
  { id: 10, type: 'call', message: 'Call from +1 (415) 555-0177 — 1m 22s', time: '8 hours ago' },
]

// ============================================================================
// CALL HISTORY - v3 Spec Section 5
// ============================================================================

export interface CallLog {
  id: string
  callStartedAt: string
  callerNumber: string
  durationSeconds: number
  toolsUsed: string
  endReason: string
  summary: string | null
  transcript: string | null
  recordingUrl: string | null
}

export const mockCallLogs: CallLog[] = [
  {
    id: 'call_001',
    callStartedAt: '2026-03-08T14:34:00Z',
    callerNumber: '+1 (989) 295-5900',
    durationSeconds: 84,
    toolsUsed: 'get_availability, book_appointment',
    endReason: 'customer-ended-call',
    summary: 'Caller wanted to schedule a consultation appointment. The assistant checked availability and booked a 30-minute slot for March 15th at 10:00 AM.',
    transcript: `Assistant: Thank you for calling Janus Services. How can I help you today?
Caller: Hi, I'd like to book an appointment for a consultation.
Assistant: I'd be happy to help you book a consultation. What type of appointment are you looking for?
Caller: Just a general consultation, maybe 30 minutes?
Assistant: Let me check our available times. We have openings on March 15th at 10:00 AM, March 16th at 2:00 PM, and March 17th at 11:00 AM. Which works best for you?
Caller: March 15th at 10:00 AM works.
Assistant: Great! I've booked your consultation for March 15th at 10:00 AM. You'll receive a confirmation email shortly. Is there anything else I can help you with?
Caller: No, that's perfect. Thank you!
Assistant: Thank you for calling! Have a great day!`,
    recordingUrl: null,
  },
  {
    id: 'call_002',
    callStartedAt: '2026-03-08T12:15:00Z',
    callerNumber: '+1 (555) 123-4567',
    durationSeconds: 45,
    toolsUsed: 'get_availability',
    endReason: 'customer-ended-call',
    summary: 'Caller inquired about availability but did not book an appointment.',
    transcript: null,
    recordingUrl: null,
  },
  {
    id: 'call_003',
    callStartedAt: '2026-03-07T16:22:00Z',
    callerNumber: '+1 (212) 555-0199',
    durationSeconds: 156,
    toolsUsed: 'get_availability, book_appointment, cancel_appointment',
    endReason: 'assistant-ended-call',
    summary: 'Caller first booked an appointment, then called back to cancel and reschedule to a different time.',
    transcript: null,
    recordingUrl: null,
  },
  {
    id: 'call_004',
    callStartedAt: '2026-03-07T10:05:00Z',
    callerNumber: '+1 (312) 555-0188',
    durationSeconds: 32,
    toolsUsed: 'get_availability',
    endReason: 'customer-ended-call',
    summary: null,
    transcript: null,
    recordingUrl: null,
  },
  {
    id: 'call_005',
    callStartedAt: '2026-03-06T14:50:00Z',
    callerNumber: '+1 (415) 555-0177',
    durationSeconds: 78,
    toolsUsed: 'get_availability, book_appointment',
    endReason: 'customer-ended-call',
    summary: 'Caller booked a plumbing inspection appointment.',
    transcript: null,
    recordingUrl: null,
  },
]

export const mockEndReasons = [
  { value: 'all', label: 'All' },
  { value: 'customer-ended-call', label: 'Customer Ended' },
  { value: 'assistant-ended-call', label: 'Assistant Ended' },
  { value: 'other', label: 'Other' },
]

// ============================================================================
// CALENDARS - v3 Spec Section 6
// ============================================================================

export interface Calendar {
  id: string
  email: string
  provider: string
  isActive: boolean
}

export const mockCalendars: Calendar[] = [
  { id: 'cal_001', email: 'hubertjanus99@gmail.com', provider: 'google', isActive: true },
  { id: 'cal_002', email: 'mysticmango49@gmail.com', provider: 'google', isActive: true },
]

// Weekly Schedule (v3 Spec Section 6.2)
export const mockWeeklySchedule = {
  monday: [{ openTime: '12:00', closeTime: '20:00' }],
  tuesday: [{ openTime: '12:00', closeTime: '20:00' }],
  wednesday: [{ openTime: '12:00', closeTime: '20:00' }],
  thursday: [{ openTime: '12:00', closeTime: '20:00' }],
  friday: [{ openTime: '12:00', closeTime: '20:00' }],
  saturday: [{ openTime: '09:00', closeTime: '17:00' }],
  sunday: [], // Closed
}

// Schedule Overrides (v3 Spec Section 6.3)
export interface ScheduleOverride {
  id: number
  date: string
  isClosed: boolean
  customHours?: { openTime: string; closeTime: string }[]
  reason: string
  isActive: boolean
}

export const mockOverrides: ScheduleOverride[] = [
  { id: 1, date: '2026-12-25', isClosed: true, reason: 'Christmas', isActive: true },
  { id: 2, date: '2026-12-24', isClosed: false, customHours: [{ openTime: '09:00', closeTime: '12:00' }], reason: 'Christmas Eve (half day)', isActive: true },
  { id: 3, date: '2027-01-01', isClosed: true, reason: "New Year's Day", isActive: true },
]

// Calendar Settings (v3 Spec Section 6.4) - ALL 12 SETTINGS
export interface CalendarSettings {
  frontOverhangMins: number
  backOverhangMins: number
  minEventDurationMins: number
  maxEventDurationMins: number
  defaultEventDurationMins: number
  maxBookingsPerCaller: number
  minBookingLeadTimeHours: number
  maxBookingLeadTimeDays: number
  minCancellationLeadTimeHours: number
  eventMetadataVisible: boolean
  respectTransparentEvents: boolean
  eventMatchWindowMins: number
}

export const mockCalendarSettings: CalendarSettings = {
  frontOverhangMins: 15,
  backOverhangMins: 0,
  minEventDurationMins: 15,
  maxEventDurationMins: 60,
  defaultEventDurationMins: 30,
  maxBookingsPerCaller: 3,
  minBookingLeadTimeHours: 1,
  maxBookingLeadTimeDays: 30,
  minCancellationLeadTimeHours: 0,
  eventMetadataVisible: true,
  respectTransparentEvents: true,
  eventMatchWindowMins: 30,
}

// Assistant Calendar Links (v3 Spec Section 6.5)
export const mockAssistantCalendarLinks = [
  { assistantId: 'assistant_001', calendarEmail: 'hubertjanus99@gmail.com', isAuthorized: true },
  { assistantId: 'assistant_001', calendarEmail: 'mysticmango49@gmail.com', isAuthorized: true },
]

// ============================================================================
// SETTINGS - v3 Spec Section 7
// ============================================================================

export const mockBlockedNumbers = [
  '+19895551234',
  '+12125559876',
]

export interface NotificationRule {
  id: number
  event: string
  channel: string
  recipient: string
  isEnabled: boolean
}

export const mockNotificationRules: NotificationRule[] = [
  { id: 1, event: 'New Booking', channel: 'Pushover', recipient: 'Gavin', isEnabled: true },
  { id: 2, event: 'Cancellation', channel: 'Pushover', recipient: 'Gavin', isEnabled: true },
  { id: 3, event: 'Reschedule', channel: 'Pushover', recipient: 'Gavin', isEnabled: false },
  { id: 4, event: 'Availability Check', channel: 'Pushover', recipient: 'Gavin', isEnabled: false },
  { id: 5, event: 'New Booking', channel: 'Slack', recipient: 'Team', isEnabled: true },
  { id: 6, event: 'Cancellation', channel: 'Slack', recipient: 'Team', isEnabled: true },
  { id: 7, event: 'Reschedule', channel: 'Slack', recipient: 'Team', isEnabled: true },
  { id: 8, event: 'Availability Check', channel: 'Slack', recipient: 'Team', isEnabled: false },
]

// Assistant Info (v3 Spec Section 7.2)
export const mockAssistantInfo = {
  id: 'assistant_001',
  inboundNumber: '+1 (989) 295-5900',
  status: 'Active',
  callLogging: 'Enabled',
  transcripts: 'Enabled',
  summaries: 'Enabled',
}

// ============================================================================
// UTILITY - Old exports for backwards compatibility during transition
// ============================================================================

// Legacy KPI export for backwards compatibility
export const legacyMockKPIs = {
  totalCalls: mockKPIs.totalCalls,
  appointmentsBooked: mockKPIs.appointmentsBooked,
  totalCost: 4.52,
  avgCallDuration: mockKPIs.avgCallDurationSeconds,
  uniqueCallers: mockKPIs.uniqueCallers,
  bookingConversion: mockKPIs.bookingConversionRate,
  cancellationRate: mockKPIs.cancellationRate,
  costPerBooking: 0.11,
}
