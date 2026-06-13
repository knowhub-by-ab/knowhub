# 02_SYSTEM_ARCHITECTURE.md

# KnowHub

## System Architecture Specification

Version: 1.0

Status: Approved Baseline

Depends On:

```text
01_PRD.md
```

---

# 1. Purpose

This document defines the complete system architecture of KnowHub.

It serves as the technical blueprint for:

* Claude Code
* GitHub Copilot Agent
* Codex
* Amazon Q Developer
* Cursor Agents
* Windsurf Agents
* Roo Code
* Cline
* OpenHands
* Human Developers

---

# 2. Architecture Principles

## 2.1 User Ownership

The user's GitHub repository is the source of truth for learning content.

KnowHub is merely an interface layer.

---

## 2.2 AI As Contributor

AI proposes changes.

AI never silently modifies repositories.

All AI changes pass through:

```text
Draft Workspace
↓
Approval Queue
↓
Commit
↓
Push
```

---

## 2.3 Modular Design

Every subsystem must be independently replaceable.

Examples:

```text
AI Provider
Authentication
Search Engine
Database
Diagram Engine
```

---

## 2.4 Free-Tier First

Architecture must prioritize:

* Free services
* Open-source software
* Self-hostable components

---

# 3. High-Level Architecture

```text
┌────────────────────────────────────┐
│             USER                   │
└──────────────┬─────────────────────┘
               │
               ▼
┌────────────────────────────────────┐
│         KNOWHUB FRONTEND           │
│ React + TypeScript + Vite          │
└──────────────┬─────────────────────┘
               │
               ▼
┌────────────────────────────────────┐
│      CLOUDFLARE WORKERS API        │
└───────┬─────────┬─────────┬────────┘
        │         │         │
        ▼         ▼         ▼

  Firebase     GitHub      AI Layer
    Auth        APIs      the KnowHub AI gateway

        │
        ▼

┌────────────────────────────────────┐
│         CLOUDFLARE D1              │
└────────────────────────────────────┘

        │
        ▼

┌────────────────────────────────────┐
│      USER GITHUB REPOSITORY        │
└────────────────────────────────────┘
```

---

# 4. Technology Stack

## Frontend

```text
React
TypeScript
Vite
Tailwind CSS
ShadCN UI
TanStack Router
TanStack Query
```

Responsibilities:

* UI Rendering
* Navigation
* State Management
* User Interaction

---

## Visualization

```text
React Flow
Mermaid
D3.js (Optional)
```

Responsibilities:

* Learning Tree
* Knowledge Graph
* Dependency Graphs
* Diagrams

---

## Backend

```text
Cloudflare Workers
```

Responsibilities:

* API Layer
* Authentication Validation
* GitHub Operations
* AI Orchestration
* Search Services

---

## Database

```text
Cloudflare D1
```

Responsibilities:

* User Records
* Progress Tracking
* Test Results
* Sessions
* Analytics
* Settings

---

## Cache

```text
Cloudflare KV
```

Responsibilities:

* Search Cache
* AI Cache
* Temporary Sessions

---

# 5. Frontend Architecture

## Application Layers

```text
Presentation Layer
↓
Feature Layer
↓
Domain Layer
↓
Infrastructure Layer
```

---

## Frontend Modules

```text
Authentication

Dashboard

Learning Tree

Knowledge Graph

Learning Pages

Search

Tests

Progress

AI Chat

Notes

Resources

Settings
```

---

# 6. Backend Architecture

## API Gateway Layer

Responsibilities:

```text
Authentication

Request Validation

Rate Limiting

Routing

Monitoring
```

---

## Service Layer

Services:

```text
Auth Service

GitHub Service

AI Service

Search Service

Progress Service

Test Service

Analytics Service

Repository Service
```

---

## Repository Layer

Responsible for:

```text
GitHub Operations

D1 Operations

KV Operations
```

---

# 7. Authentication Architecture

## Primary Authentication

```text
Firebase Authentication
```

Supported:

```text
Google Sign-In
```

---

## Authorization

```text
GitHub OAuth
```

Required for:

```text
Repository Access

Commit Access

Push Access

Repository Creation
```

---

## Login Flow

```text
User
↓
Google Sign-In
↓
Firebase Token
↓
GitHub OAuth
↓
Repository Selection
↓
Dashboard
```

---

# 8. Repository Architecture

## One User = One Repository

Example:

```text
User A
→ github.com/userA/knowhub

User B
→ github.com/userB/learning-system
```

---

## Repository Source Of Truth

Stored in repository:

```text
Knowledge

Trees

Notes

Diagrams

Resources

Drafts
```

---

# 9. AI Architecture

## Primary Provider

```text
the KnowHub AI gateway
```

---

## Optional Providers

```text
OpenRouter

Gemini

Groq

DeepSeek

OpenAI

Anthropic

GitHub Models

Custom Endpoint
```

---

## AI Provider Manager

Responsibilities:

```text
Provider Selection

Failover

Health Monitoring

Usage Tracking
```

---

## AI Workflow

```text
User Request
↓
AI Service
↓
Provider Manager
↓
Selected Provider
↓
Response
```

---

# 10. AI Content Workflow

## New Content

```text
Generate
↓
Draft
↓
Review
↓
Approve
↓
Commit
```

---

## Update Content

```text
Proposed Change
↓
Draft Workspace
↓
Approval Queue
↓
Commit
```

---

# 11. Learning Tree Architecture

## Data Structure

```text
Tree Node
├── ID
├── Parent
├── Children
├── Metadata
├── Status
└── Dependencies
```

---

## Supported Operations

```text
Create

Update

Delete

Move

Search

Expand

Collapse
```

---

# 12. Knowledge Graph Architecture

## Graph Node

```text
Node ID

Related Nodes

Dependencies

Cross References
```

---

## Relationships

```text
Depends On

Related To

Prerequisite Of

Part Of
```

---

# 13. Search Architecture

## Layer 1

Keyword Search

Technology:

```text
MiniSearch
```

---

## Layer 2

Semantic Search

Technology:

```text
Embeddings
```

Stored in:

```text
Cloudflare D1
```

---

## Search Scope

```text
Nodes

Pages

Resources

Notes

Tests

Diagrams
```

---

# 14. Progress Architecture

## Status States

```text
Pending

In Progress

Completed
```

---

## Progress Levels

```text
Node

Tree

Domain

Global
```

---

# 15. Testing Architecture

## Test Types

```text
Single Choice MCQ

Multiple Choice MCQ
```

Only choice-based answers permitted.

---

## Test Workflow

```text
Take Test
↓
Evaluate
↓
Store Score
↓
Generate Recommendations
```

---

# 16. Notes Architecture

## Global Notebook

Single notebook per repository.

Contains:

```text
Quick Notes

Ideas

Questions

Learning Journal

Career Thoughts

Project Ideas

Bookmarks

Revision Notes

Scratchpad
```

---

# 17. Analytics Architecture

Track:

```text
Learning Activity

Progress

Tests

Search Activity

AI Usage
```

---

# 18. Mobile Architecture

## Deployment Targets

```text
Web

PWA

Android APK
```

---

## Technology

```text
Capacitor
```

---

## Single Codebase

```text
React
↓
Web

React
↓
Android
```

---

# 19. Offline Architecture

## Local Storage

```text
IndexedDB
```

Stores:

```text
Pages

Notes

Progress

Drafts
```

---

## Sync Strategy

```text
Offline Changes
↓
Queue
↓
Reconnect
↓
Sync
```

---

# 20. GitHub Integration Architecture

## GitHub Services

```text
Repository Creation

Repository Selection

Commit

Push

Pull

Sync
```

---

## Authentication

```text
GitHub OAuth
```

---

# 21. Release Architecture

## CI/CD

```text
GitHub Actions
```

Responsibilities:

```text
Build

Test

Deploy

Package APK

Publish Releases
```

---

## APK Distribution

```text
GitHub Releases
```

Landing page button:

```text
Download APK
```

---

# 22. Monitoring Architecture

Track:

```text
Errors

Performance

API Failures

AI Failures

Sync Failures
```

---

# 23. Security Architecture

## Secrets

Never store:

```text
API Keys

OAuth Tokens

Secrets
```

inside repositories.

---

Store in:

```text
Encrypted D1 Storage
```

or secure secrets manager.

---

## Repository Protection

Use:

```text
Least Privilege

OAuth Scopes

Permission Validation
```

---

# 24. Scalability Considerations

System must support:

```text
Thousands of Nodes

Large Repositories

Long-Term Usage

Multi-Year Learning Histories
```

---

# 25. Future Extension Points

Potential future modules:

```text
Community Trees

Public Tree Marketplace

Collaborative Learning

Study Groups

Tree Forking

iOS App

Enterprise Workspaces
```

Architecture must remain extensible.

---

# 26. System Boundaries

KnowHub Owns:

```text
UI

AI Orchestration

Authentication

Search

Analytics
```

---

User Owns:

```text
Knowledge

Trees

Notes

Resources

Repository
```

---

# 27. Architectural Success Criteria

Architecture is considered successful when:

* Users fully own their repositories
* AI changes require approval
* Repository remains source of truth
* System works on web and Android
* the KnowHub AI gateway is fully integrated
* Search remains performant
* Learning trees scale effectively
* Multi-user isolation is maintained

END OF DOCUMENT
