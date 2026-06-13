# 05_UI_UX_SPECIFICATION.md

# KnowHub

## UI / UX Specification

Version: 1.0

Status: Approved Baseline

Depends On:

```text id="6b5j0z"
01_PRD.md

02_SYSTEM_ARCHITECTURE.md

03_DATABASE_SCHEMA.md

04_GITHUB_REPOSITORY_STRUCTURE.md
```

---

# 1. Purpose

This document defines:

* UI Architecture
* UX Flows
* Layout System
* Navigation
* Screen Definitions
* Component Library
* Design Standards
* Responsive Behavior

for KnowHub.

---

# 2. UX Philosophy

KnowHub should feel like a hybrid of:

```text id="zwqz9l"
Confluence

Notion

GitHub

Obsidian

VS Code Explorer
```

while remaining beginner-friendly.

---

# 3. Core UX Principles

## 3.1 Knowledge First

Content is the primary focus.

UI must never distract from learning.

---

## 3.2 Tree-Centric Navigation

Users should always understand:

```text id="lqzjlwm"
Where Am I?

What Am I Learning?

What Comes Next?
```

---

## 3.3 AI As Assistant

AI should be available everywhere.

Never intrusive.

---

## 3.4 Mobile First

Every screen must support:

```text id="z8wh0t"
Desktop

Tablet

Mobile

Android APK
```

---

## 3.5 Responsive By Default

No separate mobile application UI.

Single responsive design system.

---

# 4. Design Language

## Style

```text id="67kz2g"
Modern

Clean

Professional

Minimal

Content-Focused
```

---

## Inspirations

```text id="m3dxpw"
Confluence

GitHub

Linear

Notion

Vercel
```

---

# 5. Color System

Use CSS variables.

---

## Light Theme

```text id="1k34qo"
Background

Surface

Primary

Secondary

Muted

Success

Warning

Danger
```

---

## Dark Theme

Matching equivalents.

---

## Theme Modes

```text id="6uvz2l"
Light

Dark

System
```

---

# 6. Typography

Primary:

```text id="h4otcf"
Inter
```

Fallback:

```text id="jlwmqv"
System Fonts
```

---

## Hierarchy

```text id="g3w2ur"
H1

H2

H3

H4

Body

Caption
```

---

# 7. Application Layout

Desktop Layout:

```text id="m9ghsp"
┌──────────────────────────────┐
│ Header                       │
├───────┬──────────────────────┤
│ Tree  │ Content              │
│ Panel │ Area                 │
│       │                      │
├───────┴──────────────────────┤
│ Status / Footer              │
└──────────────────────────────┘
```

---

# 8. Main Navigation

Primary Navigation:

```text id="8ehmbo"
Dashboard

Learning Tree

Knowledge Graph

Search

Roadmaps

Tests

Notes

Resources

AI Chat

Settings
```

---

# 9. Header

Contains:

```text id="7jzwj6"
Logo

Search Bar

AI Button

Notifications

User Profile
```

---

# 10. Sidebar

Contains:

```text id="b8u88e"
Learning Tree

Expand

Collapse

Filters

Bookmarks
```

---

# 11. Content Area

Displays:

```text id="fzyix9"
Learning Pages

Tests

Roadmaps

Notes

Resources
```

---

# 12. Dashboard

Purpose:

Landing page after login.

---

Widgets:

```text id="9v48d0"
Progress Overview

Recent Activity

Recommended Learning

Upcoming Reviews

Recent Notes

AI Suggestions

Roadmap Progress
```

---

# 13. Dashboard Layout

```text id="s3crna"
┌──────────────────────┐
│ Progress Cards       │
├──────────────────────┤
│ AI Recommendations   │
├──────────────────────┤
│ Recent Activity      │
├──────────────────────┤
│ Roadmap Progress     │
└──────────────────────┘
```

---

# 14. Learning Tree Screen

Purpose:

Primary learning navigation.

---

Features:

```text id="zhqv3f"
Expand

Collapse

Search

Filter

Progress Indicators
```

---

# 15. Tree Node States

```text id="72m2u4"
Pending

In Progress

Completed
```

---

Visual Indicators:

```text id="ejjlwm"
Gray

Blue

Green
```

---

# 16. Tree Node Actions

```text id="vfjlwm"
Open

Expand

Collapse

Mark Complete

Generate Content

Generate Test
```

---

# 17. Knowledge Graph Screen

Purpose:

Visual relationship explorer.

---

Features:

```text id="7nns6e"
Zoom

Pan

Node Focus

Relationship Filter

Dependency Filter
```

---

# 18. Learning Page Screen

Layout:

```text id="ht1c3s"
Title

Metadata

Content

Resources

Tests

Related Nodes
```

---

# 19. Learning Page Structure

```text id="jllmvy"
Overview

Beginner Explanation

Core Concepts

Deep Dive

Industry Perspective

Examples

Best Practices

Interview View

Resources
```

---

# 20. Markdown Rendering

Support:

```text id="srksxl"
Markdown

Code Blocks

Tables

Mermaid

Images

Callouts
```

---

# 21. Diagram Rendering

Primary:

```text id="hj7i8v"
Mermaid
```

Supported:

```text id="13b8zb"
Flowcharts

Mindmaps

Architecture

Sequence Diagrams
```

---

# 22. Search Screen

Search Types:

```text id="i5d4az"
Keyword

Semantic
```

---

Search Scope:

```text id="hklkwm"
Nodes

Pages

Resources

Notes

Tests

Roadmaps
```

---

# 23. Search Results Layout

```text id="j5ps3n"
Title

Type

Path

Preview

Open Button
```

---

# 24. Roadmap Screen

Purpose:

Career planning.

---

Layout:

```text id="o7ydjlwm"
Goal

Progress

Milestones

Readiness

Recommendations
```

---

# 25. Readiness Meter

Displays:

```text id="5v0d8n"
Required Skills

Completed Skills

Missing Skills

Readiness %
```

---

# 26. Test Screen

Question Types:

```text id="k7af8f"
Single Choice MCQ

Multiple Choice MCQ
```

Only.

---

# 27. Test Flow

```text id="cb3h9z"
Start

Answer

Submit

Score

Recommendations
```

---

# 28. Results Screen

Displays:

```text id="g1mjlwm"
Score

Correct Answers

Wrong Answers

Recommendations
```

---

# 29. Notes Screen

Global notebook.

---

Sections:

```text id="4g9jlwm"
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

# 30. Resource Library Screen

Displays:

```text id="jlwmo4"
Articles

Videos

Books

Courses

Documentation
```

---

Filters:

```text id="wr6l6u"
Free

Paid

Official

Community
```

---

# 31. AI Chat Screen

Purpose:

Learning assistant.

---

Capabilities:

```text id="8w1vym"
Ask Questions

Generate Nodes

Generate Pages

Explain Concepts

Generate Tests

Recommend Learning
```

---

# 32. AI Chat Layout

```text id="qohzjlwm"
Chat Window

Context Panel

Suggestion Panel
```

---

# 33. Draft Workspace Screen

Displays:

```text id="nxjlwm"
Pending AI Changes
```

---

Types:

```text id="mjlwm5"
New Node

Update Node

New Test

Diagram

Tree Change
```

---

# 34. Draft Review Screen

Actions:

```text id="k4jlwm"
Approve

Reject

Edit Before Approve
```

---

# 35. Approval Queue

Displays:

```text id="j0rjlwm"
Pending Drafts

Review Status

History
```

---

# 36. Analytics Screen

Displays:

```text id="jlwmu7"
Learning Activity

Progress Trends

Tests

AI Usage

Repository Growth
```

---

# 37. AI Provider Screen

Displays:

```text id="jlwm2s"
Provider

Status

Priority

Usage
```

---

# 38. Provider Configuration

Supports:

```text id="jlwm4n"
the KnowHub AI gateway

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

# 39. API Key Management Screen

Purpose:

User-controlled provider configuration.

---

Fields:

```text id="jlwmn8"
Provider

API Key

Base URL

Model

Priority
```

---

Requirements:

```text id="jlwmh6"
Mask API Keys

Reveal Toggle

Test Connection
```

---

# 40. Repository Screen

Displays:

```text id="jlwml3"
Connected Repository

Branch

Repository Health

Last Sync
```

---

Actions:

```text id="jlwmm9"
Sync

Reconnect

Change Repository
```

---

# 41. Notification Center

Displays:

```text id="jlwmd7"
AI Suggestions

Approvals Needed

Sync Results

Updates
```

---

# 42. User Profile Screen

Displays:

```text id="jlwmy8"
Profile

Preferences

Theme

Language

Account
```

---

# 43. Empty States

Every empty screen must contain:

```text id="jlwmx4"
Explanation

Action Button

Helpful Example
```

---

# 44. Error States

Must include:

```text id="jlwmw5"
Error Description

Recovery Guidance

Retry Option
```

---

# 45. Loading States

Use:

```text id="jlwmg9"
Skeletons

Progress Indicators
```

Avoid spinner-only interfaces.

---

# 46. Mobile Layout

Sidebar becomes:

```text id="jlwmr2"
Drawer Navigation
```

---

Tree:

```text id="jlwmk1"
Full Screen
```

when opened.

---

# 47. Android App Requirements

Must feel:

```text id="jlwmz0"
Native

Responsive

Touch Optimized
```

---

# 48. Accessibility Requirements

Support:

```text id="jlwmq1"
Keyboard Navigation

Screen Readers

ARIA Labels

High Contrast
```

---

# 49. Performance Requirements

UI targets:

```text id="jlwmt2"
Page Load < 3s

Navigation < 500ms

Search < 500ms
```

---

# 50. Component Library

Standard Components:

```text id="jlwmv3"
Button

Input

Modal

Drawer

Dropdown

Tree Node

Card

Tabs

Toast

Badge

Tooltip

Dialog

Data Table
```

---

# 51. Design System Governance

All screens must:

```text id="jlwmf4"
Use Shared Components

Use Shared Typography

Use Shared Spacing

Use Shared Colors
```

No custom screen-level design systems.

---

# 52. UX Success Criteria

UI/UX is considered successful when:

* New users can navigate without training
* Learning tree is intuitive
* AI interactions are clear
* Mobile experience is first-class
* Content remains primary focus
* Search is discoverable
* Progress is visible
* Repository ownership is transparent

END OF DOCUMENT
