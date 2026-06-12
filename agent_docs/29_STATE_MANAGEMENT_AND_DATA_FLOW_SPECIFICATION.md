# 29_STATE_MANAGEMENT_AND_DATA_FLOW_SPECIFICATION.md

# KnowHub

## State Management, Data Flow & Synchronization Specification

Version: 1.0

Status: Approved Baseline

Priority: Critical

Depends On:

```text
03_FRONTEND_ARCHITECTURE.md

04_BACKEND_ARCHITECTURE.md

15_DATA_MODEL_AND_SCHEMA_SPECIFICATION.md

19_API_AND_BACKEND_CONTRACT_SPECIFICATION.md

26_PROJECT_STRUCTURE_AND_MONOREPO_LAYOUT.md

28_UI_COMPONENT_LIBRARY_SPECIFICATION.md
```

---

# 1. Purpose

This document defines:

* Frontend State Architecture
* Data Flow Architecture
* Synchronization Strategy
* Cache Strategy
* Offline Strategy
* API Data Handling
* Repository Sync Flow

The objective is to ensure:

```text
Predictable State

Fast UI

Minimal Re-renders

Reliable Synchronization

Offline Resilience
```

---

# 2. State Management Philosophy

State should exist in the smallest possible scope.

Priority:

```text
Component State
↓
Feature State
↓
Global State
↓
Persistent Storage
```

---

# 3. State Categories

KnowHub uses:

```text
UI State

Application State

Server State

Persistent State

Offline State
```

---

# 4. Technology Choices

Global State:

```text
Zustand
```

Server State:

```text
TanStack Query
```

Forms:

```text
React Hook Form
```

Validation:

```text
Zod
```

Persistence:

```text
IndexedDB
```

---

# 5. State Ownership Principle

Each state must have:

```text
Single Owner
```

---

Never:

```text
Duplicate State Across Stores
```

---

# 6. Component State

Use React State for:

```text
Dialog Visibility

Form Input

Dropdown State

Expanded Panels

Temporary UI State
```

---

# 7. Global State

Use Zustand for:

```text
Current User

Selected Node

Tree Navigation

Theme

Application Preferences

Sync Status
```

---

# 8. Server State

Use TanStack Query for:

```text
Learning Trees

Node Content

Assessments

Search Results

Recommendations

Repository Metadata
```

---

# 9. Persistent State

Store:

```text
User Preferences

Cached Tree Metadata

Recent Pages

Offline Queue
```

---

# 10. State Directory Structure

```text
packages/

state/

├── auth/
├── tree/
├── search/
├── ai/
├── progress/
├── assessment/
├── notes/
├── settings/
└── sync/
```

---

# 11. Auth Store

Contains:

```text
User

Authentication Status

Permissions

Session State
```

---

# 12. Tree Store

Contains:

```text
Selected Node

Expanded Nodes

Tree Filters

Tree Navigation State
```

---

# 13. Search Store

Contains:

```text
Search Query

Search Filters

Search History
```

---

# 14. AI Store

Contains:

```text
Current Conversation

Provider Selection

Generation State
```

---

# 15. Progress Store

Contains:

```text
Progress Summary

Readiness Scores

Learning Metrics
```

---

# 16. Assessment Store

Contains:

```text
Assessment Session

Question Progress

Current Answers
```

---

# 17. Notes Store

Contains:

```text
Global Notes State

Unsaved Changes
```

---

# 18. Sync Store

Contains:

```text
Sync Status

Last Sync

Pending Operations

Conflict State
```

---

# 19. Data Flow Principle

All data must flow:

```text
UI
↓
Action
↓
Store
↓
API
↓
Repository
↓
Store Update
↓
UI Refresh
```

---

# 20. Forbidden Data Flow

Never:

```text
UI
↓
Direct GitHub Call
```

---

All external operations go through backend APIs.

---

# 21. Query Architecture

Pattern:

```text
UI
↓
Hook
↓
TanStack Query
↓
API Client
↓
Backend
```

---

# 22. Mutation Architecture

Pattern:

```text
UI
↓
Mutation Hook
↓
Backend API
↓
Repository Update
↓
Query Invalidation
↓
Refresh
```

---

# 23. Query Key Convention

Examples:

```typescript
["tree"]

["tree", nodeId]

["assessment", assessmentId]

["progress"]

["search", query]
```

---

# 24. Cache Policy

Cache aggressively.

Priority:

```text
Learning Trees

Node Content

Assessments

Recommendations
```

---

# 25. Cache Duration

Default:

```text
5 Minutes
```

Configurable per resource.

---

# 26. Cache Invalidation

Invalidate when:

```text
Content Changes

Node Changes

Assessment Updates

Sync Completes
```

---

# 27. Optimistic Updates

Supported for:

```text
Node Status Updates

Notes

Progress Updates

Node Editing
```

---

# 28. Optimistic Update Flow

```text
User Action
↓
Immediate UI Update
↓
Backend Request
↓
Success → Keep
↓
Failure → Rollback
```

---

# 29. Error Recovery

Every mutation must support:

```text
Rollback

Retry

User Notification
```

---

# 30. Offline First Principle

Core features should remain usable offline.

---

# 31. Offline Features

Available offline:

```text
Learning Tree

Recently Opened Pages

Notes

Progress Dashboard

Cached Assessments
```

---

# 32. Offline Storage

Technology:

```text
IndexedDB
```

---

# 33. Offline Queue

Actions queued:

```text
Status Updates

Notes Changes

Node Edits
```

---

# 34. Queue Processing

Flow:

```text
Offline Change
↓
Queue
↓
Connection Restored
↓
Sync
↓
Confirm
```

---

# 35. Sync Architecture

Sources:

```text
GitHub Repository

Local Cache
```

---

# 36. Source Of Truth

Always:

```text
GitHub Repository
```

---

Never:

```text
Browser Cache
```

---

# 37. Auto Save Strategy

Applicable to:

```text
Markdown Pages

Notes

Generated Content
```

---

# 38. Auto Save Interval

Target:

```text
30 Seconds
```

after inactivity.

---

# 39. Auto Sync Strategy

Trigger:

```text
Content Changes

Node Changes

Assessment Completion
```

---

# 40. Scheduled Sync

Interval:

```text
10 Minutes
```

---

# 41. Sign-Out Sync

Before sign out:

```text
Save

Commit

Push

Confirm
```

---

# 42. Conflict Detection

Conflicts occur when:

```text
Remote Changed

Local Changed
```

simultaneously.

---

# 43. Conflict Resolution

Priority:

```text
User Review
```

---

Never automatically overwrite.

---

# 44. AI Data Flow

Pattern:

```text
User Question
↓
Context Builder
↓
AI Provider
↓
Response
↓
Knowledge Evaluation
↓
Repository Suggestion
```

---

# 45. AI Repository Update Rule

AI cannot directly modify repository.

Must:

```text
Create Suggestion
↓
User Approval
↓
PR Workflow
```

---

# 46. Search Data Flow

```text
Search Query
↓
Local Index
↓
Results
```

---

Fallback:

```text
Repository Scan
```

---

# 47. Progress Data Flow

```text
Node Status
↓
Progress Engine
↓
Metrics
↓
Dashboard
```

---

# 48. Assessment Data Flow

```text
Assessment Start
↓
Questions
↓
Answers
↓
Scoring
↓
Recommendations
```

---

# 49. Repository Sync Flow

```text
Edit
↓
Auto Save
↓
Commit
↓
Push
↓
Refresh Metadata
↓
Update Dashboard
```

---

# 50. State Persistence Rules

Persist:

```text
Preferences

Recent Activity

Expanded Nodes

Theme
```

---

Do Not Persist:

```text
Secrets

Tokens

Sensitive Session Data
```

---

# 51. Store Size Rule

Stores should contain:

```text
Minimal Required State
```

---

Avoid:

```text
Large Content Blobs
```

---

# 52. Memory Optimization

Unload:

```text
Inactive Pages

Old Search Results

Old Assessments
```

when appropriate.

---

# 53. Performance Targets

State update:

```text
< 50ms
```

---

UI response:

```text
< 100ms
```

---

# 54. Re-render Optimization

Use:

```text
Selectors

Memoization

Component Isolation
```

---

# 55. Loading State Standards

Every async operation must support:

```text
Loading

Success

Error

Retry
```

---

# 56. Failure Handling

Failure must never:

```text
Lose User Work
```

---

# 57. State Testing Requirements

Validate:

```text
Store Updates

Cache Logic

Offline Queue

Sync Operations

Rollback Logic
```

---

# 58. Agent Development Rules

Agents must never:

```text
Create Duplicate Stores

Bypass Query Layer

Mix Server State With UI State

Store Secrets In State
```

---

# 59. Definition Of Done

State implementation is complete when:

```text
Predictable

Tested

Performant

Recoverable

Offline Safe
```

---

# 60. State Management Success Criteria

The architecture is successful when:

* UI remains responsive
* State remains predictable
* Repository stays synchronized
* Offline work is preserved
* Data loss is prevented
* AI interactions remain controlled
* Cache usage reduces API load
* Multi-agent development remains consistent

END OF DOCUMENT
