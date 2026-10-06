import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  HeartPulse,
  Headset,
  Plus,
  Signal,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { DispatchService, MAX_CLINICIANS } from "./DispatchService";
import SuperAdminPage from "./SuperAdminPage";
import type { Clinician, DispatchSnapshot } from "./domain";

const initialClinicians = [
  { id: "clinician-1", name: "Dr. Olivia Chen" },
  { id: "clinician-2", name: "Dr. James Patel" },
  { id: "clinician-3", name: "Dr. Maya Williams" },
  { id: "clinician-4", name: "Dr. Ethan Brooks" },
];

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function elapsedLabel(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
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
  if (clinician.status === "BUSY") return "In consultation";
  if (clinician.status === "OFFLINE") return "Off shift";
  if (clinician.availableSince === null) return "Available";
  return `Available · idle ${elapsedLabel(clinician.availableSince, now)}`;
}

function getClinicianStatusLabel(clinician: Clinician): string {
  if (clinician.status === "BUSY") return "Busy";
  return clinician.status === "AVAILABLE" ? "Ready" : "Offline";
}

function getClinicianActionLabel(clinician: Clinician): string {
  if (clinician.status === "BUSY") return `Complete consultation for ${clinician.name}`;
  return clinician.status === "AVAILABLE"
    ? `Set ${clinician.name} offline`
    : `Set ${clinician.name} available`;
}

function ClinicianActionIcon({ clinician }: { clinician: Clinician }) {
  if (clinician.status === "BUSY") return <Check size={15} />;
  return clinician.status === "AVAILABLE" ? <WifiOff size={15} /> : <Wifi size={15} />;
}

export default function App() {
  const serviceRef = useRef<DispatchService | null>(null);
  serviceRef.current ??= new DispatchService(initialClinicians);
  const service = serviceRef.current;
  const [snapshot, setSnapshot] = useState<DispatchSnapshot>(() => service.get_snapshot());
  const [patientName, setPatientName] = useState("");
  const [clinicianName, setClinicianName] = useState("");
  const [error, setError] = useState("");
  const [clockNow, setClockNow] = useState(Date.now());
  const [currentPage, setCurrentPage] = useState<"dispatch" | "admin">("dispatch");
  const patientSequence = useRef(1);
  const clinicianSequence = useRef(initialClinicians.length + 1);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = () => {
    setSnapshot(service.get_snapshot());
    setClockNow(Date.now());
  };

  const runAction = (action: () => void) => {
    try {
      setError("");
      action();
      refresh();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Something went wrong.");
    }
  };

  const addPatient = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = patientName.trim();
    if (!name) return;
    runAction(() => {
      const id = `patient-${patientSequence.current++}`;
      service.enqueue_patient(id, name);
      setPatientName("");
    });
  };

  const addClinician = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = clinicianName.trim();
    if (!name) return;
    runAction(() => {
      const id = `clinician-${clinicianSequence.current++}`;
      service.add_clinician(id, name);
      setClinicianName("");
    });
  };

  const updateClinician = (clinician: Clinician) => {
    runAction(() => {
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

  const activeClinicians = snapshot.clinicians.filter(
    (clinician) => clinician.status !== "OFFLINE",
  ).length;
  const availableClinicians = snapshot.clinicians.filter(
    (clinician) => clinician.status === "AVAILABLE",
  ).length;
  const waitingCount = snapshot.queue.length;
  const activeCount = snapshot.consultations.filter(
    (consultation) => consultation.status === "IN_PROGRESS",
  ).length;
  const completedCount = snapshot.consultations.filter(
    (consultation) => consultation.status === "COMPLETED",
  ).length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" type="button" onClick={() => setCurrentPage("dispatch")} aria-label="Careflow home">
          <span className="brand-mark"><HeartPulse size={21} strokeWidth={2.4} /></span>
          <span>careflow<span className="brand-dot">.</span></span>
        </button>

        <div className="workspace-switcher">
          <div className="workspace-icon">N</div>
          <div className="workspace-copy">
            <span>WORKSPACE</span>
            <strong>Northstar Health</strong>
          </div>
          <ArrowDown size={14} />
        </div>

        <div className="sidebar-label">OPERATIONS</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={`nav-item ${currentPage === "dispatch" ? "active" : ""}`} onClick={() => setCurrentPage("dispatch")}>
            <Activity size={18} /><span>Live dispatch</span><span className="nav-live" />
          </button>
          <button className="nav-item" onClick={() => { setCurrentPage("dispatch"); document.getElementById("clinicians")?.scrollIntoView({ behavior: "smooth" }); }}>
            <UsersRound size={18} /><span>Care team</span>
          </button>
          <button className="nav-item" onClick={() => { setCurrentPage("dispatch"); document.getElementById("consultations")?.scrollIntoView({ behavior: "smooth" }); }}>
            <Clock3 size={18} /><span>Consultations</span>
          </button>
          <button className={`nav-item ${currentPage === "admin" ? "active" : ""}`} onClick={() => setCurrentPage("admin")}>
            <ShieldCheck size={18} /><span>Super admin</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-card">
            <span className="system-pulse"><Signal size={15} /></span>
            <div><strong>All systems healthy</strong><span>Dispatch engine online</span></div>
            <span className="healthy-dot" />
          </div>
          <div className="profile">
            <div className="profile-avatar">SC</div>
            <div className="profile-copy"><strong>Sam Carter</strong><span>Administrator</span></div>
            <ArrowUpRight size={16} />
          </div>
        </div>
      </aside>

      <section className="main-panel" id="dispatch">
        <header className="topbar">
          <div className="breadcrumbs"><span>Operations</span><span className="breadcrumb-slash">/</span><strong>{currentPage === "admin" ? "Super admin" : "Live dispatch"}</strong></div>
          <div className="topbar-right">
            <span className="live-indicator"><i /> LIVE</span>
            <span className="topbar-divider" />
            <span className="local-time">{new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(clockNow)}</span>
            <div className="mini-avatar">SC</div>
          </div>
        </header>

        <div className="content">
          {currentPage === "admin" ? (
            <SuperAdminPage
              service={service}
              snapshot={snapshot}
              clockNow={clockNow}
              error={error}
              onAction={runAction}
              onDismissError={() => setError("")}
            />
          ) : (
            <>
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> CARE COORDINATION</div>
              <h1>Dispatch <span>overview</span></h1>
              <p>Real-time patient matching, made effortless.</p>
            </div>
            <div className="heading-status"><span className="status-dot" /> Dispatch is active</div>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <X size={17} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button>
            </div>
          )}

          <section className="metrics-grid" aria-label="Dispatch metrics">
            <article className="metric-card metric-waiting">
              <div className="metric-top"><span className="metric-icon orange"><Clock3 size={18} /></span><span className="metric-caption">IN QUEUE</span><span className="metric-trend"><ArrowUpRight size={14} /> LIVE</span></div>
              <div className="metric-number">{waitingCount}<span>patient{waitingCount === 1 ? "" : "s"}</span></div>
              <div className="metric-foot"><span className="metric-foot-dot orange-dot" />Waiting to be matched</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon green"><UsersRound size={18} /></span><span className="metric-caption">ON SHIFT</span></div>
              <div className="metric-number">{activeClinicians}<span>clinicians</span></div>
              <div className="metric-foot"><span className="metric-foot-dot green-dot" />{availableClinicians} ready for patients</div>
            </article>
            <article className="metric-card">
              <div className="metric-top"><span className="metric-icon purple"><Headset size={18} /></span><span className="metric-caption">IN CONSULTATION</span></div>
              <div className="metric-number">{activeCount}<span>active</span></div>
              <div className="metric-foot"><span className="metric-foot-dot purple-dot" />{completedCount} completed today</div>
            </article>
          </section>

          <div className="work-grid">
            <section className="panel queue-panel" aria-labelledby="queue-title">
              <div className="panel-header">
                <div><div className="section-kicker">PATIENT FLOW</div><h2 id="queue-title">Waiting room <span className="count-pill">{waitingCount}</span></h2></div>
                <span className="fifo-badge"><span>01</span> FIFO queue</span>
              </div>
              <form className="add-patient-form" onSubmit={addPatient}>
                <UserRound size={17} />
                <input aria-label="Patient name" placeholder="Add a patient to the queue..." value={patientName} onChange={(event) => setPatientName(event.target.value)} />
                <button type="submit" disabled={!patientName.trim()}><Plus size={16} /><span>Add patient</span></button>
              </form>
              <div className="queue-table-head"><span>POSITION / PATIENT</span><span>WAIT TIME</span><span>STATUS</span></div>
              {snapshot.queue.length > 0 ? (
                <ol className="queue-list">
                  {snapshot.queue.map((patient, index) => (
                    <li className="queue-row" key={patient.id}>
                      <div className="patient-cell"><span className={`queue-position ${index === 0 ? "first" : ""}`}>{String(index + 1).padStart(2, "0")}</span><div className="patient-avatar">{initials(patient.name)}</div><div className="patient-info"><strong>{patient.name}</strong><span>Joined {formatTime(patient.queuedAt)}</span></div></div>
                      <span className="wait-time"><Clock3 size={14} />{elapsedLabel(patient.queuedAt, clockNow)}</span>
                      <span className="waiting-status"><i /> Waiting</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="empty-queue"><span className="empty-icon"><CheckCircle2 size={22} /></span><strong>All caught up</strong><span>New patients will appear here in arrival order.</span></div>
              )}
              <div className="queue-footer"><span><span className="queue-footer-dot" />Queue updates automatically</span><span>Oldest first <ArrowUpRight size={13} /></span></div>
            </section>

            <section className="panel team-panel" id="clinicians" aria-labelledby="team-title">
              <div className="panel-header">
                <div><div className="section-kicker">CLINICIAN AVAILABILITY</div><h2 id="team-title">Care team <span className="count-pill">{snapshot.clinicians.length}</span></h2></div>
                <span className="team-capacity">{snapshot.clinicians.length}/{MAX_CLINICIANS} max</span>
              </div>
              <form className="add-clinician-form" onSubmit={addClinician}>
                <input aria-label="Clinician name" placeholder="Add a clinician..." value={clinicianName} onChange={(event) => setClinicianName(event.target.value)} />
                <button type="submit" aria-label="Add clinician" disabled={!clinicianName.trim() || snapshot.clinicians.length >= MAX_CLINICIANS}><Plus size={17} /></button>
              </form>
              <div className="team-list">
                {snapshot.clinicians.map((clinician, index) => (
                  <div className="clinician-row" key={clinician.id}>
                    <div className={`clinician-avatar avatar-${index % 5}`}>{initials(clinician.name)}</div>
                    <div className="clinician-info"><strong>{clinician.name}</strong><span>{getClinicianDescription(clinician, clockNow)}</span></div>
                    <span className={`clinician-status ${clinician.status.toLowerCase()}`}><i />{getClinicianStatusLabel(clinician)}</span>
                    <button className={`clinician-action ${clinician.status.toLowerCase()}`} onClick={() => updateClinician(clinician)} aria-label={getClinicianActionLabel(clinician)}>
                      <ClinicianActionIcon clinician={clinician} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="team-legend"><span><i className="legend-ready" />Available</span><span><i className="legend-busy" />In consultation</span><span><i className="legend-offline" />Offline</span></div>
            </section>
          </div>

          <section className="panel activity-panel" id="consultations" aria-labelledby="activity-title">
            <div className="panel-header activity-header">
              <div><div className="section-kicker">MATCH HISTORY</div><h2 id="activity-title">Recent consultations</h2></div>
              <span className="activity-subtitle"><Circle size={7} fill="currentColor" /> Automatically assigned</span>
            </div>
            {snapshot.consultations.length > 0 ? (
              <div className="activity-table">
                <div className="activity-table-head"><span>PATIENT</span><span>CLINICIAN</span><span>STARTED</span><span>STATUS</span></div>
                {snapshot.consultations.slice(0, 6).map((consultation) => (
                  <div className="activity-row" key={consultation.id}>
                    <div className="activity-person"><div className="patient-avatar small-avatar">{initials(consultation.patient.name)}</div><strong>{consultation.patient.name}</strong></div>
                    <div className="activity-person clinician-person"><div className="clinician-avatar small-avatar">{initials(consultation.clinicianName)}</div><span>{consultation.clinicianName}</span></div>
                    <span className="activity-time">{formatTime(consultation.assignedAt)}</span>
                    <span className={`consultation-state ${consultation.status === "IN_PROGRESS" ? "in-progress" : "completed"}`}><i />{consultation.status === "IN_PROGRESS" ? "In progress" : "Completed"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="activity-empty"><span className="empty-icon small-empty"><Headset size={18} /></span><span>Consultations will appear here as patients are matched.</span></div>
            )}
          </section>

          <footer className="page-footer"><span>CARE, WITHOUT THE WAIT.</span><span><span className="footer-heart">♥</span> Fair matches, every time</span></footer>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
