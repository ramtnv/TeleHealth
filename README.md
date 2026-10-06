# TeleHealth — Careflow Dispatch Engine

A small, runnable telehealth dispatch application with an in-memory matching service and a responsive React operations dashboard. Patients are assigned in FIFO order; when multiple clinicians are available, the clinician who has been idle the longest is selected.

## Requirements

- Node.js 20 or newer
- npm (included with Node.js)

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). The dashboard starts with four available clinicians so the matching flow can be tried immediately. No database, API server, account, or external service is required.

## Verify

```bash
npm test
npm run build
```

The test suite covers FIFO ordering, longest-idle selection, consultation completion and follow-up matching, validation rules, and a dashboard interaction.

## Using the dashboard

- Add a patient in the **Waiting room**. Patients who can be matched are assigned immediately; otherwise, they remain in FIFO order.
- Add a clinician in **Care team**. New clinicians start offline.
- Use the status action on a clinician to take them on or off shift. Bringing a clinician online automatically attempts to match the next waiting patient.
- A busy clinician's check action completes their consultation and makes them available again. Any waiting patient is assigned immediately.
- The consultations table shows active and completed assignments. Clinicians can be added up to the supported maximum of 12.
- Open **Super admin** in the left navigation for the administrative console. It provides patient intake, a waiting-list view, clinician roster/availability controls, and an active-consultation table with an **End consultation** action. All controls use the same live in-memory dispatch service as the overview.

## Dispatch rules and safeguards

1. Patients are dequeued in arrival order.
2. Among available clinicians, the smallest `availableSince` timestamp wins. Equal timestamps retain clinician registration order.
3. Assignment atomically changes the clinician to `BUSY` and records their active consultation.
4. A busy clinician cannot be taken offline or assigned another patient. Completion must happen first.
5. Patient and clinician IDs must be unique; empty names and unknown clinician IDs are rejected.
6. Clinician roster size is limited to 12. A service can also be created with no clinicians.

The service is intentionally single-threaded and in-memory; it is not a production persistence or concurrency layer.

## Project layout

```text
src/
  App.tsx                 React dispatch dashboard
  SuperAdminPage.tsx      Patient, clinician, and consultation admin console
  DispatchService.ts      Queue, availability, and consultation state machine
  domain.ts               Patient, clinician, and consultation types
  DispatchService.test.ts Matching-service unit tests
  App.test.tsx             Dashboard interaction test
  main.tsx                Browser entry point
  styles.css              Responsive dashboard styling
index.html                 Vite document shell
```

## Service API

`DispatchService` accepts clinician `{ id, name }` records and an optional millisecond clock function (useful for deterministic tests).

- `enqueue_patient(patientId, name?)` queues a unique patient and dispatches all possible matches.
- `set_clinician_status(clinicianId, "AVAILABLE" | "OFFLINE")` changes shift status; becoming available automatically dispatches waiting patients.
- `complete_consultation(clinicianId)` completes the active consultation, makes the clinician available, and dispatches waiting patients.
- `dispatch()` drains all possible matches and returns the created consultations.
- `get_next_match()` assigns at most one waiting patient and returns that consultation, or `null` when no match is possible.
- `add_clinician(clinicianId, name)` registers an offline clinician.
- `get_snapshot()` returns a copy of current clinicians, waiting patients, and consultation history.

All stored timestamps are Unix epoch milliseconds. Consultation records remain in the in-memory history after completion.
