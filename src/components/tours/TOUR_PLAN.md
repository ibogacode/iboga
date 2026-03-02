# Page Tour Plan – Structure & Guide Steps

Each page has a **floating help trigger** (circle with ?) in the bottom-right corner that starts the guide. Tour completion is stored per page in `localStorage`.

---

## 1. Client Management (`/patient-management`)

**Purpose:** Manage active clients, view status (Present / Arriving Soon / Discharged), complete one-time forms, open daily forms, discharge clients.

**Structure:**
- **Header** – Title "Client Management", subtitle
- **Stats cards** (4) – Currently Present, Total Clients, One-Time Forms completion, Current View count
- **Status filter** – Buttons: Currently Present, Arriving Soon, Discharged, All Clients
- **Clients table** – Sortable columns: Client, Program, Status, One-Time Forms, Arrival, Actions (View profile, One-time forms, Daily forms, Discharge)

**Tour steps:**
1. Page header (title + subtitle)
2. Stats cards row
3. Status filter buttons
4. Clients table (section + explanation of columns and actions)

---

## 2. One-Time Forms (`/patient-management/[id]/one-time-forms`)

**Purpose:** Per-client one-time forms: Medical Intake Report (all programs), Psychological Intake (non-neurological), Parkinson’s reports (neurological only). Fill or view each form.

**Structure:**
- **Back** – Back to Client Management
- **Header** – Title "One-Time Forms", client name + program
- **Forms grid** – Cards for Medical Intake Report, Psychological Intake (if not neuro), Parkinson’s Psychological + Mortality (if neuro). Each card: title, description, status (completed/pending), Fill/View button
- **Medical Health History** (optional section) – View uploaded document

**Tour steps:**
1. Back button + navigation
2. Page header (client context)
3. Forms grid / first form card (explain program-specific forms)
4. Medical Health History section (if present)

---

## 3. Daily Forms (`/patient-management/[id]/daily-forms`)

**Purpose:** Per-client daily forms by date: Psychological Update, Medical Update, SOWS/OOWS (addiction only). Select date, open form type, view history.

**Structure:**
- **Back** – Back to Client Management
- **Header** – Title "Daily Forms", client name
- **Date selection** – Date input (EST), selected date label
- **Form type cards** – Psychological, Medical, SOWS, OOWS (last two only for addiction). Each shows status for selected date
- **Forms history** – Lists by type (Psychological, Medical, SOWS, OOWS) with dates and completion

**Tour steps:**
1. Back button
2. Page header
3. Date selection
4. Form type cards (explain Psychological, Medical, addiction-specific)
5. Forms history section

---

## 4. Onboarding (`/onboarding`)

**Purpose:** Track clients in onboarding: release, outing consent, regulations, EKG, bloodwork, consult, pre-integration. Move to Client Management when ready.

**Structure:**
- **Header** – Title "Onboarding", subtitle
- **Ready-to-move banner** (conditional) – Clients ready for management, View links
- **Stats cards** (4) – Clients in Onboarding, Completion Rate, Ready for Management, Pending Steps
- **Filter tabs** – All, In Progress, Completed
- **Clients table** – Client, Program, Steps (X/7), Treatment Date, Actions (View profile, Set date, Upload forms, Move to Management)

**Tour steps:**
1. Page header
2. Ready-to-move banner (if visible)
3. Stats cards
4. Filter tabs
5. Clients table and actions

---

## 5. Client Pipeline (`/patient-pipeline`)

**Purpose:** Track inquiries (invites + applications), prospects, readiness for onboarding. Add Client, Add Existing, filters, view client profile.

**Structure:**
- **Header** – Title "Client Pipeline", subtitle; actions: Add Client, Add Existing
- **Filters** – Date range, Program, Source (lead source)
- **Stats cards** (4) – Total Inquiries, Prospects, Ready for onboarding, Estimated pipeline value
- **Tabs** – Applications | Invites (or single list)
- **Prospects table** (optional) – Marked prospects
- **Applications/Invites list** – Cards or table with View, program, date, form completion; pagination

**Tour steps:**
1. Page header + Add Client / Add Existing
2. Filters (date, program, source)
3. Stats cards
4. Applications / Invites list and View action

---

## 6. Facility Management (`/facility-management`)

**Purpose:** Facility overview (occupancy, beds, revenue, staff load), manage employees (add, edit, role, pay rate).

**Structure:**
- **Header** – Title "Facility Overview", subtitle; Add Employee button
- **Stats cards** (4) – Occupancy, Beds available (next 30 days), Confirmed revenue, Staff load
- **Employees section** – Title, count; table: Name, Email, Role, Phone, Pay rate, Actions (Edit)

**Tour steps:**
1. Page header + Add Employee
2. Stats cards (occupancy, beds, revenue, staff load)
3. Employees table and Edit

---

## 7. Patient Profile (existing)

Already has full tour; will add the same **floating ? trigger** in bottom-right and keep "Start Tour" optional in header or remove in favor of the trigger.

---

## Implementation notes

- **Floating trigger:** One component, fixed bottom-right, circle with `?`, `aria-label="Start page guide"`, calls `onClick` to start tour.
- **Storage keys:** `hasSeenClientManagementTour`, `hasSeenOneTimeFormsTour`, `hasSeenDailyFormsTour`, `hasSeenOnboardingTour`, `hasSeenClientPipelineTour`, `hasSeenFacilityManagementTour`, `hasSeenPatientProfileTour`.
- **data-tour:** Use `data-tour="section-name"` on the main wrapper for each section (e.g. `data-tour="page-header"`, `data-tour="stats-cards"`, `data-tour="status-filter"`, `data-tour="clients-table"`).
