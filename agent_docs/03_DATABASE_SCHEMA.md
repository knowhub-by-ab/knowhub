# 03_DATABASE_SCHEMA.md

# KnowHub

## Database Schema Specification

Version: 1.0

Status: Approved Baseline

Depends On:

```text id="7i0l0k"
01_PRD.md

02_SYSTEM_ARCHITECTURE.md
```

---

# 1. Purpose

This document defines:

* Cloudflare D1 database architecture
* Tables
* Relationships
* Indexes
* Constraints
* Data ownership rules
* Data lifecycle

The database exists only for application functionality.

The user's GitHub repository remains the source of truth for learning content.

---

# 2. Database Philosophy

## Store In GitHub

```text id="99x0kb"
Learning Trees

Knowledge Pages

Notes

Diagrams

Resources

Drafts

Tests Definitions
```

---

## Store In D1

```text id="l68z6l"
Users

Authentication Metadata

Progress

Test Results

Analytics

AI Settings

Provider Settings

Search Embeddings

Session Metadata
```

---

# 3. Database Overview

```text id="qcrxwy"
users

repositories

user_settings

ai_provider_configs

learning_progress

test_attempts

test_results

analytics_events

activity_logs

draft_changes

search_embeddings

saved_searches

notifications

sync_history

resource_bookmarks
```

---

# 4. Entity Relationship Overview

```text id="g4sjul"
User
 │
 ├── Repository
 │
 ├── Settings
 │
 ├── Progress
 │
 ├── Test Attempts
 │
 ├── Analytics
 │
 ├── Draft Changes
 │
 ├── Notifications
 │
 └── Saved Searches
```

---

# 5. users

## Purpose

Stores user profile metadata.

---

## Schema

| Column         | Type      |
| -------------- | --------- |
| id             | TEXT (PK) |
| firebase_uid   | TEXT      |
| email          | TEXT      |
| display_name   | TEXT      |
| avatar_url     | TEXT      |
| created_at     | DATETIME  |
| updated_at     | DATETIME  |
| last_login_at  | DATETIME  |
| account_status | TEXT      |

---

## Indexes

```sql
firebase_uid UNIQUE
email UNIQUE
```

---

## Status Values

```text id="mnj7j3"
ACTIVE

SUSPENDED

DELETED
```

---

# 6. repositories

## Purpose

Stores connected GitHub repositories.

---

## Schema

| Column         | Type      |
| -------------- | --------- |
| id             | TEXT (PK) |
| user_id        | TEXT      |
| github_repo_id | TEXT      |
| repo_name      | TEXT      |
| repo_owner     | TEXT      |
| repo_url       | TEXT      |
| default_branch | TEXT      |
| is_primary     | BOOLEAN   |
| created_at     | DATETIME  |
| updated_at     | DATETIME  |

---

## Relationship

```text id="ntqqp9"
User
1 → Many
Repositories
```

---

# 7. user_settings

## Purpose

Stores application preferences.

---

## Schema

| Column              | Type     |
| ------------------- | -------- |
| id                  | TEXT     |
| user_id             | TEXT     |
| theme               | TEXT     |
| language            | TEXT     |
| default_view        | TEXT     |
| onboarding_complete | BOOLEAN  |
| created_at          | DATETIME |
| updated_at          | DATETIME |

---

## Theme Values

```text id="u1t08s"
LIGHT

DARK

SYSTEM
```

---

# 8. ai_provider_configs

## Purpose

Stores AI provider settings.

---

## Schema

| Column            | Type     |
| ----------------- | -------- |
| id                | TEXT     |
| user_id           | TEXT     |
| provider_name     | TEXT     |
| encrypted_api_key | TEXT     |
| base_url          | TEXT     |
| model_name        | TEXT     |
| priority_order    | INTEGER  |
| enabled           | BOOLEAN  |
| created_at        | DATETIME |
| updated_at        | DATETIME |

---

## Supported Providers

```text id="2sq3bf"
FreeLLMAPI

OpenRouter

Gemini

Groq

OpenAI

Anthropic

DeepSeek

GitHub Models

Custom Endpoint
```

---

# 9. provider_health_status

## Purpose

Tracks provider health.

---

## Schema

| Column           | Type     |
| ---------------- | -------- |
| id               | TEXT     |
| provider_name    | TEXT     |
| last_checked_at  | DATETIME |
| status           | TEXT     |
| response_time_ms | INTEGER  |
| error_message    | TEXT     |

---

## Status

```text id="pkv36g"
ONLINE

OFFLINE

DEGRADED
```

---

# 10. learning_progress

## Purpose

Stores user learning progress.

---

## Schema

| Column          | Type     |
| --------------- | -------- |
| id              | TEXT     |
| user_id         | TEXT     |
| node_id         | TEXT     |
| node_path       | TEXT     |
| progress_status | TEXT     |
| started_at      | DATETIME |
| completed_at    | DATETIME |
| updated_at      | DATETIME |

---

## Status

```text id="v1g84q"
PENDING

IN_PROGRESS

COMPLETED
```

---

# 11. tree_progress

## Purpose

Aggregated progress.

---

## Schema

| Column           | Type     |
| ---------------- | -------- |
| id               | TEXT     |
| user_id          | TEXT     |
| tree_id          | TEXT     |
| total_nodes      | INTEGER  |
| completed_nodes  | INTEGER  |
| progress_percent | REAL     |
| updated_at       | DATETIME |

---

# 12. domain_progress

## Purpose

Tracks domain-level progress.

---

## Schema

| Column           | Type     |
| ---------------- | -------- |
| id               | TEXT     |
| user_id          | TEXT     |
| domain_name      | TEXT     |
| progress_percent | REAL     |
| completed_nodes  | INTEGER  |
| total_nodes      | INTEGER  |
| updated_at       | DATETIME |

---

# 13. test_attempts

## Purpose

Stores every test session.

---

## Schema

| Column        | Type     |
| ------------- | -------- |
| id            | TEXT     |
| user_id       | TEXT     |
| test_id       | TEXT     |
| node_id       | TEXT     |
| started_at    | DATETIME |
| submitted_at  | DATETIME |
| score_percent | REAL     |
| passed        | BOOLEAN  |

---

# 14. test_answers

## Purpose

Stores answer selections.

---

## Schema

| Column          | Type    |
| --------------- | ------- |
| id              | TEXT    |
| attempt_id      | TEXT    |
| question_id     | TEXT    |
| selected_option | TEXT    |
| is_correct      | BOOLEAN |

---

# 15. learning_recommendations

## Purpose

AI-generated recommendations.

---

## Schema

| Column              | Type     |
| ------------------- | -------- |
| id                  | TEXT     |
| user_id             | TEXT     |
| recommendation_type | TEXT     |
| title               | TEXT     |
| description         | TEXT     |
| priority            | INTEGER  |
| created_at          | DATETIME |
| acknowledged        | BOOLEAN  |

---

## Recommendation Types

```text id="qu6od8"
REVIEW

LEARN_NEXT

RETENTION

KNOWLEDGE_GAP

DEPENDENCY_MISSING
```

---

# 16. draft_changes

## Purpose

Stores AI-generated pending changes.

---

## Schema

| Column           | Type     |
| ---------------- | -------- |
| id               | TEXT     |
| user_id          | TEXT     |
| repository_id    | TEXT     |
| draft_type       | TEXT     |
| title            | TEXT     |
| description      | TEXT     |
| proposed_content | TEXT     |
| status           | TEXT     |
| created_at       | DATETIME |
| reviewed_at      | DATETIME |

---

## Draft Types

```text id="6y3zjx"
NEW_NODE

UPDATE_NODE

NEW_TEST

UPDATE_TEST

NEW_DIAGRAM

TREE_CHANGE
```

---

## Status

```text id="vdd0kn"
PENDING

APPROVED

REJECTED
```

---

# 17. analytics_events

## Purpose

Stores usage events.

---

## Schema

| Column        | Type     |
| ------------- | -------- |
| id            | TEXT     |
| user_id       | TEXT     |
| event_type    | TEXT     |
| event_name    | TEXT     |
| metadata_json | TEXT     |
| created_at    | DATETIME |

---

## Examples

```text id="2zy70w"
NODE_OPENED

NODE_COMPLETED

TEST_STARTED

TEST_COMPLETED

AI_CHAT

SEARCH_EXECUTED
```

---

# 18. activity_logs

## Purpose

Auditing.

---

## Schema

| Column             | Type     |
| ------------------ | -------- |
| id                 | TEXT     |
| user_id            | TEXT     |
| action_type        | TEXT     |
| action_description | TEXT     |
| created_at         | DATETIME |

---

# 19. ai_usage_logs

## Purpose

Tracks AI consumption.

---

## Schema

| Column        | Type     |
| ------------- | -------- |
| id            | TEXT     |
| user_id       | TEXT     |
| provider_name | TEXT     |
| model_name    | TEXT     |
| request_type  | TEXT     |
| tokens_used   | INTEGER  |
| request_cost  | REAL     |
| created_at    | DATETIME |

---

# 20. search_embeddings

## Purpose

Semantic search index.

---

## Schema

| Column           | Type     |
| ---------------- | -------- |
| id               | TEXT     |
| user_id          | TEXT     |
| content_type     | TEXT     |
| content_id       | TEXT     |
| embedding_vector | BLOB     |
| updated_at       | DATETIME |

---

## Content Types

```text id="r2gmlo"
NODE

PAGE

NOTE

RESOURCE

TEST
```

---

# 21. saved_searches

## Purpose

Stores reusable searches.

---

## Schema

| Column       | Type     |
| ------------ | -------- |
| id           | TEXT     |
| user_id      | TEXT     |
| search_query | TEXT     |
| created_at   | DATETIME |

---

# 22. notifications

## Purpose

Stores in-app notifications.

---

## Schema

| Column            | Type     |
| ----------------- | -------- |
| id                | TEXT     |
| user_id           | TEXT     |
| title             | TEXT     |
| message           | TEXT     |
| notification_type | TEXT     |
| is_read           | BOOLEAN  |
| created_at        | DATETIME |

---

# 23. sync_history

## Purpose

Tracks GitHub synchronization.

---

## Schema

| Column        | Type     |
| ------------- | -------- |
| id            | TEXT     |
| user_id       | TEXT     |
| repository_id | TEXT     |
| sync_type     | TEXT     |
| sync_status   | TEXT     |
| started_at    | DATETIME |
| completed_at  | DATETIME |
| details       | TEXT     |

---

## Sync Types

```text id="8h3eqx"
PUSH

PULL

FULL_SYNC
```

---

# 24. resource_bookmarks

## Purpose

Stores saved resources.

---

## Schema

| Column      | Type     |
| ----------- | -------- |
| id          | TEXT     |
| user_id     | TEXT     |
| resource_id | TEXT     |
| created_at  | DATETIME |

---

# 25. Session Management

## sessions

| Column              | Type     |
| ------------------- | -------- |
| id                  | TEXT     |
| user_id             | TEXT     |
| firebase_session_id | TEXT     |
| login_at            | DATETIME |
| logout_at           | DATETIME |
| device_type         | TEXT     |

---

# 26. Soft Delete Strategy

Never permanently delete immediately.

Use:

```text id="l0l2g4"
deleted_at
```

where applicable.

---

# 27. Audit Requirements

All critical operations must create activity logs.

Examples:

```text id="tux5k8"
Repository Connected

Repository Switched

Node Approved

Draft Rejected

API Key Updated

Provider Changed
```

---

# 28. Data Ownership Rules

User Owns:

```text id="2t10kl"
Knowledge

Notes

Trees

Resources

Diagrams
```

Stored in GitHub.

---

KnowHub Owns:

```text id="owm8h8"
Authentication Metadata

Progress

Analytics

Sessions

Provider Configurations
```

Stored in D1.

---

# 29. Encryption Requirements

Must encrypt:

```text id="33uz93"
API Keys

OAuth Tokens

Sensitive Settings
```

before database storage.

---

# 30. Indexing Requirements

Create indexes for:

```text id="5fvy69"
user_id

node_id

repository_id

provider_name

created_at
```

to support scale.

---

# 31. Database Scalability Requirements

Must support:

```text id="f0c52y"
100,000+ Nodes

Millions of Progress Records

Millions of Analytics Events

Multi-Year Learning Histories
```

without schema redesign.

---

# 32. Future Expansion Tables

Reserved for:

```text id="jpvf2v"
Community Trees

Tree Marketplace

Study Groups

Collaboration

Team Learning
```

Not part of MVP.

---

# 33. Database Success Criteria

Database architecture is successful when:

* User content remains GitHub-owned
* D1 stores operational metadata only
* AI providers are configurable
* Progress tracking scales
* Search remains performant
* Auditability is maintained
* Multi-user isolation is guaranteed

END OF DOCUMENT
