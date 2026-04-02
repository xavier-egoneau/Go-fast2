---
name: security-review
description: Review code or architecture for security risks and return a severity-ranked report with concrete findings and remediation guidance. Use when the user says things like "security review", "security audit", "audit this auth flow", "check this upload flow", or wants a focused pre-ship check on sensitive changes.
---

# Security Review

Audit for real risk, not ceremonial checklists.

## Core intent

Use this skill to identify meaningful security weaknesses in code, configuration, architecture, or change scope.

The output should help the user understand:
- what is risky
- how serious it is
- where it is
- what to fix first

## Use this skill when

- the user asks for a security review or audit
- authentication or authorization logic changed
- user input handling changed
- new endpoints, uploads, webhooks, or integrations were added
- secrets, tokens, sessions, or permissions are involved
- the user wants a pre-ship security pass

## Do not use this skill when

- the user wants implementation first and security can be checked later
- the task is purely exploratory and not about security posture
- there is no meaningful code or design surface to inspect yet

## Operating rules

- Focus on realistic vulnerabilities before best-practice trivia.
- Prioritize exploitable issues over stylistic concerns.
- Start with the highest-risk surfaces first.
- Cite concrete code locations or architectural surfaces when possible.
- Distinguish confirmed findings from plausible concerns.
- Rank findings by severity and likely impact.
- End with remediation priorities, not just a dump of issues.
- Do not drift into implementation unless the user explicitly asks for fixes after the review.

## Review areas

Check the relevant subset of these areas:

- Authentication
- Authorization / access control
- Input validation and injection risk
- XSS / unsafe output rendering
- Secrets handling
- Session and token handling
- File upload / path traversal risk
- SSRF / unsafe outbound requests
- Cryptography misuse
- Unsafe deserialization or command execution
- Dependency risk when relevant
- Logging / error leakage for sensitive data

## Workflow

1. Define the review scope.
2. Identify high-risk surfaces first.
3. Inspect code paths and data flow.
4. Separate confirmed vulnerabilities from weaker concerns.
5. Rank findings by severity.
6. Recommend the highest-value fixes first.

## Output shape

A security review should include:

- Scope reviewed
- Overall risk summary
- Findings grouped by severity: Critical / High / Medium / Low
- For each finding:
  - title
  - location or surface
  - why it is risky
  - likely impact
  - remediation guidance
- Immediate priorities
- Residual uncertainty or unreviewed areas

## Severity guidance

- **Critical**: easy-to-exploit issue with severe impact
- **High**: serious vulnerability with strong impact under plausible conditions
- **Medium**: meaningful weakness, but narrower exploitability or impact
- **Low**: minor issue or hardening recommendation

## Boundary

This skill reviews and reports.

It does not silently fix issues or blur review findings into implementation work.

## Quality bar

A good security review is:

- concrete
- severity-ranked
- focused on realistic risk
- useful for prioritization
- honest about uncertainty

## Example triggers

- "security review this auth module"
- "audit this API before shipping"
- "check this file upload flow for security issues"
- "review this login/session logic"
