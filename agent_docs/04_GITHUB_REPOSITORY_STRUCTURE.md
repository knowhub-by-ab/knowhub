# 04_GITHUB_REPOSITORY_STRUCTURE.md

# KnowHub

## GitHub Repository Structure Specification

Version: 1.0

Status: Approved Baseline

Depends On:

```text id="sl4m61"
01_PRD.md

02_SYSTEM_ARCHITECTURE.md

03_DATABASE_SCHEMA.md
```

---

# 1. Purpose

This document defines the complete GitHub repository structure used by KnowHub.

The repository is the user's:

```text id="2z6v5d"
Personal Learning Repository

Personal Knowledge Repository

Personal Career Repository
```

The repository is the source of truth for all learning content.

---

# 2. Repository Philosophy

The repository must be:

```text id="x1jvsm"
Human Readable

AI Readable

Version Controlled

Portable

Future Proof
```

A user must be able to stop using KnowHub and still retain full value from the repository.

---

# 3. Repository Naming

Default recommendation:

```text id="4gcb7g"
knowhub-learning-repository
```

Alternative examples:

```text id="d2pjlwm"
my-learning-hub

career-roadmap

ai-engineering-learning

lifelong-learning-repo
```

---

# 4. Root Repository Structure

```text id="lf5k9n"
/
├── README.md

├── knowledge/

├── notes/

├── resources/

├── diagrams/

├── tests/

├── drafts/

├── metadata/

├── progress/

├── roadmaps/

├── generated/

├── exports/

├── archive/

├── .knowhub/

└── .github/
```

---

# 5. Root README.md

Purpose:

Repository landing page.

Contains:

```text id="2l1vv0"
Repository Overview

Learning Statistics

Current Goals

Active Roadmaps

Recent Activity

Quick Navigation
```

---

# 6. knowledge/

## Purpose

Stores all learning content.

---

Structure:

```text id="jlwm34"
/knowledge
```

---

Example:

```text id="lx5qqf"
knowledge/

├── programming/

├── software-engineering/

├── cloud-computing/

├── ai-ml/

├── product-management/

├── ux-design/

├── consulting/

├── marketing/

├── customer-success/

└── innovation-leadership/
```

---

# 7. Knowledge Node Structure

Example:

```text id="s0tk2l"
knowledge/

└── programming/

    └── python/

        ├── node.md

        ├── metadata.json

        ├── resources.md

        ├── tests.md

        ├── diagrams/

        └── assets/
```

---

# 8. node.md

Primary learning page.

Contains:

```text id="4ntqdo"
Overview

Beginner Explanation

Core Concepts

Detailed Concepts

Industry Understanding

Examples

Best Practices

Interview Perspective

Resources
```

---

# 9. metadata.json

Purpose:

Machine-readable metadata.

---

Example Structure

```json
{
  "id": "python",
  "title": "Python",
  "status": "PENDING",
  "parent": "programming",
  "dependencies": [],
  "related_nodes": [],
  "created_at": "",
  "updated_at": ""
}
```

---

# 10. resources.md

Contains:

```text id="v7vrrs"
Articles

Documentation

Videos

Courses

Books
```

Prefer free resources.

---

# 11. tests.md

Stores:

```text id="oqig1t"
MCQ Questions

Answer Keys

Explanations
```

---

# 12. diagrams/

Stores:

```text id="s7dmvv"
Mermaid Diagrams

Generated Diagrams

Architecture Diagrams
```

---

Example:

```text id="4wyyct"
python-overview.mmd

python-execution-flow.mmd
```

---

# 13. assets/

Stores:

```text id="c0b0jl"
Images

Screenshots

Reference Files
```

---

# 14. notes/

## Purpose

Global notebook.

Not node-specific.

---

Structure:

```text id="kmghw8"
notes/

├── quick_notes.md

├── ideas.md

├── questions.md

├── learning_journal.md

├── career_thoughts.md

├── project_ideas.md

├── bookmarks.md

├── revision_notes.md

└── scratchpad.md
```

---

# 15. resources/

Purpose:

Centralized resource library.

---

Structure:

```text id="k3r0yr"
resources/

├── articles/

├── books/

├── videos/

├── documentation/

└── courses/
```

---

# 16. diagrams/

Purpose:

Repository-wide diagrams.

---

Structure:

```text id="nlsjvx"
diagrams/

├── learning-tree/

├── knowledge-graphs/

├── roadmaps/

└── architecture/
```

---

# 17. tests/

Purpose:

Repository-wide testing data.

---

Structure:

```text id="w1o8g3"
tests/

├── generated/

├── custom/

├── archived/
```

---

# 18. drafts/

Purpose:

AI-generated pending content.

---

Structure:

```text id="63bqtw"
drafts/

├── new-nodes/

├── updates/

├── diagrams/

├── tests/

└── tree-changes/
```

---

# 19. Draft Workflow

```text id="vw5tfq"
AI Generate
↓
Draft Folder
↓
Review
↓
Approve
↓
Move To Knowledge
```

---

# 20. metadata/

Purpose:

Repository metadata.

---

Structure:

```text id="rywyj4"
metadata/

├── tree.json

├── graph.json

├── dependencies.json

├── statistics.json

├── repository.json

└── search-index.json
```

---

# 21. tree.json

Stores:

```text id="qj74ee"
Tree Structure

Parent Relationships

Ordering
```

---

Example

```json
{
  "root_nodes": []
}
```

---

# 22. graph.json

Stores:

```text id="08l02g"
Knowledge Graph

Cross References

Relationships
```

---

# 23. dependencies.json

Stores:

```text id="uq6vcq"
Node Dependencies

Prerequisites
```

---

# 24. statistics.json

Stores:

```text id="dwg9kb"
Node Counts

Resource Counts

Repository Metrics
```

---

# 25. repository.json

Stores:

```text id="vn3xv8"
Repository Configuration

Version

Settings
```

---

# 26. search-index.json

Stores:

```text id="86h1s3"
Keyword Indexes

Search Metadata
```

---

# 27. progress/

Purpose:

Repository-owned progress snapshots.

D1 remains authoritative for live progress.

Repository stores backups.

---

Structure:

```text id="pqmk5t"
progress/

├── snapshots/

├── milestones/

└── achievements/
```

---

# 28. roadmaps/

Purpose:

Stores generated career roadmaps.

---

Structure:

```text id="6wcr4w"
roadmaps/

├── active/

├── completed/

└── archived/
```

---

Example:

```text id="mjn4f0"
roadmaps/

└── ai-engineer/

    ├── roadmap.md

    ├── milestones.json

    └── readiness.json
```

---

# 29. generated/

Purpose:

Stores AI-generated artifacts.

---

Structure:

```text id="52qvmb"
generated/

├── pages/

├── diagrams/

├── tests/

├── recommendations/

└── reports/
```

---

# 30. exports/

Purpose:

Exported content.

---

Structure:

```text id="6fjofz"
exports/

├── pdf/

├── markdown/

├── html/

└── json/
```

---

# 31. archive/

Purpose:

Retired content.

---

Structure:

```text id="mgtg14"
archive/

├── nodes/

├── diagrams/

├── tests/

└── roadmaps/
```

---

# 32. .knowhub/

Purpose:

Internal application metadata.

---

Structure:

```text id="7r9x3o"
.knowhub/

├── config.json

├── version.json

├── sync-state.json

├── ai-settings.json

└── repository-health.json
```

---

# 33. config.json

Stores:

```text id="oaf8uq"
Repository Settings

Feature Flags

Preferences
```

---

# 34. sync-state.json

Stores:

```text id="71z75y"
Last Sync

Sync History

Sync Metadata
```

---

# 35. ai-settings.json

Stores:

Non-sensitive AI settings.

Never store:

```text id="lyh2bl"
API Keys

Tokens

Secrets
```

inside repository.

---

# 36. repository-health.json

Stores:

```text id="s1e6eo"
Integrity Checks

Validation Results

Repository Diagnostics
```

---

# 37. .github/

Purpose:

GitHub automation.

---

Structure:

```text id="2a1x1n"
.github/

├── workflows/

├── ISSUE_TEMPLATE/

└── PULL_REQUEST_TEMPLATE/
```

---

# 38. workflows/

Example:

```text id="6hnw9o"
build.yml

sync.yml

backup.yml

apk-release.yml
```

---

# 39. APK Release Workflow

Responsibilities:

```text id="s2vnn8"
Build Android APK

Create GitHub Release

Upload APK

Publish Release Notes
```

---

# 40. Repository Growth Strategy

Repository must support:

```text id="d5kjde"
10 Nodes

100 Nodes

1,000 Nodes

10,000+ Nodes
```

without structural redesign.

---

# 41. Naming Conventions

Folders:

```text id="m67hwt"
lowercase

hyphen-separated
```

Example:

```text id="4ryh0k"
cloud-computing

product-management

customer-success
```

---

Files:

```text id="j9f6ku"
snake_case

or

kebab-case
```

consistent repository-wide.

---

# 42. Version Control Strategy

All important changes:

```text id="x7zjlwm"
Commit

Push

Track
```

through Git.

---

Commit Examples:

```text id="7hj9bl"
Add Python Learning Node

Update Kubernetes Roadmap

Generate AI Test Set

Approve Graph Changes
```

---

# 43. Repository Validation Rules

Every node must contain:

```text id="t5wwdc"
node.md

metadata.json
```

minimum.

---

Validation fails if missing.

---

# 44. Backup Philosophy

Primary:

```text id="x6a1qg"
GitHub
```

Backup:

```text id="h4ngtb"
Git History
```

No separate backup system required for MVP.

---

# 45. Repository Portability

User must be able to:

```text id="1uy8gx"
Clone

Fork

Export

Archive
```

without KnowHub.

---

# 46. Repository Success Criteria

Repository structure is successful when:

* Human readable
* AI readable
* Git-native
* Scalable
* Portable
* Extensible
* Version controlled
* Independent of KnowHub

END OF DOCUMENT
