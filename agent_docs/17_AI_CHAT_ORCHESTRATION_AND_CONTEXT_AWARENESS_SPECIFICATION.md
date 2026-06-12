# 17_AI_CHAT_ORCHESTRATION_AND_CONTEXT_AWARENESS_SPECIFICATION.md

# KnowHub

## AI Chat Orchestration & Context Awareness Specification

Version: 1.0

Status: Approved Baseline

Depends On:

```text id="17-001"
01_PRD.md

02_SYSTEM_ARCHITECTURE.md

03_DATABASE_SCHEMA.md

04_GITHUB_REPOSITORY_STRUCTURE.md

05_UI_UX_SPECIFICATION.md

06_AI_SYSTEM_SPECIFICATION.md

07_TREE_GRAPH_ENGINE_SPECIFICATION.md

08_SEARCH_ENGINE_SPECIFICATION.md

11_CONTENT_GENERATION_AND_KNOWLEDGE_ENGINE_SPECIFICATION.md

12_TEST_ENGINE_AND_ASSESSMENT_SYSTEM_SPECIFICATION.md

14_NOTES_WORKSPACE_AND_PERSONAL_KNOWLEDGE_MANAGEMENT_SPECIFICATION.md

15_RESOURCE_DISCOVERY_AND_CURATION_ENGINE_SPECIFICATION.md

16_DASHBOARD_WORKSPACE_AND_NAVIGATION_SPECIFICATION.md
```

---

# 1. Purpose

This document defines:

* AI Chat System
* Context Assembly
* Repository Awareness
* Node Awareness
* Knowledge Reuse
* Content Generation Workflow
* AI Decision Framework
* Multi-Provider Routing
* FreeLLMAPI Integration
* User Question Resolution

This system is the intelligence layer powering KnowHub.

---

# 2. Core Philosophy

The AI must behave like:

```text id="17-002"
Teacher

Mentor

Knowledge Architect

Repository Librarian

Learning Guide

Content Creator
```

---

Not merely:

```text id="17-003"
Question Answering Bot
```

---

# 3. Primary AI Objectives

The AI must:

```text id="17-004"
Answer Questions

Reuse Existing Knowledge

Prevent Duplication

Recommend Learning

Generate Content

Expand Trees

Generate Assessments

Generate Resources

Guide Progress
```

---

# 4. AI First Principle

Before generating anything new:

AI must check:

```text id="17-005"
Repository
↓
Knowledge Pages
↓
Existing Notes
↓
Resources
↓
Assessments
```

---

Only then generate new content.

---

# 5. AI Workspace Overview

Primary interface:

```text id="17-006"
Chat Window
```

---

Users interact naturally:

```text id="17-007"
What is Docker?

Explain Kubernetes.

Create a roadmap for AI Engineering.

Generate child nodes.

Why did I fail this test?
```

---

# 6. AI Processing Pipeline

```text id="17-008"
User Prompt
        ↓
Intent Detection
        ↓
Context Assembly
        ↓
Repository Search
        ↓
Knowledge Analysis
        ↓
Decision Engine
        ↓
Response Generation
        ↓
Optional Draft Creation
```

---

# 7. Intent Detection

Supported intents:

```text id="17-009"
Question

Generate Content

Generate Node

Generate Assessment

Generate Resources

Explain Topic

Search Knowledge

Progress Analysis

Repository Action
```

---

# 8. Context Assembly Engine

Purpose:

Collect all relevant context.

---

Sources:

```text id="17-010"
Learning Tree

Current Node

Notes

Resources

Tests

Progress

Conversation History
```

---

# 9. Repository Awareness

The AI must always know:

```text id="17-011"
Existing Nodes

Existing Pages

Existing Notes

Existing Tests

Existing Resources
```

---

# 10. Repository Search Workflow

Before responding:

```text id="17-012"
Search Repository
↓
Find Relevant Content
↓
Determine Coverage
↓
Respond
```

---

# 11. Existing Knowledge Detection

Example:

User asks:

```text id="17-013"
What is Git?
```

---

AI checks:

```text id="17-014"
Git Node Exists?
```

---

If yes:

```text id="17-015"
Use Existing Knowledge
```

---

# 12. Knowledge Reuse Priority

Priority order:

```text id="17-016"
Repository Content

User Notes

Resources

AI Generated Content
```

---

# 13. Missing Knowledge Workflow

If topic does not exist:

```text id="17-017"
Answer User
↓
Recommend New Node
↓
Generate Draft
```

---

# 14. User Approval Requirement

AI must never automatically add:

```text id="17-018"
Nodes

Pages

Tests

Resources
```

---

without approval.

---

# 15. Node Recommendation Workflow

Example:

User asks:

```text id="17-019"
Explain Docker Volumes
```

---

If missing:

AI suggests:

```text id="17-020"
Create Docker Volumes Node?
```

---

# 16. Content Generation Modes

Supported:

```text id="17-021"
Answer Only

Draft Content

Draft Node

Draft Assessment

Draft Resource Pack
```

---

# 17. Beginner-To-Professional Explanation Rule

Per approved product requirement:

Every explanation must cover:

```text id="17-022"
Beginner Understanding
↓
Core Concepts
↓
Practical Usage
↓
Industry Usage
↓
Professional Perspective
```

---

Always.

---

# 18. Explanation Structure

Default AI explanations contain:

```text id="17-023"
Overview

Concepts

Examples

Industry Usage

Common Mistakes

Next Topics
```

---

# 19. AI Memory Scope

Per user repository only.

---

Never access:

```text id="17-024"
Other Users

Other Repositories
```

---

# 20. Context Window Strategy

Context priority:

```text id="17-025"
Current Conversation

Current Node

Relevant Nodes

Relevant Notes

Recent Activity
```

---

# 21. AI Learning Recommendations

Generated using:

```text id="17-026"
Progress

Tests

Roadmap

Dependencies
```

---

# 22. Learning Recommendation Types

Examples:

```text id="17-027"
Learn Next

Review Again

Take Assessment

Create Node

Study Resource
```

---

# 23. Assessment-Aware AI

AI can analyze:

```text id="17-028"
Failed Questions

Weak Areas

Test Trends
```

---

# 24. Example Assessment Query

User:

```text id="17-029"
Why did I score only 55%?
```

---

AI analyzes:

```text id="17-030"
Incorrect Questions

Weak Concepts

Dependencies
```

---

and provides guidance.

---

# 25. Progress-Aware AI

AI understands:

```text id="17-031"
Completed Topics

Current Topics

Pending Topics
```

---

# 26. Example Progress Query

User:

```text id="17-032"
What should I learn next?
```

---

AI responds using:

```text id="17-033"
Roadmap

Progress

Assessments
```

---

# 27. Resource-Aware AI

AI may recommend:

```text id="17-034"
Courses

Documentation

Videos

Labs
```

---

based on topic and goals.

---

# 28. Notes-Aware AI

AI may search:

```text id="17-035"
My Notes
```

---

before answering.

---

# 29. Notes Reuse Example

User asks:

```text id="17-036"
Explain vector databases.
```

---

AI finds:

```text id="17-037"
Existing Note Available
```

and references it.

---

# 30. AI Node Expansion

AI may generate:

```text id="17-038"
Child Nodes

Sibling Nodes

Dependencies
```

---

as recommendations.

---

# 31. Tree Expansion Suggestions

Example:

```text id="17-039"
Python
```

AI suggests:

```text id="17-040"
Variables

Functions

Classes

Modules

Decorators
```

---

# 32. AI Assessment Generation

Workflow:

```text id="17-041"
Node
↓
Content Analysis
↓
Question Generation
↓
Validation
↓
Draft
```

---

# 33. AI Resource Generation

Workflow:

```text id="17-042"
Topic
↓
Resource Search
↓
Validation
↓
Curated Resource Pack
```

---

# 34. AI Diagram Generation

Supported:

```text id="17-043"
Mermaid

Flowcharts

Mind Maps

Architecture Diagrams
```

---

# 35. Diagram Draft Workflow

```text id="17-044"
Generate
↓
Preview
↓
Approve
↓
Commit
```

---

# 36. AI Content Drafting

Generated content enters:

```text id="17-045"
Draft Workspace
```

---

Never directly enters production.

---

# 37. Draft Types

Supported:

```text id="17-046"
Node Draft

Page Draft

Assessment Draft

Resource Draft

Diagram Draft
```

---

# 38. PR Mode Integration

AI changes follow:

```text id="17-047"
Draft Branch
↓
Pull Request
↓
User Review
↓
Merge
```

---

# 39. AI Safety Rules

AI must avoid:

```text id="17-048"
Duplicate Nodes

Broken References

Invalid Dependencies

Unapproved Modifications
```

---

# 40. Hallucination Prevention

AI should prioritize:

```text id="17-049"
Repository Content

User Notes

Validated Resources
```

before external generation.

---

# 41. Multi-Provider Architecture

AI provider layer supports:

```text id="17-050"
FreeLLMAPI

OpenRouter

Gemini

OpenAI

Anthropic

Local Models
```

---

# 42. Provider Routing

Routing based on:

```text id="17-051"
Availability

Cost

Rate Limits

Task Type
```

---

# 43. FreeLLMAPI Priority

Default provider:

```text id="17-052"
FreeLLMAPI
```

---

Per product requirement.

---

# 44. User API Key Support

Users may configure:

```text id="17-053"
OpenAI

Gemini

Anthropic

OpenRouter

Other Compatible Providers
```

---

# 45. Provider Fallback Chain

Example:

```text id="17-054"
FreeLLMAPI
↓
Gemini
↓
OpenRouter
↓
OpenAI
```

---

Configurable.

---

# 46. AI Conversation History

Store:

```text id="17-055"
Questions

Responses

Generated Drafts

Actions Taken
```

---

# 47. AI Workspace Search

Users may search:

```text id="17-056"
Previous Conversations
```

---

# 48. Future AI Features

Potential additions:

```text id="17-057"
Voice Tutor

Multi-Agent Collaboration

Interactive Simulations

Project Mentor

Interview Coach
```

Not MVP.

---

# 49. Performance Targets

Targets:

```text id="17-058"
Context Assembly < 2 Seconds

Repository Search < 1 Second

Response Start < 5 Seconds
```

---

# 50. AI Chat Success Criteria

The AI System is successful when:

* It understands repository context
* It avoids duplicate knowledge
* It reuses existing information
* It teaches from beginner to professional level
* It recommends useful next steps
* It generates high-quality drafts
* It respects approval workflows
* It remains affordable through FreeLLMAPI-first routing

END OF DOCUMENT
