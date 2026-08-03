// Pre-launch access gate.
//
// While LAUNCH_GATE_ENABLED is true:
//   - Sign Up and Login BOTH only succeed for emails listed in
//     LAUNCH_GATE_ALLOWED_EMAILS below — everyone else is blocked (signup
//     never creates a Firebase Auth account; login is rejected and signed
//     back out immediately).
//   - IMPORTANT: add each tester's email here BEFORE inviting them, or
//     their first-time signup will be blocked along with everyone else's.
//
// To launch publicly: set LAUNCH_GATE_ENABLED to false. Nothing else in the
// app needs to change — every check reads from this one flag.
export const LAUNCH_GATE_ENABLED = false;

export const LAUNCH_GATE_ALLOWED_EMAILS = [
  "rwallaceroc@gmail.com",
  "wimc.reviewer@gmail.com",
  // Add tester emails below, one per line, before sending each invite:
  // "tester1@example.com",
];

export const LAUNCH_GATE_MESSAGE =
  "WIMC hasn't launched publicly yet — check back soon!";

export function isLaunchGateAllowed(email) {
  return LAUNCH_GATE_ALLOWED_EMAILS.includes((email || "").trim().toLowerCase());
}
