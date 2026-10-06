import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(cleanup);

describe("dispatch dashboard", () => {
  it("queues a patient, matches them, and completes their consultation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByRole("textbox", { name: "Patient name" }), "Alex Morgan");
    await user.click(screen.getByRole("button", { name: /add patient/i }));

    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("In consultation", { selector: ".clinician-info span" }))
      .toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Complete consultation for Dr. Olivia Chen" }));

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getAllByText("Ready", { selector: ".clinician-status" })).toHaveLength(4);
  });

  it("opens the super-admin console to manage patients, clinicians, and consultations", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(screen.getByRole("navigation", { name: "Main navigation" }))
      .getByRole("button", { name: "Super admin" }));
    expect(screen.getByRole("heading", { name: /super admin console/i })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Patient name" }), "Admin Test Patient");
    await user.click(screen.getByRole("button", { name: /add to queue/i }));
    expect(screen.getByText("Admin Test Patient")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "End consultation" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /end consultation/i }));
    expect(screen.getByText("Completed", { selector: ".consultation-state" })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Add clinician" }), "Dr. Test Clinician");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(screen.getByText("Dr. Test Clinician")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set Dr. Test Clinician available" }))
      .toBeInTheDocument();
  });
});
