# 18_DEPLOYMENT_DEVOPS_AND_INFRASTRUCTURE_SPECIFICATION.md

# KnowHub

## Deployment, DevOps & Infrastructure Specification

Version: 1.0

Status: Approved Baseline

Depends On:

```text
01_PRD.md

02_SYSTEM_ARCHITECTURE.md

03_DATABASE_SCHEMA.md

04_GITHUB_REPOSITORY_STRUCTURE.md

06_AI_SYSTEM_SPECIFICATION.md

09_GITHUB_SYNC_AND_VERSION_CONTROL_SPECIFICATION.md

10_AUTH_USER_MANAGEMENT_AND_SECURITY_SPECIFICATION.md

17_AI_CHAT_ORCHESTRATION_AND_CONTEXT_AWARENESS_SPECIFICATION.md
```

---

# 1. Purpose

This document defines:

* Infrastructure Architecture
* Deployment Strategy
* CI/CD Pipelines
* Environment Management
* Cloudflare Infrastructure
* Firebase Integration
* GitHub Automation
* Android Build Pipeline
* Backup Strategy
* Disaster Recovery

---

# 2. Core Philosophy

Per product requirements:

```text
₹0 Cost

Maximum Free Tier Usage

Vendor Simplicity

Minimal Maintenance

High Reliability
```

---

# 3. Infrastructure Objectives

The infrastructure must provide:

```text
Global Availability

Low Cost

Automatic Deployments

High Performance

Scalability

Disaster Recovery
```

---

# 4. Infrastructure Overview

```text
User
 │
 ▼
Cloudflare Pages
 │
 ├── React Frontend
 │
 ▼
Cloudflare Workers
 │
 ├── AI Orchestration
 ├── Search APIs
 ├── GitHub APIs
 ├── User APIs
 │
 ▼
Cloudflare D1
 │
 ├── User Data
 ├── Progress Data
 ├── Analytics
 │
 ▼
Cloudflare R2
 │
 ├── Backups
 ├── Attachments
 ├── Exports
 │
 ▼
GitHub Repository
 │
 ├── Learning Tree
 ├── Pages
 ├── Notes
 ├── Tests
 ├── Resources
```

---

# 5. Infrastructure Stack

Frontend:

```text
React

TypeScript

Vite

TailwindCSS

ShadCN UI
```

---

Backend:

```text
Cloudflare Workers
```

---

Database:

```text
Cloudflare D1
```

---

Object Storage:

```text
Cloudflare R2
```

---

Authentication:

```text
Firebase Google Authentication
```

---

Repository Storage:

```text
GitHub
```

---

# 6. Why Cloudflare

Advantages:

```text
Excellent Free Tier

Global CDN

Fast Edge Runtime

Simple Deployment

Integrated Ecosystem
```

---

# 7. Frontend Hosting

Provider:

```text
Cloudflare Pages
```

---

Purpose:

```text
Static Frontend Hosting
```

---

# 8. Frontend Deployment Workflow

```text
GitHub Push
        │
        ▼
Cloudflare Pages Build
        │
        ▼
Deployment
        │
        ▼
Production
```

---

# 9. Backend Hosting

Provider:

```text
Cloudflare Workers
```

---

Purpose:

```text
API Layer

AI Orchestration

Repository Operations

Authentication Validation
```

---

# 10. Worker Responsibilities

Workers handle:

```text
Authentication

AI Requests

Repository Access

Node Operations

Search Operations

Assessment Operations

Settings Management
```

---

# 11. Database Layer

Provider:

```text
Cloudflare D1
```

---

Stores:

```text
User Profiles

Progress

Analytics

Settings

Sessions

Metadata
```

---

# 12. Repository As Source Of Truth

Learning content must reside in:

```text
GitHub Repository
```

---

Not D1.

---

# 13. D1 Responsibilities

D1 stores:

```text
Progress

Analytics

Settings

Indexes

Caches

Metadata
```

---

# 14. Object Storage

Provider:

```text
Cloudflare R2
```

---

Stores:

```text
Backups

Exports

Uploaded Assets

Temporary Files
```

---

# 15. Authentication Infrastructure

Provider:

```text
Firebase Authentication
```

---

Method:

```text
Google Sign-In Only
```

---

# 16. Login Flow

```text
User
 ↓
Google Login
 ↓
Firebase Token
 ↓
Cloudflare Worker Validation
 ↓
Session Creation
```

---

# 17. GitHub Repository Integration

Each user owns:

```text
One GitHub Repository
```

---

Repository stores:

```text
Learning Trees

Knowledge Pages

Resources

Assessments

Notes
```

---

# 18. New User Flow

Upon signup:

```text
Choose Existing Repository
```

or

```text
Create New Repository
```

---

# 19. Shared User Model

Per approved product decision:

```text
Every User Uses Their Own Repository
```

---

Example:

```text
Aishee
→ aishee-knowhub

Friend
→ friend-knowhub
```

---

# 20. Repository Access Model

Authentication:

```text
GitHub OAuth
```

---

Required permissions:

```text
Repository Read

Repository Write

Repository Metadata
```

---

# 21. GitHub Sync Service

Purpose:

```text
Read Repository

Write Repository

Commit Changes

Create Branches

Create Pull Requests
```

---

# 22. Auto-Save Architecture

```text
Editor Change
 ↓
Local Save
 ↓
Queue Update
 ↓
Background Sync
```

---

# 23. Auto Commit Rules

Trigger:

```text
Every 10 Minutes
```

and

```text
Before Logout
```

and

```text
Before Session Expiry
```

---

# 24. Commit Strategy

Commit message examples:

```text
docs: update docker fundamentals

notes: add kubernetes note

assessment: create python quiz
```

---

# 25. Pull Request Mode

AI-generated content:

```text
Never Commit Directly
```

---

Workflow:

```text
Generate Draft
 ↓
Draft Branch
 ↓
Pull Request
 ↓
User Review
 ↓
Merge
```

---

# 26. Branch Strategy

Main branch:

```text
main
```

---

Draft branches:

```text
draft/node-python

draft/docker-volume-page

draft/assessment-git
```

---

# 27. Environment Strategy

Supported environments:

```text
Development

Staging

Production
```

---

# 28. Development Environment

Purpose:

```text
Local Development
```

---

# 29. Staging Environment

Purpose:

```text
Testing Before Release
```

---

# 30. Production Environment

Purpose:

```text
Live User System
```

---

# 31. Environment Variables

Managed through:

```text
Cloudflare Secrets
```

---

Examples:

```text
Firebase Keys

GitHub Keys

AI Provider Keys

Encryption Keys
```

---

# 32. Secrets Management Rules

Secrets must:

```text
Never Be Committed

Never Be Logged

Never Be Exposed To Frontend
```

---

# 33. AI Infrastructure

Primary:

```text
FreeLLMAPI
```

---

Fallbacks:

```text
Gemini

OpenRouter

OpenAI

Anthropic
```

---

# 34. AI Routing Layer

Hosted in:

```text
Cloudflare Workers
```

---

Responsibilities:

```text
Provider Selection

Fallback Logic

Rate Limit Handling
```

---

# 35. User API Key Storage

Users may configure:

```text
Gemini

OpenAI

Anthropic

OpenRouter

Other Providers
```

---

Stored encrypted.

---

# 36. API Key Encryption

Required:

```text
AES-256 Encryption
```

before persistence.

---

# 37. Build System

Frontend Build Tool:

```text
Vite
```

---

Build Output:

```text
dist/
```

---

# 38. CI/CD Pipeline

Platform:

```text
GitHub Actions
```

---

# 39. CI Workflow

```text
Push
 ↓
Install
 ↓
Lint
 ↓
Test
 ↓
Build
 ↓
Deploy
```

---

# 40. Code Quality Gates

Required:

```text
ESLint

TypeScript Checks

Unit Tests
```

---

# 41. Deployment Automation

Production deployment:

```text
Fully Automated
```

---

No manual deployment.

---

# 42. Android App Strategy

Technology:

```text
Capacitor
```

---

Purpose:

```text
Convert Web App To Android App
```

---

# 43. Android Build Workflow

```text
React Build
 ↓
Capacitor Sync
 ↓
Android Build
 ↓
APK Generation
```

---

# 44. APK Distribution

Per approved requirement:

```text
GitHub Releases
```

---

No Play Store required.

---

# 45. Landing Page APK Download

Landing page contains:

```text
Download Android App
```

button.

---

Source:

```text
Latest GitHub Release
```

---

# 46. Backup Strategy

Primary:

```text
GitHub Repository
```

---

Secondary:

```text
Cloudflare R2 Snapshots
```

---

# 47. Backup Schedule

```text
Daily Snapshot

Weekly Snapshot

Monthly Snapshot
```

---

# 48. Disaster Recovery

Recovery sources:

```text
GitHub

R2 Backups

D1 Backups
```

---

# 49. Monitoring

Monitor:

```text
Worker Errors

Sync Failures

AI Failures

Authentication Failures

Deployment Failures
```

---

# 50. Logging

Log:

```text
System Events

Errors

Warnings

Sync Operations
```

---

Never log:

```text
Passwords

Tokens

API Keys

Sensitive User Data
```

---

# 51. Observability

Recommended:

```text
Cloudflare Analytics

Worker Analytics

GitHub Actions Logs
```

---

# 52. Offline Support

Supported Offline:

```text
Notes

Progress

Recently Viewed Pages

Tree Metadata
```

---

Requires Internet:

```text
AI

GitHub Sync

Resource Discovery
```

---

# 53. Infrastructure Scaling Strategy

Expected scaling:

```text
Single User

Small Friend Groups

Community Usage
```

without architectural redesign.

---

# 54. Future Infrastructure Enhancements

Potential future additions:

```text
Multi-Region Backups

Advanced Monitoring

Local AI Models

Collaborative Workspaces
```

Not MVP.

---

# 55. Infrastructure Performance Targets

Targets:

```text
Dashboard Load < 2s

API Response < 500ms

Search < 500ms

Sync < 5s
```

---

# 56. Infrastructure Cost Policy

Priority:

```text
Stay Within Free Tier
```

always.

---

Paid upgrades require:

```text
Explicit User Approval
```

---

# 57. Infrastructure Success Criteria

Infrastructure is successful when:

* The entire platform runs on free or free-tier services
* GitHub remains the source of truth
* Deployments are automated
* AI provider switching is seamless
* User repositories remain isolated
* Android APK generation is automated
* Backups are reliable
* Maintenance burden remains minimal

END OF DOCUMENT
