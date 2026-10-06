import { useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDownToLine,
  Check,
  CircleAlert,
  Clock3,
  Plus,
  ShieldCheck,
  UserPlus,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { DispatchService, MAX_CLINICIANS } from "./DispatchService";
import type { Clinician, DispatchSnapshot } from "./domain";

interface SuperAdminPageProps {
  service: DispatchService;
  snapshot: DispatchSnapshot;
  clockNow: number;
  error: string;
  onAction: (action: () => void) => void;
  onDismissError: () => void;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function elapsedLabel(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function initials(name: string): string {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getClinicianDescription(clinician: Clinician, now: number): string {
  if (clinician.status === "BUSY") return "Patient consultation in progress";
  if (clinician.status === "OFFLINE") return "Off shift";
  if (clinician.availableSince === null) return "Available";
  return `Ready · idle ${elapsedLabel(clinician.availableSince, now)}`;
}

function getClinicianStatusLabel(clinician: Clinician): string {
  if (clinician.status === "BUSY") return "In consultation";
  return clinician.status === "AVAILABLE" ? "Available" : "Offline";
}

function getClinicianActionLabel(clinician: Clinician): string {
  if (clinician.status === "BUSY") return `Complete consultation for ${clinician.name}`;
  return clinician.status === "AVAILABLE"
    ? `Set ${clinician.name} offline`
    : `Set ${clinician.name} available`;
}

function ClinicianAction({ clinician }: { clinician: Clinician }) {
  if (clinician.status === "BUSY") {
    return <><Check size={14} /> Complete</>;
  }
  if (clinician.status === "AVAILABLE") {
    return <><WifiOff size={14} /> Set offline</>;
  }
  return <><Wifi size={14} /> Set available</>;
}

export default function SuperAdminPage({
  service,
  snapshot,
  clockNow,
  error,
  onAction,
  onDismissError,
}: SuperAdminPageProps) {
  const [patientName, setPatientName] = useState("");
  const [clinicianName, setClinicianName] = useState("");
  const waitingCount = snapshot.queue.length;
  const activeClinicians = snapshot.clinicians.filter(
    (clinician) => clinician.status !== "OFFLINE",
  ).length;
  const activeConsultations = snapshot.consultations.filter(
    (consultation) => consultation.status === "IN_PROGRESS",
  ).length;

  const addPatient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = patientName.trim();
    if (!name) return;
    onAction(() => {
      service.enqueue_patient(`patient-${crypto.randomUUID()}`, name);
      setPatientName("");
    });
  };

  const addClinician = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = clinicianName.trim();
    if (!name) return;
    onAction(() => {
      service.add_clinician(`clinician-${crypto.randomUUID()}`, name);
      setClinicianName("");
    });
  };

  const updateClinician = (clinician: Clinician) => {
    onAction(() => {
      if (clinician.status === "BUSY") {
        service.complete_consultation(clinician.id);
      } else {
        service.set_clinician_status(
          clinician.id,
          clinician.status === "AVAILABLE" ? "OFFLINE" : "AVAILABLE",
        );
      }
    });
  };

  return (
    <div className="super-admin-page">
      <div className="page-heading admin-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> PLATFORM CONTROL</div>
          <h1>Super admin <span>console</span></h1>
          <p>Manage patient intake, clinician availability, and live consultations.</p>
        </div>
        <div className="admin-role-badge"><ShieldCheck size={15} /> SUPER ADMIN</div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <CircleAlert size={17} />
          <span>{error}</span>
          <button onClick={onDismissError} aria-label="Dismiss error"><span>×</span></button>
        </div>
      )}

      <section className="admin-summary" aria-label="Platform status">
        <article className="admin-summary-card">
          <span className="admin-summary-icon queue-summary"><UsersRound size={18} /></span>
          <div><span>PATIENTS WAITING</span><strong>{waitingCount}</strong></div>
          <span className="admin-summary-note">FIFO queue</span>
        </article>
        <article className="admin-summary-card">
          <span className="admin-summary-icon team-summary"><Activity size={18} /></span>
          <div><span>CLINICIANS ON SHIFT</span><strong>{activeClinicians}<small> / {snapshot.clinicians.length}</small></strong></div>
          <span className="admin-summary-note">{MAX_CLINICIANS} maximum</span>
        </article>
        <article className="admin-summary-card">
          <span className="admin-summary-icon consult-summary"><Clock3 size={18} /></span>
          <div><span>ACTIVE CONSULTATIONS</span><strong>{activeConsultations}</strong></div>
          <span className="admin-summary-note">Live now</span>
        </article>
      </section>

      <div className="admin-grid">
        <section className="panel admin-panel patient-admin-panel" aria-labelledby="admin-patients-title">
          <div className="admin-panel-heading">
            <div className="admin-title-icon patient-title-icon"><UserPlus size={17} /></div>
            <div><div className="section-kicker">PATIENT OPERATIONS</div><h2 id="admin-patients-title">Add patient to queue</h2></div>
            <span className="count-pill">{waitingCount} waiting</span>
          </div>
          <form className="admin-add-form" onSubmit={addPatient}>
            <label htmlFor="admin-patient-name">Patient name</label>
            <div className="admin-input-row">
              <input id="admin-patient-name" placeholder="Enter patient's full name" value={patientName} onChange={(event) => setPatientName(event.target.value)} />
              <button type="submit" disabled={!patientName.trim()}><Plus size={16} /> Add to queue</button>
            </div>
            <span className="form-hint">Patients with an available clinician are matched automatically.</span>
          </form>
          <div className="admin-list-heading"><span>WAITING LIST</span><span>WAIT TIME</span></div>
          {snapshot.queue.length ? (
            <ol className="admin-patient-list">
              {snapshot.queue.map((patient, index) => (
                <li key={patient.id}>
                  <span className={`admin-position ${index === 0 ? "first" : ""}`}>{String(index + 1).padStart(2, "0")}</span>
                  <span className="patient-avatar">{initials(patient.name)}</span>
                  <span className="admin-list-person"><strong>{patient.name}</strong><span>Joined {formatTime(patient.queuedAt)}</span></span>
                  <span className="admin-wait-time"><Clock3 size={13} />{elapsedLabel(patient.queuedAt, clockNow)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="admin-empty-state"><UsersRound size={19} /><span>No patients waiting right now</span></div>
          )}
          <div className="admin-panel-footer"><span><i /> Queue is processed first-in, first-out</span></div>
        </section>

        <section className="panel admin-panel team-admin-panel" aria-labelledby="admin-team-title">
          <div className="admin-panel-heading">
            <div className="admin-title-icon team-title-icon"><UsersRound size={17} /></div>
            <div><div className="section-kicker">ROSTER MANAGEMENT</div><h2 id="admin-team-title">Care team</h2></div>
            <span className="team-capacity">{snapshot.clinicians.length}/{MAX_CLINICIANS}</span>
          </div>
          <form className="admin-add-form clinician-admin-form" onSubmit={addClinician}>
            <label htmlFor="admin-clinician-name">Add clinician</label>
            <div className="admin-input-row">
              <input id="admin-clinician-name" placeholder="Clinician name" value={clinicianName} onChange={(event) => setClinicianName(event.target.value)} />
              <button type="submit" disabled={!clinicianName.trim() || snapshot.clinicians.length >= MAX_CLINICIANS}><Plus size={16} /> Add</button>
            </div>
            <span className="form-hint">New clinicians are added offline. Set them available to accept patients.</span>
          </form>
          <div className="admin-list-heading clinician-list-heading"><span>CLINICIAN</span><span>STATUS / CONTROL</span></div>
          <div className="admin-clinician-list">
            {snapshot.clinicians.map((clinician, index) => (
              <div className="admin-clinician-row" key={clinician.id}>
                <span className={`clinician-avatar avatar-${index % 5}`}>{initials(clinician.name)}</span>
                <span className="admin-list-person">
                  <strong>{clinician.name}</strong>
                  <span>{getClinicianDescription(clinician, clockNow)}</span>
                </span>
                <span className={`clinician-status ${clinician.status.toLowerCase()}`}><i />{getClinicianStatusLabel(clinician)}</span>
                <button
                  className={`admin-control-button ${clinician.status.toLowerCase()}`}
                  onClick={() => updateClinician(clinician)}
                  aria-label={getClinicianActionLabel(clinician)}
                >
                  <ClinicianAction clinician={clinician} />
                </button>
              </div>
            ))}
          </div>
          <div className="admin-panel-footer"><span><i /> Busy clinicians must complete the consultation before going offline</span></div>
        </section>
      </div>

      <section className="panel admin-consultations-panel" aria-labelledby="admin-consultations-title">
        <div className="admin-panel-heading consultation-admin-heading">
          <div className="admin-title-icon consult-title-icon"><ArrowDownToLine size={17} /></div>
          <div><div className="section-kicker">LIVE OPERATIONS</div><h2 id="admin-consultations-title">Consultation control</h2></div>
          <span className="admin-live-badge"><i /> {activeConsultations} ACTIVE</span>
        </div>
        <div className="admin-consultation-table">
          <div className="admin-consultation-head"><span>PATIENT</span><span>ASSIGNED CLINICIAN</span><span>STARTED</span><span>STATUS / ACTION</span></div>
          {snapshot.consultations.length ? snapshot.consultations.slice(0, 10).map((consultation) => {
            const clinician = snapshot.clinicians.find((item) => item.id === consultation.clinicianId);
            const isActive = consultation.status === "IN_PROGRESS";
            return (
              <div className="admin-consultation-row" key={consultation.id}>
                <span className="admin-consultation-person"><span className="patient-avatar">{initials(consultation.patient.name)}</span><strong>{consultation.patient.name}</strong></span>
                <span className="admin-consultation-person"><span className="clinician-avatar">{initials(consultation.clinicianName)}</span><span>{consultation.clinicianName}</span></span>
                <span className="admin-consultation-time">{formatTime(consultation.assignedAt)}</span>
                <span className="admin-consultation-control">
                  <span className={`consultation-state ${isActive ? "in-progress" : "completed"}`}><i />{isActive ? "In consultation" : "Completed"}</span>
                  {isActive && clinician && <button onClick={() => updateClinician(clinician)}>End consultation</button>}
                </span>
              </div>
            );
          }) : (
            <div className="admin-empty-state consultation-empty"><Clock3 size={19} /><span>No consultations have been assigned yet.</span></div>
          )}
        </div>
      </section>

      <footer className="page-footer"><span>CAREFLOW PLATFORM ADMINISTRATION</span><span>Changes apply to the live dispatch queue</span></footer>
    </div>
  );
}
