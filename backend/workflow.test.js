import test from "node:test";
import assert from "node:assert/strict";
import { duplicateExists, validateStatus } from "./workflow-helpers.js";
import { prepareAnswer } from "./application-answers.js";

test("duplicate detection catches same URL with tracking parameters", () => {
  const apps = [{ title: "Backend Engineer", company: "Example", url: "https://example.com/jobs/123?utm_source=board" }];
  assert.equal(duplicateExists(apps, { title: "Other title", company: "Other", url: "https://example.com/jobs/123" }), true);
});

test("duplicate detection catches same company and title", () => {
  const apps = [{ title: "Backend Engineer", company: "Example Inc", url: "https://example.com/123" }];
  assert.equal(duplicateExists(apps, { title: "Backend Engineer", company: "Example Inc", url: "https://different.com/456" }), true);
});

test("Applied status requires explicit confirmation", () => {
  assert.equal(validateStatus("applied", false).ok, false);
  assert.equal(validateStatus("applied", true).ok, true);
});

test("unknown application questions are not guessed", () => {
  assert.equal(prepareAnswer("Do you need visa sponsorship?").status, "manual_required");
});

test("salary answer is a draft that needs review", () => {
  const answer = prepareAnswer("What is your expected salary?");
  assert.equal(answer.status, "draft");
  assert.equal(answer.needsReview, true);
  assert.match(answer.answer, /5–8 LPA/);
});
