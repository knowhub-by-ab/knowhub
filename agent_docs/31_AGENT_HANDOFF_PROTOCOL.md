# 31_AGENT_HANDOFF_PROTOCOL.md

# KnowHub

## Multi-Agent Handoff, Context Transfer & Collaboration Protocol

Version: 1.0

Status: Approved Baseline

Priority: Critical

Depends On:

```text id="31-001"
17_AGENTIC_DEVELOPMENT_WORKFLOW.md

21_AGENTIC_DEVELOPMENT_EXECUTION_PLAN.md

26_PROJECT_STRUCTURE_AND_MONOREPO_LAYOUT.md

27_CODING_STANDARDS_AND_CONVENTIONS.md
```

---

# 1. Purpose

This document defines:

* Agent Collaboration Rules
* Context Transfer Rules
* Handoff Procedures
* Documentation Update Rules
* Ownership Rules
* Completion Criteria

The objective is to ensure:

```text id="31-002"
Predictable Development

Consistent Quality

Reduced Rework

Agent Alignment
```

---

# 2. Problem Statement

KnowHub may be developed using:

```text id="31-003"
Claude Code

OpenAI Codex

GitHub Copilot

Amazon Q

Gemini CLI

Future Agents
```

---

Multiple agents working independently can create:

```text id="31-004"
Duplicate Logic

Conflicting Architecture

Broken Workflows

Incomplete Features
```

---

This protocol prevents that.

---

# 3. Core Principle

Agents must operate as:

```text id="31-005"
One Engineering Team
```

---

not:

```text id="31-006"
Independent Contributors
```

---

# 4. Agent Authority Model

Agents may:

```text id="31-007"
Implement

Refactor

Test

Document
```

---

Agents may not:

```text id="31-008"
Invent New Architecture

Override Specifications

Change Core Decisions
```

without approval.

---

# 5. Source Of Truth

Priority order:

```text id="31-009"
Specifications
↓
Architecture Documents
↓
Existing Code
↓
Agent Suggestions
```

---

# 6. Conflict Resolution Rule

If code conflicts with specification:

```text id="31-010"
Specification Wins
```

---

# 7. Agent Roles

Potential roles:

```text id="31-011"
Architecture Agent

Frontend Agent

Backend Agent

AI Agent

Testing Agent

Documentation Agent
```

---

# 8. Ownership Principle

Every task must have:

```text id="31-012"
Single Active Owner
```

---

# 9. Task Assignment Format

```text id="31-013"
Task ID

Owner Agent

Scope

Dependencies

Expected Output
```

---

# 10. Handoff Requirement

A handoff is required whenever:

```text id="31-014"
Task Complete

Task Paused

Context Window Exhausted

Agent Switched
```

---

# 11. Mandatory Handoff Package

Every handoff must include:

```text id="31-015"
Completed Work

Remaining Work

Known Issues

Files Changed

Tests Executed
```

---

# 12. Handoff Template

```markdown
Task:
Summary:
Files Changed:
Completed:
Remaining:
Known Issues:
Tests Executed:
Recommended Next Step:
```

---

# 13. Context Transfer Principle

Assume:

```text id="31-016"
Next Agent Knows Nothing
```

---

# 14. Context Transfer Requirement

Provide:

```text id="31-017"
Goal

Current State

Constraints

Risks

Next Actions
```

---

# 15. Documentation First Rule

Before coding:

```text id="31-018"
Read Relevant Specifications
```

---

# 16. Required Documents

Every agent must review:

```text id="31-019"
01_PRD.md

02_SYSTEM_ARCHITECTURE.md

26_PROJECT_STRUCTURE_AND_MONOREPO_LAYOUT.md

27_CODING_STANDARDS_AND_CONVENTIONS.md
```

---

# 17. Feature Ownership Rule

One feature:

```text id="31-020"
One Branch

One Owner

One PR
```

---

# 18. Branch Naming Standard

```text
feature/*
bugfix/*
refactor/*
docs/*
```

---

Examples:

```text
feature/learning-tree

feature/ai-chat

bugfix/search-index
```

---

# 19. Commit Frequency Rule

Commit:

```text id="31-021"
Small

Atomic

Traceable
```

changes.

---

# 20. Commit Message Standard

Format:

```text
type(scope): message
```

Example:

```text
feat(tree): implement node creation
```

---

# 21. Pull Request Rule

Every significant change requires:

```text id="31-022"
Pull Request
```

---

# 22. Pull Request Template

Must contain:

```text id="31-023"
Summary

Scope

Testing

Screenshots

Risks
```

---

# 23. Documentation Update Rule

If architecture changes:

```text id="31-024"
Documentation Must Change First
```

---

# 24. Specification Update Rule

If behavior changes:

```text id="31-025"
Relevant Specification Updated
```

before merge.

---

# 25. Code Review Responsibility

Reviewer must verify:

```text id="31-026"
Specification Compliance

Code Quality

Testing

Security
```

---

# 26. Forbidden Review Behavior

Never approve:

```text id="31-027"
Untested Code

Broken Builds

Incomplete Features
```

---

# 27. Testing Before Handoff

Required:

```text id="31-028"
Lint

Type Check

Relevant Tests
```

---

# 28. Handoff Readiness Checklist

Before handoff:

```text id="31-029"
Code Compiles

Tests Pass

Docs Updated

Commit Created
```

---

# 29. Context Window Exhaustion Rule

If agent approaches context limit:

```text id="31-030"
Stop Implementation

Create Handoff

Transfer Context
```

---

# 30. Partial Work Rule

Incomplete work must be:

```text id="31-031"
Clearly Marked
```

---

# 31. TODO Standard

Use:

```typescript
// TODO:
```

only when unavoidable.

---

# 32. Duplicate Logic Rule

Before implementation:

Ask:

```text id="31-032"
Does This Already Exist?
```

---

# 33. Reuse Rule

If functionality exists:

```text id="31-033"
Reuse Before Rebuild
```

---

# 34. Refactor Rule

Refactor only when:

```text id="31-034"
Measurable Improvement Exists
```

---

# 35. Specification Ambiguity Rule

If specification unclear:

```text id="31-035"
Document Assumption
```

---

# 36. Assumption Template

```markdown
Assumption:
Reason:
Impact:
Alternative:
```

---

# 37. Agent Disagreement Rule

If two agents disagree:

```text id="31-036"
Follow Specification
```

---

If unresolved:

```text id="31-037"
Escalate To Repository Owner
```

---

# 38. Security Ownership

All agents responsible for:

```text id="31-038"
Secret Safety

Input Validation

Authentication Safety
```

---

# 39. AI Feature Rule

AI-generated code must:

```text id="31-039"
Be Reviewed

Be Tested

Be Refactored If Needed
```

---

# 40. Generated Content Rule

Generated content must never bypass:

```text id="31-040"
PR Workflow
```

---

# 41. Multi-Agent Workflow

```text
Agent A
↓
Implements

Agent B
↓
Reviews

Agent C
↓
Tests

Agent D
↓
Approves
```

---

# 42. Quality Gate 1

Before merge:

```text id="31-041"
Build Passes
```

---

# 43. Quality Gate 2

Before merge:

```text id="31-042"
Tests Pass
```

---

# 44. Quality Gate 3

Before merge:

```text id="31-043"
Specification Compliance Verified
```

---

# 45. Quality Gate 4

Before merge:

```text id="31-044"
Security Requirements Verified
```

---

# 46. Release Handoff Package

Before release:

```text id="31-045"
Completed Features

Known Limitations

Open Issues

Risk Assessment
```

---

# 47. Documentation Handoff Package

Must include:

```text id="31-046"
Updated Docs

New Docs

Removed Docs

Affected Docs
```

---

# 48. Knowledge Preservation Rule

No knowledge may remain only:

```text id="31-047"
Inside Agent Context
```

---

Must be stored in:

```text id="31-048"
Repository

Documentation

Issues

PRs
```

---

# 49. Recovery Rule

Any agent should be able to resume work using:

```text id="31-049"
Repository

Documentation

Latest Handoff
```

alone.

---

# 50. Agent Completion Definition

A task is complete only when:

```text id="31-050"
Implemented

Tested

Documented

Reviewed

Merged
```

---

# 51. Multi-Agent Success Criteria

This protocol is successful when:

* Any agent can continue work seamlessly
* Context is never lost
* Architecture remains consistent
* Documentation remains synchronized
* Features remain traceable
* Testing remains mandatory
* Security remains enforced
* Development remains predictable

END OF DOCUMENT
