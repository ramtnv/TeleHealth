export type ClinicianStatus = "AVAILABLE" | "BUSY" | "OFFLINE";
export type ConsultationStatus = "IN_PROGRESS" | "COMPLETED";

export interface Patient {
  id: string;
  name: string;
  queuedAt: number;
}

export interface Clinician {
  id: string;
  name: string;
  status: ClinicianStatus;
  availableSince: number | null;
  currentConsultationId: string | null;
}

export interface Consultation {
  id: string;
  patient: Patient;
  clinicianId: string;
  clinicianName: string;
  status: ConsultationStatus;
  assignedAt: number;
  completedAt: number | null;
}

export interface DispatchSnapshot {
  clinicians: Clinician[];
  queue: Patient[];
  consultations: Consultation[];
}

export type Clock = () => number;
