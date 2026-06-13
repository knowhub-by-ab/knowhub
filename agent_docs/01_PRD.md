# 01_PRD.md

# KnowHub

## Product Requirements Document (PRD)

Version: 1.0

Status: Approved Baseline

Date: June 2026

---

# 1. Executive Summary

KnowHub is an AI-powered, GitHub-native Personal Learning Operating System designed to help learners progress from complete beginner to industry professional across any domain.

The platform combines:

* Learning Management System (LMS)
* Personal Knowledge Management (PKM)
* AI Tutor
* AI Knowledge Architect
* Knowledge Graph
* Career Roadmap Generator
* GitHub-based Knowledge Repository

Unlike traditional LMS platforms, KnowHub ensures users retain full ownership of their learning content through GitHub repositories.

KnowHub itself does not own user knowledge.

Users own:

* Learning Trees
* Notes
* Knowledge Pages
* Tests
* Progress
* Resources
* Diagrams
* Learning Journals

All knowledge assets are stored inside user-controlled GitHub repositories.

---

# 2. Product Vision

Create the world's most powerful AI-assisted learning system where:

* Users own their knowledge
* AI acts as a learning architect
* Learning paths adapt continuously
* Knowledge grows indefinitely
* Learning repositories become lifelong assets

---

# 3. Product Philosophy

## 3.1 User Ownership First

User knowledge must never be locked inside the application.

All educational content must be exportable and stored inside user-controlled GitHub repositories.

---

## 3.2 AI As Contributor, Not Controller

AI may:

* Suggest
* Generate
* Expand
* Recommend

AI may not:

* Silently modify content
* Delete content
* Rewrite content without approval

---

## 3.3 Repository-As-Memory

The repository is the source of truth.

Important information must never exist only inside AI conversations.

---

## 3.4 Beginner To Industry Professional

Every learning page must:

```text
Start:
Absolute Beginner

End:
Industry Professional
```

No separate difficulty modes.

Knowledge progression must be embedded into content itself.

---

## 3.5 Free-First Strategy

Whenever possible:

* Open-source solutions preferred
* Free solutions preferred
* Free-tier solutions preferred

Paid services must never be mandatory.

---

# 4. Target Users

## Persona 1: Complete Beginner

Characteristics:

* No technical knowledge
* No programming experience
* No domain expertise

Goals:

* Learn from scratch
* Understand career options
* Build professional skills

---

## Persona 2: Career Switcher

Characteristics:

* Existing professional
* Changing industries

Goals:

* Learn efficiently
* Build roadmaps
* Identify gaps

---

## Persona 3: Experienced Professional

Characteristics:

* Existing domain expertise

Goals:

* Upskill
* Reskill
* Track learning

---

## Persona 4: Lifelong Learner

Characteristics:

* Continuously learns

Goals:

* Organize knowledge
* Maintain learning repository
* Build personal knowledge base

---

# 5. Core Product Modules

## Module 1: Authentication

Features:

* Firebase Authentication
* Google Sign-In
* Session Management

---

## Module 2: GitHub Repository Management

Features:

* GitHub OAuth
* Create Repository
* Connect Existing Repository
* Repository Validation
* Repository Switching

---

## Module 3: Learning Tree

Features:

* Expandable Tree Structure
* Nested Nodes
* Parent/Child Relationships
* Manual Node Creation
* AI Node Recommendation

---

## Module 4: Knowledge Graph

Features:

* Cross-node relationships
* Dependency mapping
* Visualization

A node may belong to multiple domains simultaneously.

---

## Module 5: Learning Pages

Each node contains:

* Overview
* Concepts
* Explanations
* Examples
* Industry Applications
* Best Practices
* Resources
* Diagrams

Stored as Markdown.

---

## Module 6: AI Chat

Capabilities:

* Ask Questions
* Explain Concepts
* Generate Pages
* Expand Trees
* Generate Tests
* Find Knowledge Gaps

---

## Module 7: Search

Capabilities:

* Tree Search
* Node Search
* Content Search
* Notes Search
* Resource Search

Supports:

* Keyword Search
* Semantic Search

---

## Module 8: Progress Tracking

States:

```text
Pending

In Progress

Completed
```

Track:

* Node Progress
* Tree Progress
* Domain Progress
* Overall Progress

---

## Module 9: Knowledge Testing

Question Types:

* Single Choice MCQ
* Multiple Choice MCQ

All answers must be selectable choices.

No subjective answers.

---

## Module 10: Learning Recommendations

Generated from:

* Test Scores
* Progress
* Missing Dependencies
* Knowledge Gaps

---

## Module 11: Career Roadmaps

Generate:

```text
Goal
↓
Skills
↓
Learning Tree
↓
Projects
↓
Readiness
```

Examples:

* AI Engineer
* Full Stack Engineer
* Product Manager
* Program Manager
* UX Designer
* Management Consultant

---

## Module 12: Career Readiness Dashboard

Track:

* Required Skills
* Completed Skills
* Missing Skills
* Estimated Readiness

---

## Module 13: Global Personal Notes

Single repository-wide notebook.

Contains:

* Quick Notes
* Ideas
* Questions
* Learning Journal
* Career Thoughts
* Project Ideas
* Revision Notes
* Scratchpad

Not node-specific.

---

## Module 14: Resource Library

Stores:

* Documentation
* Articles
* Videos
* Courses
* Books

Prefer free resources.

---

## Module 15: Draft Workspace

AI-generated content enters Draft Workspace first.

Flow:

```text
AI Suggestion
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

## Module 16: AI Approval Queue

User approves:

* New Nodes
* Node Updates
* Tree Modifications
* Diagram Generation
* Test Generation

---

## Module 17: Analytics Dashboard

Displays:

* Learning Progress
* Study Activity
* Node Counts
* Test Performance
* AI Usage

---

# 6. AI System Requirements

Primary Provider:

```text
the KnowHub AI gateway
```

---

Capabilities:

* Node Generation
* Tree Expansion
* Diagram Generation
* Test Generation
* Learning Recommendations
* Resource Recommendations
* Gap Analysis

---

# 7. AI Provider Management

Default:

```text
the KnowHub AI gateway
```

User may optionally configure:

* OpenRouter
* Gemini
* Groq
* OpenAI
* Anthropic
* DeepSeek
* GitHub Models
* Custom Endpoint

---

Priority Routing:

```text
Provider 1
↓
Provider 2
↓
Provider 3
```

Automatic failover.

---

# 8. AI Usage Dashboard

Displays:

* Requests
* Tokens
* Provider Usage
* Active Provider
* Failover Events

---

# 9. Learning Tree Requirements

Must support:

* Unlimited Depth
* Unlimited Nodes
* Expand/Collapse
* Reordering
* Search
* Dependency Relationships

---

# 10. Knowledge Graph Requirements

Must support:

* Multi-parent Nodes
* Cross-domain Links
* Dependency Visualization

---

# 11. Testing Requirements

Each node may contain:

* Test Set
* Score History
* Recommendation History

AI generates recommendations from results.

---

# 12. GitHub Integration Requirements

Capabilities:

* Create Repository
* Connect Repository
* Commit
* Push
* Pull
* Sync

Repository remains source of truth.

---

# 13. Repository Structure Requirements

Repository stores:

```text
knowledge/
notes/
drafts/
resources/
tests/
progress/
settings/
diagrams/
metadata/
```

Detailed structure defined in later documents.

---

# 14. Mobile Requirements

Platform:

```text
Web
PWA
Android APK
```

Single codebase.

Built using Capacitor.

---

# 15. Android Distribution Requirements

Distribution:

```text
GitHub Releases
```

No Play Store dependency.

Landing page must provide:

```text
Download APK
```

button.

---

# 16. Offline Requirements

Support:

* Offline Reading
* Offline Notes
* Offline Progress Tracking

Synchronization when connectivity returns.

---

# 17. Security Requirements

Authentication:

* Firebase Google Authentication

Repository Access:

* GitHub OAuth

Storage:

* Encrypted secrets
* Secure API key storage

---

# 18. Performance Requirements

Target:

* Initial Load < 3 seconds
* Search Results < 500ms
* Tree Expansion < 300ms
* Page Navigation < 500ms

---

# 19. Accessibility Requirements

Must support:

* Keyboard Navigation
* Screen Readers
* Mobile Accessibility
* Responsive Design

---

# 20. Non-Functional Requirements

The system must be:

* Modular
* Extensible
* Repository-Centric
* AI-Augmented
* Mobile-Friendly
* Free-Tier Compatible
* Vendor-Independent

---

# 21. Success Metrics

Learning Metrics:

* Nodes Completed
* Trees Completed
* Tests Passed
* Roadmaps Generated

System Metrics:

* Search Speed
* Sync Reliability
* AI Response Quality

User Metrics:

* Retention
* Repository Growth
* Knowledge Growth

---

# 22. Future Vision

Potential future enhancements:

* Community Tree Marketplace
* Public Tree Sharing
* Tree Forking
* Collaborative Learning
* Team Knowledge Repositories
* Multi-language Support
* iOS Application
* AI Study Groups

---

# 23. MVP Scope

Must Include:

* Google Login
* GitHub Integration
* Learning Tree
* Knowledge Graph
* AI Chat
* Search
* Notes
* Tests
* Progress Tracking
* Draft Workspace
* Approval Queue
* the KnowHub AI gateway Integration
* Android APK Support

---

# 24. Out Of Scope (Initial Release)

* Play Store Distribution
* Paid AI Subscriptions
* Team Workspaces
* Enterprise Features
* Social Networking
* Real-time Collaboration

---

# 25. Acceptance Condition

KnowHub v1 is considered complete when:

* A new user can sign in with Google
* Connect a GitHub repository
* Generate a learning tree using AI
* Learn using generated pages
* Take tests
* Track progress
* Search knowledge
* Store notes
* Approve AI changes
* Synchronize content with GitHub
* Use the system from both web and Android applications

END OF DOCUMENT
