# 19_API_AND_BACKEND_CONTRACT_SPECIFICATION.md

# KnowHub

## API & Backend Contract Specification

Version: 1.0

Status: Approved Baseline

Depends On:

```text id="19-001"
01_PRD.md

02_SYSTEM_ARCHITECTURE.md

03_DATABASE_SCHEMA.md

06_AI_SYSTEM_SPECIFICATION.md

07_TREE_GRAPH_ENGINE_SPECIFICATION.md

08_SEARCH_ENGINE_SPECIFICATION.md

10_AUTH_USER_MANAGEMENT_AND_SECURITY_SPECIFICATION.md

17_AI_CHAT_ORCHESTRATION_AND_CONTEXT_AWARENESS_SPECIFICATION.md

18_DEPLOYMENT_DEVOPS_AND_INFRASTRUCTURE_SPECIFICATION.md
```

---

# 1. Purpose

This document defines:

* API Architecture
* Backend Contracts
* Request Models
* Response Models
* Authentication Rules
* Error Handling
* API Versioning
* Service Boundaries

This document serves as the official contract between:

```text id="19-002"
Frontend

Backend

AI Services

GitHub Integration Layer
```

---

# 2. API Philosophy

All APIs must be:

```text id="19-003"
Predictable

Typed

Versioned

Secure

Consistent
```

---

# 3. Architecture Overview

```text id="19-004"
Frontend
   │
   ▼
Cloudflare Worker API Layer
   │
   ├── Auth Service
   ├── Tree Service
   ├── AI Service
   ├── Search Service
   ├── Assessment Service
   ├── Resource Service
   ├── Notes Service
   ├── Progress Service
   └── GitHub Service
```

---

# 4. API Base URL

Production:

```text id="19-005"
https://api.knowhub.app
```

---

Development:

```text id="19-006"
http://localhost:8787
```

---

# 5. API Versioning

Format:

```text id="19-007"
/api/v1/
```

---

Example:

```text id="19-008"
/api/v1/auth/me
```

---

# 6. Standard Request Headers

```http id="19-009"
Authorization: Bearer TOKEN

Content-Type: application/json
```

---

# 7. Standard Response Structure

Success:

```json id="19-010"
{
  "success": true,
  "data": {},
  "timestamp": ""
}
```

---

# 8. Error Response Structure

```json id="19-011"
{
  "success": false,
  "error": {
    "code": "",
    "message": ""
  }
}
```

---

# 9. Authentication Method

Provider:

```text id="19-012"
Firebase Authentication
```

---

Method:

```text id="19-013"
Google Sign-In
```

---

# 10. Authentication Flow

```text id="19-014"
Google Login
↓
Firebase Token
↓
Worker Validation
↓
Session
```

---

# 11. Authorization Model

Every request requires:

```text id="19-015"
Authenticated User
```

except public routes.

---

# 12. Auth Endpoints

```http id="19-016"
GET /api/v1/auth/me

POST /api/v1/auth/logout

POST /api/v1/auth/refresh
```

---

# 13. Current User Endpoint

```http id="19-017"
GET /api/v1/auth/me
```

Response:

```json id="19-018"
{
  "id": "",
  "email": "",
  "name": "",
  "repository": ""
}
```

---

# 14. Repository Service

Purpose:

```text id="19-019"
GitHub Repository Management
```

---

# 15. Repository Endpoints

```http id="19-020"
GET    /api/v1/repository

POST   /api/v1/repository/connect

POST   /api/v1/repository/create

POST   /api/v1/repository/sync
```

---

# 16. Connect Repository

Request:

```json id="19-021"
{
  "repository": "user-repo"
}
```

---

# 17. Repository Response

```json id="19-022"
{
  "repository": "",
  "sync_status": "",
  "last_sync": ""
}
```

---

# 18. Tree Service

Purpose:

```text id="19-023"
Learning Tree Operations
```

---

# 19. Tree Endpoints

```http id="19-024"
GET    /api/v1/tree

GET    /api/v1/tree/node/{id}

POST   /api/v1/tree/node

PUT    /api/v1/tree/node/{id}

DELETE /api/v1/tree/node/{id}
```

---

# 20. Create Node

Request:

```json id="19-025"
{
  "title": "",
  "parent_id": "",
  "description": ""
}
```

---

# 21. Node Response

```json id="19-026"
{
  "id": "",
  "title": "",
  "status": "PENDING"
}
```

---

# 22. Node Recommendation Service

Endpoint:

```http id="19-027"
POST /api/v1/tree/recommend
```

---

Response:

```json id="19-028"
{
  "recommendations": []
}
```

---

# 23. Content Service

Purpose:

```text id="19-029"
Knowledge Pages
```

---

# 24. Content Endpoints

```http id="19-030"
GET /api/v1/content/{id}

POST /api/v1/content

PUT /api/v1/content/{id}
```

---

# 25. Content Response

```json id="19-031"
{
  "id": "",
  "title": "",
  "markdown": ""
}
```

---

# 26. Notes Service

Purpose:

```text id="19-032"
Personal Notes Workspace
```

---

# 27. Notes Endpoints

```http id="19-033"
GET    /api/v1/notes

POST   /api/v1/notes

PUT    /api/v1/notes/{id}

DELETE /api/v1/notes/{id}
```

---

# 28. Create Note

Request:

```json id="19-034"
{
  "title": "",
  "content": "",
  "type": ""
}
```

---

# 29. Assessment Service

Purpose:

```text id="19-035"
Tests & Quizzes
```

---

# 30. Assessment Endpoints

```http id="19-036"
GET  /api/v1/tests

GET  /api/v1/tests/{id}

POST /api/v1/tests/submit
```

---

# 31. Submit Test

Request:

```json id="19-037"
{
  "test_id": "",
  "answers": []
}
```

---

Response:

```json id="19-038"
{
  "score": 0,
  "passed": false,
  "recommendations": []
}
```

---

# 32. Resource Service

Purpose:

```text id="19-039"
Learning Resources
```

---

# 33. Resource Endpoints

```http id="19-040"
GET /api/v1/resources

GET /api/v1/resources/{id}
```

---

# 34. Search Service

Purpose:

```text id="19-041"
Global Search
```

---

# 35. Search Endpoint

```http id="19-042"
GET /api/v1/search?q=
```

---

Response:

```json id="19-043"
{
  "nodes": [],
  "notes": [],
  "resources": [],
  "tests": []
}
```

---

# 36. Progress Service

Purpose:

```text id="19-044"
Learning Analytics
```

---

# 37. Progress Endpoints

```http id="19-045"
GET /api/v1/progress

GET /api/v1/readiness

GET /api/v1/analytics
```

---

# 38. Progress Response

```json id="19-046"
{
  "completion": 0,
  "readiness": 0,
  "completed_nodes": 0
}
```

---

# 39. AI Service

Purpose:

```text id="19-047"
AI Chat & Generation
```

---

# 40. AI Chat Endpoint

```http id="19-048"
POST /api/v1/ai/chat
```

---

Request:

```json id="19-049"
{
  "message": "",
  "conversation_id": ""
}
```

---

# 41. AI Chat Response

```json id="19-050"
{
  "answer": "",
  "recommendations": [],
  "drafts": []
}
```

---

# 42. AI Node Generation

Endpoint:

```http id="19-051"
POST /api/v1/ai/generate-node
```

---

Response:

```json id="19-052"
{
  "draft_branch": "",
  "pull_request": ""
}
```

---

# 43. AI Assessment Generation

Endpoint:

```http id="19-053"
POST /api/v1/ai/generate-test
```

---

# 44. AI Resource Generation

Endpoint:

```http id="19-054"
POST /api/v1/ai/generate-resources
```

---

# 45. AI Diagram Generation

Endpoint:

```http id="19-055"
POST /api/v1/ai/generate-diagram
```

---

# 46. Draft Service

Purpose:

```text id="19-056"
AI Generated Draft Management
```

---

# 47. Draft Endpoints

```http id="19-057"
GET  /api/v1/drafts

POST /api/v1/drafts/{id}/approve

POST /api/v1/drafts/{id}/reject
```

---

# 48. GitHub Service

Purpose:

```text id="19-058"
Repository Operations
```

---

# 49. GitHub Endpoints

```http id="19-059"
POST /api/v1/github/commit

POST /api/v1/github/pull-request

POST /api/v1/github/merge
```

---

# 50. Sync Service

Purpose:

```text id="19-060"
Repository Synchronization
```

---

# 51. Sync Endpoints

```http id="19-061"
POST /api/v1/sync

GET  /api/v1/sync/status
```

---

# 52. API Keys Service

Purpose:

```text id="19-062"
User AI Provider Keys
```

---

# 53. API Key Endpoints

```http id="19-063"
GET    /api/v1/settings/api-keys

POST   /api/v1/settings/api-keys

PUT    /api/v1/settings/api-keys/{id}

DELETE /api/v1/settings/api-keys/{id}
```

---

# 54. API Key Request

```json id="19-064"
{
  "provider": "gemini",
  "key": ""
}
```

---

# 55. Provider Configuration Endpoint

```http id="19-065"
GET /api/v1/settings/providers
```

---

Response:

```json id="19-066"
{
  "primary": "knowhub-ai",
  "fallbacks": []
}
```

---

# 56. Health Check Endpoint

```http id="19-067"
GET /api/v1/health
```

---

Response:

```json id="19-068"
{
  "status": "healthy"
}
```

---

# 57. Rate Limiting

Default:

```text id="19-069"
100 Requests Per Minute
```

per authenticated user.

---

# 58. Error Codes

Examples:

```text id="19-070"
UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_ERROR

SYNC_FAILED

AI_PROVIDER_ERROR
```

---

# 59. Validation Rules

All requests must:

```text id="19-071"
Validate Schema

Validate Authentication

Validate Ownership
```

---

# 60. Ownership Enforcement

Users may access only:

```text id="19-072"
Their Repository

Their Progress

Their Notes

Their Settings
```

---

# 61. Logging Rules

Log:

```text id="19-073"
Errors

Warnings

System Events
```

---

Never log:

```text id="19-074"
Tokens

Secrets

API Keys

Sensitive Data
```

---

# 62. API Documentation Standard

Documentation format:

```text id="19-075"
OpenAPI 3.1
```

---

Generated automatically.

---

# 63. Future API Expansion

Potential additions:

```text id="19-076"
Collaboration APIs

Community APIs

Mentorship APIs

Voice APIs
```

Not MVP.

---

# 64. Performance Targets

```text id="19-077"
Search < 500ms

AI Request Start < 5s

Sync < 5s

CRUD Operations < 300ms
```

---

# 65. API Success Criteria

The API Layer is successful when:

* Frontend and backend remain decoupled
* All operations are typed and versioned
* Authentication is consistently enforced
* Repository ownership is protected
* AI functionality is accessible through contracts
* GitHub integration remains reliable
* API behavior is predictable
* Future expansion remains straightforward

END OF DOCUMENT
