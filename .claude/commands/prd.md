---
description: Generate a comprehensive PRD (Product Requirements Document) that serves as an execution prompt for AI coding agents
argument-hint: [feature-title] [feature-description]
allowed-tools: Read, Grep, Glob, Bash
---

# PRD Generator

You are Claude Code running inside a repo. Your job is to produce a single PRD document that is ALSO the execution prompt for an AI coding agent.

The PRD must be precise, testable, and optimized for minimal back-and-forth. It must enforce:
- Tests + success criteria BEFORE implementation
- A tight Git loop: implement in small slices, run tests, commit often
- Regression checks: re-run relevant prior tests after new changes
- Space for future-session agent notes (self-comments)

## Arguments Provided

**Feature Title:** $1
**Feature Description:** $2

## Your Task

1. **Analyze the repository** to understand:
   - Project structure and tech stack
   - Existing modules, endpoints, UI areas, services, data models
   - Build/test commands from package.json, pyproject.toml, or equivalent
   - CI/CD configuration
   - Deployment targets

2. **Gather additional context** by asking the user (if needed):
   - Non-goals (what NOT to change)
   - Must-keep constraints
   - Time budget
   - Required test types (default: unit + integration)
   - Deployment target
   - Environment constraints

3. **Generate a PRD document** with the exact structure below.

## PRD Structure (Required Sections)

### 1) Context & Goals
- What problem this feature solves
- Who it's for
- Why now
- In-scope goals (bullet list)
- Out-of-scope / Non-goals (bullet list)

### 2) Current State (Repo-informed)
- Briefly describe existing relevant modules, endpoints, UI areas, services, data models
- Identify where changes will likely land (file/path guesses allowed)
- Call out risks / unknowns / assumptions

### 3) User Stories (Few, sharp)
- 3–7 user stories in "As a…, I want…, so that…" format

### 4) Success Criteria (Verifiable)
- A checklist of pass/fail outcomes
- Include edge cases
- Include performance/UX constraints if relevant
- Include "definition of done" that can be validated by tests or a smoke-run

### 5) Test Plan (Design BEFORE build)
- Required test categories (unit/integration/e2e)
- Concrete test cases mapped to success criteria
- What to mock vs what to integrate
- Test data/fixtures needed
- If e2e is not feasible, specify a deterministic integration suite + smoke steps

### 6) Implementation Plan (Small slices)
- A numbered sequence of small, safe increments
- Each increment must specify:
  a) what changes
  b) what tests to add/adjust FIRST
  c) what command(s) to run
  d) expected outputs
  e) when to commit

### 7) Git Workflow Rules (Enforced)
- Branch naming suggestion
- Commit cadence: "commit after every significant slice"
- Commit message format
- After each slice:
  - run targeted tests
  - run a fast regression subset
- After every 3–5 slices:
  - run full test suite (or best available)
- If a change breaks a prior feature:
  - revert or fix immediately before proceeding

### 8) Commands (Repo-specific)
- List the exact commands the agent should run for:
  - install
  - unit tests
  - integration tests
  - lint/typecheck
  - build
  - local run
- If unknown, provide best-guess + how to discover (e.g., read package.json / pyproject)

### 9) Observability / Logging (If applicable)
- What logs/metrics are needed
- How to verify behavior during smoke test

### 10) Rollout / Migration Plan (If applicable)
- Feature flags, backfills, migrations, data compatibility
- Safe rollout steps
- Rollback plan

### 11) Agent Notes (Leave space for recursion)
Include these empty subsections with placeholders the agent will fill later:
- **Session Log**: (timestamp entries)
- **Decisions**: Decision / rationale / alternatives
- **Open Questions**: TBD items
- **Regression Checklist**: List tests/features to re-run after changes

## Style Rules

- Be concrete. Avoid vague language.
- Prefer checklists and tables where helpful.
- Map tests to success criteria explicitly (traceability).
- If you must assume something, label it "ASSUMPTION:" and provide a quick verification step.
- Keep it as short as possible while still being executable and unambiguous.

## Output Format

Write the PRD to a file named: `docs/PRD-{{feature-title-slugified}}.md`

Start the document with:
```markdown
# PRD — {{Feature Title}}

**Status:** Draft
**Created:** {{today's date}}
**Owner:** AI Agent
```

## Important

- DO NOT implement anything
- DO NOT edit code
- ONLY write the PRD/execution prompt
- The PRD should be thorough enough that another AI agent can execute it without ambiguity
