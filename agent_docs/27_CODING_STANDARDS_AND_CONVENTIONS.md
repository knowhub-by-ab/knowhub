# 27_CODING_STANDARDS_AND_CONVENTIONS.md

# KnowHub

## Coding Standards, Conventions & Engineering Guidelines

Version: 1.0

Status: Approved Baseline

Priority: Critical

Depends On:

```text id="27-001"
03_FRONTEND_ARCHITECTURE.md

04_BACKEND_ARCHITECTURE.md

19_API_AND_BACKEND_CONTRACT_SPECIFICATION.md

21_AGENTIC_DEVELOPMENT_EXECUTION_PLAN.md

26_PROJECT_STRUCTURE_AND_MONOREPO_LAYOUT.md
```

---

# 1. Purpose

This document defines:

* Coding Standards
* Naming Conventions
* Project Conventions
* TypeScript Standards
* React Standards
* API Standards
* Error Handling Standards
* Logging Standards

The objective is to ensure:

```text id="27-002"
Consistency

Maintainability

Predictability

Agent Alignment
```

---

# 2. Engineering Philosophy

Every line of code must prioritize:

```text id="27-003"
Readability
↓
Maintainability
↓
Correctness
↓
Performance
```

---

# 3. General Rules

Code must be:

```text id="27-004"
Readable

Typed

Testable

Reusable

Documented
```

---

# 4. Forbidden Practices

Never:

```text id="27-005"
Use any

Disable Type Checking

Hardcode Secrets

Duplicate Logic

Ignore Errors

Leave Dead Code
```

---

# 5. Language Standards

Primary language:

```text id="27-006"
TypeScript
```

---

Required:

```text id="27-007"
Strict Mode Enabled
```

---

# 6. TypeScript Configuration

Must enable:

```text id="27-008"
strict

noImplicitAny

strictNullChecks

noUncheckedIndexedAccess
```

---

# 7. Type Safety Rule

Prefer:

```text id="27-009"
Interfaces

Types

Generics
```

---

Avoid:

```text id="27-010"
any
```

---

# 8. Interface Naming

Use:

```text id="27-011"
PascalCase
```

Example:

```typescript
interface LearningNode {}
interface AssessmentResult {}
```

---

# 9. Enum Naming

Use:

```typescript
enum NodeStatus {
  PENDING,
  IN_PROGRESS,
  DONE
}
```

---

# 10. Constants

Use:

```text id="27-012"
UPPER_SNAKE_CASE
```

Example:

```typescript
const MAX_RETRY_COUNT = 3;
```

---

# 11. Variable Naming

Use:

```text id="27-013"
camelCase
```

Example:

```typescript
learningTree
currentUser
repositorySize
```

---

# 12. Function Naming

Use:

```text id="27-014"
camelCase
```

Example:

```typescript
calculateProgress()
generateAssessment()
syncRepository()
```

---

# 13. Boolean Naming

Prefix with:

```text id="27-015"
is

has

can

should
```

Example:

```typescript
isAuthenticated
hasRepository
canEdit
shouldSync
```

---

# 14. File Naming Rules

Components:

```text id="27-016"
PascalCase.tsx
```

Example:

```text
LearningTree.tsx
ProgressDashboard.tsx
```

---

# 15. Utility File Naming

Use:

```text id="27-017"
camelCase.ts
```

Example:

```text
calculateProgress.ts
parseMarkdown.ts
```

---

# 16. Directory Naming

Use:

```text id="27-018"
kebab-case
```

Example:

```text
learning-tree
progress-dashboard
assessment-engine
```

---

# 17. React Component Standards

Components must be:

```text id="27-019"
Small

Focused

Reusable
```

---

# 18. Component Responsibility Rule

One component:

```text id="27-020"
One Responsibility
```

---

# 19. Component Size Rule

Recommended:

```text id="27-021"
< 300 Lines
```

Maximum:

```text id="27-022"
500 Lines
```

---

# 20. React Component Structure

Order:

```text id="27-023"
Imports

Types

Constants

Hooks

Handlers

Render

Exports
```

---

# 21. Hooks Standards

Custom hooks:

```text id="27-024"
use*
```

Example:

```typescript
useAuth()
useLearningTree()
useAssessment()
```

---

# 22. Hook Responsibility

One hook:

```text id="27-025"
One Concern
```

---

# 23. State Management Rule

Use:

```text id="27-026"
Zustand
```

for global state.

---

Use:

```text id="27-027"
React State
```

for local state.

---

# 24. Server State Rule

Use:

```text id="27-028"
TanStack Query
```

for server data.

---

# 25. API Call Rule

Never call APIs directly from UI components.

Use:

```text id="27-029"
Services

Hooks

Query Layers
```

---

# 26. API Naming Convention

Pattern:

```text
/resource/action
```

Example:

```text
/tree/create
/tree/update
/assessment/generate
```

---

# 27. Backend Service Standards

Services must:

```text id="27-030"
Be Stateless

Be Testable

Be Reusable
```

---

# 28. Validation Standards

All requests validated with:

```text id="27-031"
Zod
```

---

# 29. Validation Rule

Validate:

```text id="27-032"
Input

Output

Environment Variables
```

---

# 30. Error Handling Philosophy

Never:

```text id="27-033"
Swallow Errors
```

---

Always:

```text id="27-034"
Handle

Log

Recover
```

---

# 31. Error Types

Use:

```typescript
ValidationError
AuthenticationError
AuthorizationError
RepositoryError
AIProviderError
```

---

# 32. Error Message Rule

User-facing messages:

```text id="27-035"
Human Friendly
```

---

Logs:

```text id="27-036"
Detailed
```

---

# 33. Logging Philosophy

Log:

```text id="27-037"
Events

Warnings

Errors
```

---

# 34. Never Log

```text id="27-038"
Passwords

Tokens

Secrets

API Keys
```

---

# 35. Security Standards

Never:

```text id="27-039"
Hardcode Secrets
```

---

Always:

```text id="27-040"
Use Environment Variables
```

---

# 36. Async Standards

Prefer:

```text id="27-041"
async/await
```

---

Avoid:

```text id="27-042"
Nested Promise Chains
```

---

# 37. Dependency Management

Before adding dependency:

Ask:

```text id="27-043"
Can Existing Code Solve This?
```

---

# 38. Dependency Approval Rule

Dependency must be:

```text id="27-044"
Actively Maintained

Open Source

Widely Used
```

---

# 39. Documentation Standards

Every exported item requires:

```text id="27-045"
Description

Purpose

Parameters

Return Value
```

---

# 40. Testing Standards

Every feature requires:

```text id="27-046"
Unit Tests

Integration Tests
```

---

Critical features require:

```text id="27-047"
E2E Tests
```

---

# 41. Git Commit Convention

Format:

```text
type(scope): message
```

Examples:

```text
feat(tree): add node creation

fix(search): resolve indexing issue

refactor(ai): simplify provider routing
```

---

# 42. Allowed Commit Types

```text id="27-048"
feat

fix

refactor

docs

test

style

chore

build
```

---

# 43. Pull Request Standards

Every PR must include:

```text id="27-049"
Purpose

Changes

Testing

Screenshots If UI Changed
```

---

# 44. Branch Naming Convention

Format:

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

bugfix/search-index

refactor/github-sync
```

---

# 45. AI-Generated Code Rule

AI-generated code must:

```text id="27-050"
Be Reviewed

Be Tested

Be Refactored If Needed
```

---

# 46. Agentic Development Rule

Agents must not:

```text id="27-051"
Create Duplicate Logic

Ignore Existing Standards

Bypass Validation

Invent Architecture
```

---

# 47. Performance Standards

Prefer:

```text id="27-052"
Memoization

Lazy Loading

Code Splitting
```

when justified.

---

# 48. Accessibility Standards

All UI must satisfy:

```text id="27-053"
WCAG 2.1 AA
```

---

# 49. Clean Code Rule

Code should read like:

```text id="27-054"
Well-Written Documentation
```

---

# 50. Definition Of Done

Code is complete only when:

```text id="27-055"
Implemented

Reviewed

Tested

Documented

Linted

Deployable
```

---

# 51. Engineering Success Criteria

The standards are successful when:

* Agents produce consistent code
* Code remains easy to understand
* Refactoring becomes easier
* Bugs are reduced
* Security standards are enforced
* Technical debt remains controlled
* New contributors can onboard quickly
* The codebase remains maintainable for years

END OF DOCUMENT
