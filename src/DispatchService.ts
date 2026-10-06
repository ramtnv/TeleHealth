import type {
  Clock,
  Clinician,
  Consultation,
  DispatchSnapshot,
  Patient,
} from "./domain";

export const MAX_CLINICIANS = 12;

export class DispatchService {
  private readonly clinicians = new Map<string, Clinician>();
  private readonly waitingPatients: Patient[] = [];
  private readonly consultations: Consultation[] = [];
  private nextConsultationId = 1;

  constructor(
    clinicians: Array<Pick<Clinician, "id" | "name">> = [],
    private readonly clock: Clock = Date.now,
  ) {
    if (clinicians.length > MAX_CLINICIANS) {
      throw new RangeError(`A maximum of ${MAX_CLINICIANS} clinicians is supported.`);
    }

    for (const clinician of clinicians) {
      this.assertNonEmpty(clinician.id, "Clinician ID");
      this.assertNonEmpty(clinician.name, "Clinician name");
      if (this.clinicians.has(clinician.id)) {
        throw new Error(`Clinician "${clinician.id}" is already registered.`);
      }
      this.clinicians.set(clinician.id, {
        ...clinician,
        status: "AVAILABLE",
        availableSince: this.clock(),
        currentConsultationId: null,
      });
    }
  }

  enqueue_patient(patientId: string, name = patientId): Consultation[] {
    this.assertNonEmpty(patientId, "Patient ID");
    this.assertNonEmpty(name, "Patient name");
    if (
      this.waitingPatients.some((patient) => patient.id === patientId) ||
      this.consultations.some((consultation) => consultation.patient.id === patientId)
    ) {
      throw new Error(`Patient "${patientId}" has already been queued or matched.`);
    }

    this.waitingPatients.push({ id: patientId, name, queuedAt: this.clock() });
    return this.dispatch();
  }

  add_clinician(clinicianId: string, name: string): void {
    this.assertNonEmpty(clinicianId, "Clinician ID");
    this.assertNonEmpty(name, "Clinician name");
    if (this.clinicians.has(clinicianId)) {
      throw new Error(`Clinician "${clinicianId}" is already registered.`);
    }
    if (this.clinicians.size >= MAX_CLINICIANS) {
      throw new RangeError(`A maximum of ${MAX_CLINICIANS} clinicians is supported.`);
    }

    this.clinicians.set(clinicianId, {
      id: clinicianId,
      name,
      status: "OFFLINE",
      availableSince: null,
      currentConsultationId: null,
    });
  }

  set_clinician_status(clinicianId: string, status: "AVAILABLE" | "OFFLINE"): Consultation[] {
    const clinician = this.getClinician(clinicianId);
    if (clinician.status === "BUSY") {
      throw new Error(`Clinician "${clinicianId}" must complete the active consultation first.`);
    }

    if (status === "AVAILABLE" && clinician.status !== "AVAILABLE") {
      clinician.status = "AVAILABLE";
      clinician.availableSince = this.clock();
      return this.dispatch();
    }

    if (status === "OFFLINE") {
      clinician.status = "OFFLINE";
      clinician.availableSince = null;
    }

    return [];
  }

  complete_consultation(clinicianId: string): Consultation[] {
    const clinician = this.getClinician(clinicianId);
    if (clinician.status !== "BUSY" || clinician.currentConsultationId === null) {
      throw new Error(`Clinician "${clinicianId}" has no active consultation to complete.`);
    }

    const consultation = this.consultations.find(
      (item) => item.id === clinician.currentConsultationId,
    );
    if (!consultation) {
      throw new Error(`Active consultation "${clinician.currentConsultationId}" was not found.`);
    }

    consultation.status = "COMPLETED";
    consultation.completedAt = this.clock();
    clinician.status = "AVAILABLE";
    clinician.availableSince = consultation.completedAt;
    clinician.currentConsultationId = null;

    return this.dispatch();
  }

  dispatch(): Consultation[] {
    const created: Consultation[] = [];
    while (this.waitingPatients.length > 0) {
      const clinician = this.getLongestIdleClinician();
      if (!clinician) break;
      created.push(this.assignNextPatient(clinician));
    }
    return created;
  }

  get_next_match(): Consultation | null {
    const clinician = this.getLongestIdleClinician();
    if (!clinician || this.waitingPatients.length === 0) return null;
    return this.assignNextPatient(clinician);
  }

  get_snapshot(): DispatchSnapshot {
    return {
      clinicians: [...this.clinicians.values()].map((clinician) => ({ ...clinician })),
      queue: this.waitingPatients.map((patient) => ({ ...patient })),
      consultations: this.consultations.map((consultation) => ({
        ...consultation,
        patient: { ...consultation.patient },
      })),
    };
  }

  private getLongestIdleClinician(): Clinician | undefined {
    let selected: Clinician | undefined;
    for (const clinician of this.clinicians.values()) {
      if (clinician.status !== "AVAILABLE") continue;
      if (
        !selected ||
        (clinician.availableSince ?? Number.POSITIVE_INFINITY) <
          (selected.availableSince ?? Number.POSITIVE_INFINITY)
      ) {
        selected = clinician;
      }
    }
    return selected;
  }

  private assignNextPatient(clinician: Clinician): Consultation {
    const patient = this.waitingPatients.shift();
    if (!patient) throw new Error("Cannot assign a clinician when the patient queue is empty.");

    const consultation: Consultation = {
      id: `consultation-${this.nextConsultationId++}`,
      patient,
      clinicianId: clinician.id,
      clinicianName: clinician.name,
      status: "IN_PROGRESS",
      assignedAt: this.clock(),
      completedAt: null,
    };
    clinician.status = "BUSY";
    clinician.availableSince = null;
    clinician.currentConsultationId = consultation.id;
    this.consultations.unshift(consultation);
    return consultation;
  }

  private getClinician(clinicianId: string): Clinician {
    const clinician = this.clinicians.get(clinicianId);
    if (!clinician) throw new Error(`Clinician "${clinicianId}" is not registered.`);
    return clinician;
  }

  private assertNonEmpty(value: string, label: string): void {
    if (value.trim().length === 0) throw new Error(`${label} cannot be empty.`);
  }
}
