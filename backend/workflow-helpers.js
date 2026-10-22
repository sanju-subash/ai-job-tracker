import { STATUS_OPTIONS, REVIEW_ONLY } from "./workflow-status.js";

export function duplicateExists(applications, job) {
  const url = String(job.url || "").split("#")[0].split("?")[0].replace(/\/$/, "").toLowerCase();
  const identity = [job.title, job.company].map(x => String(x || "").trim().toLowerCase()).join("|");
  return applications.some(app => {
    const oldUrl = String(app.url || "").split("#")[0].split("?")[0].replace(/\/$/, "").toLowerCase();
    const oldIdentity = [app.title, app.company].map(x => String(x || "").trim().toLowerCase()).join("|");
    return (url && url === oldUrl) || identity === oldIdentity;
  });
}

export function validateStatus(status, confirmed = false) {
  if (!STATUS_OPTIONS.includes(status)) return { ok: false, reason: "Invalid status." };
  if (REVIEW_ONLY && status === "applied" && confirmed !== true) {
    return { ok: false, reason: "Confirm that you submitted on the employer's site first." };
  }
  return { ok: true };
}
