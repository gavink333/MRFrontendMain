# Master Receptionists — Dashboard Specification v3
## Frontend Architecture & Backend Wiring Guide

---

## 1. Overview

This document defines the complete specification for the Master Receptionists customer dashboard. It covers authentication, page structure, data sources, editable parameters, and the relationship between the frontend and the existing Supabase backend.

**Tech stack:**
- Frontend: React (Vite) + Tailwind CSS + shadcn/ui
- Auth: Supabase Auth (email/password + Google OAuth)
- Database: Supabase (PostgreSQL) — all tables in `public` schema
- Hosting: Vercel (app.masterreceptionists.com)
- Charts: Recharts (React-native charting library)

**Build approach:**
- Phase 1 (AI frontend generator): Build the complete visual scaffold with mock/hardcoded data. No Supabase client, no real queries, no auth wiring. Pure React components with realistic placeholder data that matches the shapes described in this spec.
- Phase 2 (Backend wiring): Replace mock data with real Supabase queries, wire up authentication, and connect all editable parameters to the database.

**User model:**
- Each user account is linked to one organization via a `user_org_memberships` table
- Users see only data scoped to their `org_id`
- Future-proofed: the membership table supports multiple users per org with roles (owner, admin, viewer)

---

## 2. Authentication

### 2.1 Auth Flow (to be wired in Phase 2)
Supabase Auth handles all session management, token refresh, and password reset flows.

**Sign Up flow:**
1. User enters email + password (or clicks "Sign in with Google")
2. Supabase creates the auth user
3. A row is created in `user_org_memberships` with `role = 'owner'` and `org_id = NULL`
4. Admin manually sets the `org_id` to link them to their organization
5. Until org_id is set, the user sees an "Account Pending" placeholder screen

**Sign In flow:**
1. Email/password or Google OAuth → Supabase Auth → session token
2. App queries `user_org_memberships` to get `org_id`
3. All subsequent data queries are scoped to that `org_id`

**Google OAuth for login:**
- Uses Supabase's built-in Google OAuth — same Google Cloud project, `email/profile` scope only
- This is separate from the calendar OAuth (which uses the `calendar` scope)

**Password reset:**
- Supabase Auth handles this via email link — built-in

### 2.2 Auth States (build all three screens)
- **Not logged in** → Login/signup page with email/password form and "Sign in with Google" button
- **Logged in, no org linked** → "Account Pending" page: "Your account is being set up. We'll notify you when your dashboard is ready. Contact support@masterreceptionists.com with questions."
- **Logged in, org linked** → Full dashboard

---

## 3. Top-Level Navigation & Assistant Selector

### 3.1 Assistant Selector (top-level)
Before entering the main dashboard, the user sees their organization's assistants displayed as cards (similar to how Supabase shows projects). Each card shows:
- Assistant name or inbound phone number
- Status indicator (active = green dot)
- Current subscription tier (e.g., "Professional Plan")
- Quick stats: total calls this month, total bookings this month

Clicking an assistant card enters the dashboard for that specific assistant.

If the org only has ONE assistant, skip this screen and go directly to the dashboard for that assistant.

**Mock data:** Show 2 assistant cards:
- "Main Receptionist" — +1 (989) 295-5900 — Professional Plan — 47 calls, 12 bookings
- "After Hours Line" — +1 (732) 984-394 — Starter Plan — 23 calls, 8 bookings

### 3.2 Sidebar Navigation (inside assistant dashboard)
Once inside an assistant's dashboard:
```
← Back to Assistants    (returns to assistant selector)
📊  Dashboard           (overview with KPI cards and charts)
📞  Call History         (searchable call log table)
📅  Calendars           (schedule, overrides, calendar settings)
⚙️  Settings            (block list, notifications, account)
```

### 3.3 Layout
- Dark sidebar (left) with navigation items
- Assistant name and plan tier shown at top of sidebar
- Light content area (right) with page header and content
- Mobile responsive — sidebar collapses to hamburger on small screens
- Top-right corner: user avatar/email with dropdown (Account Settings, Sign Out)

---

## 4. Page: Dashboard (Home/Overview)

The landing page after selecting an assistant. Shows high-level summary and trends. All data is scoped to the selected assistant.

### 4.1 Month Selector
A dropdown at the top of the page allowing the user to select a specific month. Default: current month. Shows previous months in the dropdown going back 12 months.

### 4.2 Subscription Plan Card (top, full width or prominent placement)
A highlighted card showing:
- **Plan name**: e.g., "Professional Plan"
- **Billing cycle**: e.g., "Monthly"
- **Status**: Active (green badge)
- Mock: "Professional Plan — Monthly — Active"
- Data source: `org_assistant_pricing_tiers`

### 4.3 KPI Summary Cards (row of 4)

| Card | Mock Value | Description | Data Source (Phase 2) |
|------|-----------|-------------|----------------------|
| Total Calls | 147 | Calls handled this month | `kpi_call_minutes_by_assistant_monthly.total_calls` |
| Appointments Booked | 43 (38 active) | Bookings this month (active = not cancelled) | `kpi_bookings_by_assistant_monthly.total_bookings` and `.active` |
| Booking Conversion Rate | 29.3% | % of calls that resulted in a booking | `kpi_booking_conversion_rate.conversion_rate_pct` |
| Total Call Minutes | 84.5 min | Total minutes of calls handled | `kpi_call_minutes_by_assistant_monthly.total_minutes` |

### 4.4 After-Hours Bookings Highlight Card (prominent, full width)
This is the single most important value metric. Display it prominently with emphasis.

- **Main number**: "12 bookings captured after hours"
- **Percentage**: "28% of all bookings were made while you were closed"
- **Value message**: "These are appointments that would have been missed without your AI receptionist."
- Mock: 12 after-hours bookings, 28% of total
- Data source: `kpi_after_hours_bookings`
- Scoped by selected month

### 4.5 Secondary KPI Cards (row of 3)

| Card | Mock Value | Description | Data Source |
|------|-----------|-------------|------------|
| Cancellation Rate | 4.7% | % of bookings cancelled | `kpi_cancellation_rate.cancellation_rate_pct` |
| Avg Call Duration | 1m 24s | Average call length | `kpi_call_minutes_by_assistant_monthly.avg_duration_seconds` |
| Unique Callers | 38 | Distinct phone numbers (if available from call_logs) | Computed from `call_logs` |

### 4.6 Charts

**Chart 1: Call Volume Over Time** (bar chart)
- X-axis: days of the selected month
- Y-axis: number of calls per day
- Mock: 30 data points with realistic variation (3-10 calls per day)
- Data source: `kpi_call_minutes_by_assistant_daily` (total_calls by day)

**Chart 2: Bookings Over Time** (bar chart)
- X-axis: days of the selected month
- Y-axis: number of bookings per day
- Two series: "Active" and "Cancelled" (stacked or grouped)
- Mock: 30 data points
- Data source: `kpi_bookings_by_assistant_daily` (total_bookings, cancelled, active by day)

**Chart 3: Calls by Hour of Day** (bar chart)
- X-axis: hours (6 AM - 10 PM)
- Y-axis: total calls at that hour
- Mock: distribution peaking at 10 AM and 2 PM
- Data source: `kpi_calls_by_hour`
- Ideally filterable: "Yesterday", "Last 7 days", "Last 30 days", "All time"

**Chart 4: Calls by Day of Week** (bar chart)
- X-axis: Mon–Sun
- Y-axis: total calls on that day of week
- Mock: higher on weekdays, lower on weekends
- Data source: `kpi_calls_by_day_of_week`
- Ideally filterable: "Last week", "Last 4 weeks", "All time"

### 4.7 Additional Dashboard Widgets

**New vs Repeat Callers** (donut/ring chart with percentages)
- Two segments: "New Callers" and "Repeat Callers" with percentage labels
- Mock: 65% new (24 callers), 35% repeat (13 callers)
- Framing note below chart: "Repeat callers indicate trust in your AI receptionist"
- Data source: `kpi_new_vs_repeat_callers`

**Top Callers** (leaderboard table, top 5-10)
- Columns: Rank, Phone Number, Total Calls, Total Minutes
- Sorted by total calls descending
- Mock: 5 rows with 3-8 calls each
- Data source: `kpi_top_callers`

### 4.8 Recent Activity Feed
A scrollable list showing the last 10-15 events:
- "📅 Appointment booked: [title] on [date] at [time]"
- "🗑️ Appointment cancelled: [title]"
- "📞 Call from [number] — [duration]"
- "🔄 Appointment rescheduled: [title] moved to [new date/time]"
- Mock: 10 realistic entries with timestamps from the last few days
- Data source: merged from `booked_events` and `call_logs`, sorted by timestamp

---

## 5. Page: Call History

A searchable, filterable table of all calls for the selected assistant.

### 5.1 Filters Bar (top of page)
- Date range picker (start date — end date)
- Search by caller phone number (text input)
- End reason filter dropdown

### 5.2 Call Log Table
Sortable columns. Paginated (25 rows per page).

| Column | Mock Data | Data Source (Phase 2) |
|--------|----------|----------------------|
| Date/Time | "Mar 8, 2026 2:34 PM" | `call_logs.call_started_at` |
| Caller | "+1 (989) 295-5900" | `call_logs.caller_number` |
| Duration | "1m 24s" | `call_logs.duration_seconds` |
| Tools Used | "get_availability, book_appointment" | `call_logs.tools_called` |
| End Reason | "customer-ended-call" | `call_logs.end_reason` |

### 5.3 Call Detail View (expandable row or slide-out panel)
When clicking a row, show:

- **Summary** — AI-generated summary (mock: 2-3 sentence summary). Shows "Summary not available" if null.
- **Transcript** — Full call transcript (mock: 10-15 lines of dialogue). Shows "Transcripts are not enabled for this assistant. Contact support to enable." if null.
- **Recording** — Audio player if URL present. Shows "Recording not available" if null.
- **Tools Called** — List of tools used during the call
- **Call Metadata** — Call ID, Start Time, End Time, Inbound Number

---

## 6. Page: Calendars & Scheduling

Manages everything related to the selected assistant's calendars.

### 6.1 Calendar Selector
If the assistant is linked to multiple calendars, show tabs or a dropdown.
- Display: Calendar email, connection status (green dot = authorized)
- Mock: "hubertjanus99@gmail.com (Authorized)" and "mysticmango49@gmail.com (Authorized)"
- Data source: `assistant_calendar_link` joined with `calendar_config`

### 6.2 Weekly Schedule Editor
Visual weekly grid for setting regular business hours on the selected calendar.

**Layout:**
- 7 rows (Monday–Sunday), each showing the day name
- Each row shows current shifts as colored time blocks (e.g., "12:00 PM - 8:00 PM")
- "Add Shift" button per row for multiple shifts per day
- "Remove" button per shift
- "Mark as Closed" toggle per day
- "Save Schedule" button at bottom

**Time inputs:** Dropdown selects in 15-minute increments

**Mock data:**
- Mon–Fri: 12:00 PM - 8:00 PM
- Sat: 9:00 AM - 5:00 PM
- Sun: Closed

**Data source:** `calendar_availability_hours`
**Write behavior:** DELETE all rows for this calendar, then INSERT new schedule.

### 6.3 Schedule Overrides
Section below the weekly schedule for date-specific overrides.

**Upcoming Overrides Table:**
| Column | Description |
|--------|------------|
| Date | Override date |
| Status | "Closed" (red badge) or "Custom Hours: 9:00 AM - 12:00 PM" (yellow badge) |
| Reason | e.g., "Christmas", "Half day" |
| Active | Toggle switch |
| Actions | Edit, Delete |

**Add Override form/modal:**
- Date picker
- Toggle: "Closed all day" vs "Custom hours"
- If custom hours: shift inputs with "Add Shift" for multiple
- Reason text input (optional)
- Save button

**Mock data:**
- Dec 25, 2026 — Closed — "Christmas"
- Dec 24, 2026 — Custom: 9:00 AM - 12:00 PM — "Christmas Eve (half day)"
- Jan 1, 2027 — Closed — "New Year's Day"

**Data source:** `calendar_availability_overrides`

### 6.4 Calendar Settings
Form with labeled inputs for each editable parameter on the selected calendar.

| Parameter | Label | Input Type | Min | Max | Help Text | Mock Value |
|-----------|-------|-----------|-----|-----|-----------|------------|
| `front_overhang_mins` | Buffer Before Appointments | Number | 5 | 60 | "Minutes of buffer time before each appointment. Prevents back-to-back bookings." | 15 |
| `back_overhang_mins` | Buffer After Appointments | Number | 0 | 60 | "Minutes of buffer time after each appointment." | 0 |
| `min_event_duration_mins` | Minimum Appointment Length | Number | 5 | (max) | "Shortest appointment allowed (minutes)." | 15 |
| `max_event_duration_mins` | Maximum Appointment Length | Number | (min) | 480 | "Longest appointment allowed (minutes)." | 60 |
| `default_event_duration_mins` | Default Appointment Length | Number | (min) | (max) | "Default length when caller doesn't specify." | 30 |
| `max_bookings_per_caller` | Max Bookings Per Caller | Number | 1 | 20 | "Maximum upcoming appointments per caller." | 3 |
| `min_booking_lead_time_hours` | Minimum Booking Notice | Number | 0 | 72 | "Hours in advance appointments must be booked." | 1 |
| `max_booking_lead_time_days` | Maximum Booking Window | Number | 1 | 90 | "How far ahead callers can book (days)." | 30 |
| `min_cancellation_lead_time_hours` | Minimum Cancellation Notice | Number | 0 | 72 | "Hours in advance appointments can be cancelled." | 0 |
| `event_metadata_visible` | Show Caller Details in Calendar | Toggle | — | — | "Show caller name, phone, and email in Google Calendar event descriptions." | ON |
| `respect_transparent_events` | Block 'Free' Calendar Events | Toggle | — | — | "Events marked 'free' on Google Calendar still block booking." | ON |
| `event_match_window_mins` | Appointment Match Window | Number | 5 | 120 | "How precisely callers must specify time for cancel/reschedule (minutes)." | 30 |

**"Save Changes" button** with confirmation toast.

### 6.5 Assistant Calendar Authorization
For each calendar linked to this assistant:

| Column | Description |
|--------|------------|
| Calendar | Calendar email |
| Authorized | Toggle switch |

**Warning on deauthorize:** "This will prevent the assistant from booking, cancelling, or rescheduling on this calendar. Are you sure?"

---

## 7. Page: Settings

### 7.1 Block List Editor
For the selected assistant.

- Current blocked numbers as removable chips (e.g., "+1 (555) 123-4567 ✕")
- "Add Number" with three fields:
  - Country Code: prefilled "+1", max 4 chars
  - Area Code: placeholder "555", exactly 3 digits
  - Number: placeholder "1234567", exactly 7 digits
- Validation: all required, digits only, proper length
- Remove button with confirmation dialog

**Mock:** 2 blocked numbers

### 7.2 Assistant Info (read-only)
- Assistant ID (truncated with copy button)
- Inbound Phone Number (formatted)
- Status: Active indicator (green dot, not a toggle)
- Call Logging: "Enabled" or "Disabled" — "(Contact support to change)"
- Transcripts: "Enabled" or "Disabled" — "(Contact support to change)"
- Summaries: "Enabled" or "Disabled" — "(Contact support to change)"

### 7.3 Notification Settings
Table of notification rules for this assistant.

| Column | Description |
|--------|------------|
| Event | "New Booking", "Cancellation", "Reschedule", "Availability Check" |
| Channel | "Pushover" or "Slack" with icon — read-only |
| Recipient | Label (e.g., "Gavin", "Team") — read-only |
| Enabled | Toggle switch |

**Note below table:** "To set up new notification channels or change recipients, contact support."

### 7.4 Account Settings
- Email (read-only)
- Organization name (read-only)
- Change Password button
- Sign Out button

---

## 8. Non-Editable Parameters (Admin Only)

Not exposed in the dashboard. Changes require contacting support.

| Table | Field | Reason |
|-------|-------|--------|
| `assistant_config` | `is_active` | Stops all call routing |
| `assistant_config` | `call_logging_enabled` | Legal compliance (wiretapping laws) |
| `assistant_config` | `transcripts_enabled` | Legal compliance (wiretapping laws) |
| `assistant_config` | `summary_enabled` | Tied to transcript toggle |
| `calendar_config` | `is_active` | Breaks all tools |
| `calendar_config` | `refresh_token` | Security sensitive |
| `calendar_config` | `auth_method`, `calendar_provider` | System config |
| `calendar_config` | `google_sync_token`, `watch_*` | Infrastructure |
| `notification_config` | `channel`, `channel_config` | Contains API keys |
| `assistant_calendar_link` | `verification_mode` | Security setting |
| `organization_config` | Everything | Core identity |
| `org_assistant_pricing_tiers` | `subscription_fee` | Avoid cost-focused framing |

---

## 9. Design Guidelines

### General
- Clean, professional SaaS dashboard aesthetic
- Dark sidebar with light content area
- Mobile responsive
- Recharts for all charts

### Key Design Principles
- **Value-first framing**: Lead with metrics that show the system's value (after-hours captures, conversion rate, calls handled) rather than cost metrics
- **After-hours highlight**: The after-hours bookings card should be visually distinct and prominent — this is the #1 proof of value
- **Trust indicators**: Frame repeat callers positively ("indicates trust in your AI receptionist")

### Components
- KPI cards: large number + label + optional trend indicator (↑↓ with percentage vs last month)
- Data tables: sortable, paginated, row hover
- Forms: labels above inputs, help text below, inline validation
- Toggles: shadcn/ui Switch
- Time pickers: dropdowns in 15-minute increments
- Charts: consistent color palette across all charts

### Feedback & States
- Loading skeletons (not spinners) for data areas
- Empty states with helpful messaging
- Toast notifications for saves (green = success, red = error)
- Confirmation dialogs for destructive actions
- Disabled/grayed state for read-only fields with "Contact support" notes

### Mock Data Quality
- Realistic phone numbers formatted as +1 (XXX) XXX-XXXX
- Realistic appointment titles ("Outlet Repair", "Annual Checkup", "Consultation")
- Realistic durations (30s - 5min range)
- Chart data with realistic patterns (weekday > weekend, business hours peak)
- After-hours percentage between 20-40% (this is the sweet spot that demonstrates value)

---

## 10. Implementation Order

### Phase 1: Visual Scaffold (AI frontend generator)
1. Project scaffolding — Vite + React + Tailwind + shadcn/ui + React Router
2. Auth pages — Login, signup, password reset, "Account Pending" (visual only)
3. Assistant selector screen — Cards for each assistant
4. Layout shell — Sidebar, header with user menu, main content area
5. Dashboard page — Plan card + KPI cards + after-hours highlight + charts + widgets + activity feed
6. Call History page — Filterable table + expandable detail view
7. Calendars page — Schedule editor, overrides, calendar settings, authorization
8. Settings page — Block list, assistant info, notification toggles, account

### Phase 2: Backend Wiring
1. Supabase client setup + auth wiring + protected routes
2. RLS policies (already deployed)
3. Dashboard data — Real queries to KPI views
4. Call History — Real queries to call_logs
5. Calendar management — CRUD for hours, overrides, settings
6. Settings — Block list CRUD, notification toggles
7. End-to-end testing
