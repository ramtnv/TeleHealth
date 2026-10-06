import { describe, expect, it } from "vitest";
import { DispatchService, MAX_CLINICIANS } from "./DispatchService";

describe("DispatchService", () => {
  it("matches patients in FIFO order", () => {
    let now = 100;
    const service = new DispatchService([], () => now);
    service.enqueue_patient("p1", "Patient One");
    service.enqueue_patient("p2", "Patient Two");
    service.add_clinician("c1", "Dr. One");
    service.add_clinician("c2", "Dr. Two");

    now = 200;
    const firstAssignments = service.set_clinician_status("c1", "AVAILABLE");
    now = 300;
    const secondAssignments = service.set_clinician_status("c2", "AVAILABLE");

    expect(firstAssignments.map((match) => match.patient.id)).toEqual(["p1"]);
    expect(secondAssignments.map((match) => match.patient.id)).toEqual(["p2"]);
    expect(firstAssignments[0].clinicianId).toBe("c1");
    expect(secondAssignments[0].clinicianId).toBe("c2");
    expect(service.get_snapshot().queue).toHaveLength(0);
  });

  it("assigns a new patient to the longest-idle available clinician", () => {
    let now = 0;
    const service = new DispatchService(
      [
        { id: "c1", name: "Dr. First" },
        { id: "c2", name: "Dr. Second" },
      ],
      () => (now += 10),
    );
    now = 100;

    const [match] = service.enqueue_patient("p1", "Patient One");

    expect(match.clinicianId).toBe("c1");
    expect(service.get_snapshot().clinicians.find((clinician) => clinician.id === "c1")?.status)
      .toBe("BUSY");
    expect(service.get_snapshot().clinicians.find((clinician) => clinician.id === "c2")?.status)
      .toBe("AVAILABLE");
  });

  it("completes a consultation and automatically assigns the next patient", () => {
    let now = 1_000;
    const service = new DispatchService([{ id: "c1", name: "Dr. One" }], () => now);
    const [firstMatch] = service.enqueue_patient("p1", "Patient One");
    service.enqueue_patient("p2", "Patient Two");

    now = 2_000;
    const followUpMatches = service.complete_consultation("c1");
    const snapshot = service.get_snapshot();

    expect(followUpMatches.map((match) => match.patient.id)).toEqual(["p2"]);
    expect(snapshot.clinicians[0].status).toBe("BUSY");
    expect(snapshot.consultations.find((match) => match.id === firstMatch.id)?.status)
      .toBe("COMPLETED");
    expect(snapshot.consultations.find((match) => match.patient.id === "p2")?.status)
      .toBe("IN_PROGRESS");
    expect(snapshot.queue).toHaveLength(0);
  });

  it("rejects duplicate patients, busy status changes, and more than 12 clinicians", () => {
    const service = new DispatchService([{ id: "c1", name: "Dr. One" }]);
    service.enqueue_patient("p1", "Patient One");

    expect(() => service.enqueue_patient("p1", "Patient One"))
      .toThrow('Patient "p1" has already been queued or matched.');
    expect(() => service.set_clinician_status("c1", "OFFLINE"))
      .toThrow("must complete the active consultation first");
    expect(() =>
      new DispatchService(
        Array.from({ length: MAX_CLINICIANS + 1 }, (_, index) => ({
          id: `c${index}`,
          name: `Dr. ${index}`,
        })),
      ),
    ).toThrow("maximum of 12");
  });
});
