# 26_PROJECT_STRUCTURE_AND_MONOREPO_LAYOUT.md

# KnowHub

## Project Structure & Monorepo Layout Specification

Version: 1.0

Status: Approved Baseline

Priority: Critical

Depends On:

```text
01_PRD.md

02_SYSTEM_ARCHITECTURE.md

03_FRONTEND_ARCHITECTURE.md

04_BACKEND_ARCHITECTURE.md

18_DEPLOYMENT_DEVOPS_AND_INFRASTRUCTURE_SPECIFICATION.md
```

---

# 1. Purpose

This document defines:

* Repository Structure
* Monorepo Layout
* Folder Ownership
* Package Boundaries
* Shared Library Rules
* Naming Conventions

The objective is to ensure:

```text
Predictable Structure

Agent Consistency

Scalability

Maintainability
```

---

# 2. Monorepo Philosophy

KnowHub shall use:

```text
Single Monorepo
```

for all components.

Benefits:

```text
Shared Types

Shared Components

Shared Utilities

Single CI/CD Pipeline

Simplified Development
```

---

# 3. Root Repository Layout

```text
knowhub/

├── apps/
├── packages/
├── workers/
├── infrastructure/
├── docs/
├── tests/
├── scripts/
├── assets/
├── .github/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
└── LICENSE
```

---

# 4. Top-Level Directory Ownership

| Directory      | Purpose                        |
| -------------- | ------------------------------ |
| apps           | Deployable applications        |
| packages       | Shared libraries               |
| workers        | Cloudflare Workers             |
| infrastructure | Infrastructure configs         |
| docs           | Specifications & documentation |
| tests          | Global test suites             |
| scripts        | Automation scripts             |
| assets         | Static assets                  |
| .github        | GitHub workflows               |

---

# 5. Applications Directory

```text
apps/

├── web/
├── mobile/
└── admin/
```

---

# 6. Web Application

```text
apps/web/
```

Purpose:

```text
Primary User Interface
```

Technology:

```text
React

Vite

TypeScript

Tailwind

Shadcn UI
```

---

# 7. Mobile Application

```text
apps/mobile/
```

Purpose:

```text
Android APK
```

Technology:

```text
Capacitor
```

---

# 8. Admin Application

```text
apps/admin/
```

Purpose:

```text
Administrative Dashboard
```

---

# 9. Packages Directory

```text
packages/

├── ui/
├── types/
├── utils/
├── ai/
├── github/
├── search/
├── assessment/
├── progress/
├── auth/
└── validation/
```

---

# 10. Package Design Principle

Every package must:

```text
Have Single Responsibility
```

---

# 11. UI Package

```text
packages/ui/
```

Contains:

```text
Buttons

Cards

Dialogs

Inputs

Layouts

Tree Components

Dashboard Components
```

---

# 12. Types Package

```text
packages/types/
```

Contains:

```text
Shared Interfaces

Enums

Contracts

Schemas
```

---

# 13. Utils Package

```text
packages/utils/
```

Contains:

```text
Helpers

Formatters

Transformers
```

---

# 14. AI Package

```text
packages/ai/
```

Contains:

```text
Provider Clients

Prompt Templates

Context Builders

Response Parsers
```

---

# 15. GitHub Package

```text
packages/github/
```

Contains:

```text
Repository Logic

Sync Logic

PR Logic

Branch Logic
```

---

# 16. Search Package

```text
packages/search/
```

Contains:

```text
Search Indexing

Search Ranking

Search Utilities
```

---

# 17. Assessment Package

```text
packages/assessment/
```

Contains:

```text
MCQ Engine

Scoring Logic

Recommendation Logic
```

---

# 18. Progress Package

```text
packages/progress/
```

Contains:

```text
Progress Calculations

Readiness Calculations

Dashboard Metrics
```

---

# 19. Auth Package

```text
packages/auth/
```

Contains:

```text
Firebase Integration

Session Utilities

Permission Checks
```

---

# 20. Validation Package

```text
packages/validation/
```

Contains:

```text
Zod Schemas

Request Validation

Form Validation
```

---

# 21. Workers Directory

```text
workers/

├── api/
├── ai/
├── github/
├── sync/
└── scheduler/
```

---

# 22. API Worker

```text
workers/api/
```

Responsibilities:

```text
REST APIs

Authentication

Routing
```

---

# 23. AI Worker

```text
workers/ai/
```

Responsibilities:

```text
LLM Access

Prompt Execution

Provider Routing
```

---

# 24. GitHub Worker

```text
workers/github/
```

Responsibilities:

```text
Repository Access

Commit Creation

Pull Requests
```

---

# 25. Sync Worker

```text
workers/sync/
```

Responsibilities:

```text
Auto Sync

Scheduled Sync

Conflict Detection
```

---

# 26. Scheduler Worker

```text
workers/scheduler/
```

Responsibilities:

```text
Auto Commit

Background Jobs

Cleanup Tasks
```

---

# 27. Infrastructure Directory

```text
infrastructure/

├── cloudflare/
├── firebase/
├── github/
└── deployment/
```

---

# 28. Cloudflare Infrastructure

Contains:

```text
Workers Config

D1 Config

R2 Config
```

---

# 29. Firebase Infrastructure

Contains:

```text
Authentication Config

Environment Setup
```

---

# 30. GitHub Infrastructure

Contains:

```text
OAuth Config

Actions Templates
```

---

# 31. Deployment Infrastructure

Contains:

```text
Deployment Scripts

Environment Templates
```

---

# 32. Documentation Directory

```text
docs/

├── specifications/
├── architecture/
├── workflows/
├── api/
└── user-guides/
```

---

# 33. Specifications Directory

Contains:

```text
01–32 Documents
```

---

# 34. Architecture Directory

Contains:

```text
System Diagrams

Infrastructure Diagrams

Data Flow Diagrams
```

---

# 35. Workflows Directory

Contains:

```text
Agent Workflows

Git Workflows

Deployment Workflows
```

---

# 36. API Documentation

Contains:

```text
Endpoint Docs

Schemas

Contracts
```

---

# 37. User Guides

Contains:

```text
Setup Guides

Usage Guides

Troubleshooting
```

---

# 38. Tests Directory

```text
tests/

├── unit/
├── integration/
├── e2e/
├── performance/
└── security/
```

---

# 39. Unit Tests

Purpose:

```text
Individual Components
```

---

# 40. Integration Tests

Purpose:

```text
System Interactions
```

---

# 41. E2E Tests

Purpose:

```text
User Flows
```

---

# 42. Performance Tests

Purpose:

```text
Load

Stress

Benchmarking
```

---

# 43. Security Tests

Purpose:

```text
Validation

Authorization

Authentication
```

---

# 44. Scripts Directory

```text
scripts/

├── setup/
├── sync/
├── maintenance/
└── release/
```

---

# 45. Setup Scripts

Purpose:

```text
Environment Initialization
```

---

# 46. Sync Scripts

Purpose:

```text
Repository Synchronization
```

---

# 47. Maintenance Scripts

Purpose:

```text
Cleanup

Repair

Optimization
```

---

# 48. Release Scripts

Purpose:

```text
Build

Versioning

Publishing
```

---

# 49. Assets Directory

```text
assets/

├── icons/
├── logos/
├── illustrations/
└── screenshots/
```

---

# 50. GitHub Directory

```text
.github/

├── workflows/
├── ISSUE_TEMPLATE/
└── PULL_REQUEST_TEMPLATE.md
```

---

# 51. GitHub Workflows

Contains:

```text
CI

CD

Tests

Lint

Build Validation
```

---

# 52. Environment Variables Structure

```text
.env

.env.local

.env.example
```

---

# 53. Environment Variable Rule

Never commit:

```text
Real Secrets
```

---

Only commit:

```text
Examples
```

---

# 54. Naming Convention

Directories:

```text
kebab-case
```

Example:

```text
learning-tree
```

---

# 55. File Naming Convention

React Components:

```text
PascalCase.tsx
```

Example:

```text
LearningTree.tsx
```

---

# 56. Utility Naming Convention

```text
camelCase.ts
```

Example:

```text
calculateProgress.ts
```

---

# 57. Shared Package Rule

If code is reused:

```text
2+ Times
```

move to:

```text
packages/
```

---

# 58. Dependency Direction Rule

Allowed:

```text
apps
→ packages

workers
→ packages
```

---

Forbidden:

```text
packages
→ apps

packages
→ workers
```

---

# 59. Circular Dependency Rule

Circular dependencies:

```text
Prohibited
```

---

# 60. Monorepo Success Criteria

The repository structure is successful when:

* Every file has a predictable location
* Agents can navigate the codebase easily
* Shared code remains centralized
* Components remain reusable
* Infrastructure remains isolated
* Documentation remains organized
* Testing remains scalable
* Future growth does not require restructuring

END OF DOCUMENT
