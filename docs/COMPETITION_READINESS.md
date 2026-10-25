# JARVIS Competition Readiness Checklist

Use this document before entering a hackathon, accelerator showcase, or software competition. It is a preparation checklist, not a claim that the project already meets every item.

## 1. Confirm eligibility first

- [ ] The event permits remote participation.
- [ ] Participants from the user's country are eligible.
- [ ] Minimum-age, student, team-size, and identity requirements are satisfied.
- [ ] The event accepts pre-existing repositories, or the submission contains the required new work.
- [ ] Rules about AI tools, third-party APIs, open-source licensing, and intellectual property are understood.
- [ ] Prize eligibility, payment conditions, deadlines, and required deliverables are confirmed on the organizer's official page.

## 2. Choose a focused story

Describe JARVIS as a modular browser-based assistant interface. Pick one specific, demonstrably working workflow for the demo rather than claiming every planned capability works in every environment.

Fill this in before submitting:

- **Problem:** What practical problem does this demo solve?
- **Target user:** Who benefits from that solution?
- **Workflow shown:** What does the judge see from start to finish?
- **Why this approach:** What is useful or distinctive about the implementation?
- **Current limitations:** What does not work, requires configuration, or is local-only?

## 3. Validate the exact demo

- [ ] Test the public frontend in a fresh browser session.
- [ ] Test the hosted backend separately, including its documented health endpoint.
- [ ] Test microphone/camera permissions only if the chosen demo uses them.
- [ ] Verify the selected workflow on the browser and device used for recording.
- [ ] Test failure behavior: missing backend, denied permission, no network, and provider errors where relevant.
- [ ] Confirm the demo does not expose secrets, private user data, or real account credentials.
- [ ] Record the date, browser/device, and exact steps used to verify the workflow.

A passing JavaScript syntax check is useful but does not prove that a feature works end-to-end.

## 4. Submission package

Prepare the following only after verification:

1. **Title:** JARVIS-WEB — Modular Browser AI Assistant.
2. **Short pitch:** One or two sentences describing the tested use case.
3. **Demo video:** Prefer a concise, narrated walkthrough showing real behavior, not only UI animation.
4. **Repository:** Link to the public source and point judges to this README.
5. **Live demo:** Provide it only if it is currently reachable and the tested workflow works.
6. **Architecture:** Explain browser UI, modules, hosted AI backend, and local-only components.
7. **Setup:** Link to the deployment notes and clearly list required environment variables.
8. **Limitations:** State which services, permissions, and devices are required.
9. **Credits and licensing:** Identify third-party APIs, libraries, assets, and any required attribution.

## 5. Suggested 90-second demo structure

- **0–10 seconds:** State the user problem and what the demo will prove.
- **10–25 seconds:** Show the JARVIS interface and the selected workflow.
- **25–65 seconds:** Run the workflow live and show the result.
- **65–80 seconds:** Briefly explain the modular architecture and relevant integration.
- **80–90 seconds:** State the current limitations and point to the repository.

Only show functionality that has actually been tested. Avoid simulated output presented as real execution.

## 6. After submission

- Save a copy of the exact submitted description and video.
- Keep the submission branch and commit identifiable.
- Monitor organizer messages and follow-up requests.
- Do not pay a fee or provide sensitive account information unless the organizer and request have been independently verified.
