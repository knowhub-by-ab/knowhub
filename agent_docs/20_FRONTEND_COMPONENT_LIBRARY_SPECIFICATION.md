# 20_FRONTEND_COMPONENT_LIBRARY_SPECIFICATION.md

# KnowHub

## Frontend Component Library Specification

Version: 1.0

Status: Approved Baseline

Depends On:

```text
01_PRD.md

05_UI_UX_SPECIFICATION.md

07_TREE_GRAPH_ENGINE_SPECIFICATION.md

08_SEARCH_ENGINE_SPECIFICATION.md

12_TEST_ENGINE_AND_ASSESSMENT_SYSTEM_SPECIFICATION.md

13_PROGRESS_TRACKING_AND_ANALYTICS_SPECIFICATION.md

14_NOTES_WORKSPACE_AND_PERSONAL_KNOWLEDGE_MANAGEMENT_SPECIFICATION.md

16_DASHBOARD_WORKSPACE_AND_NAVIGATION_SPECIFICATION.md

17_AI_CHAT_ORCHESTRATION_AND_CONTEXT_AWARENESS_SPECIFICATION.md

19_API_AND_BACKEND_CONTRACT_SPECIFICATION.md
```

---

# 1. Purpose

This document defines:

* Frontend Component Standards
* UI Component Library
* Layout Components
* Shared Design Patterns
* State Management Standards
* Reusable UI Architecture

This document ensures UI consistency across the entire application.

---

# 2. Technology Stack

Frontend Framework:

```text
React
```

Language:

```text
TypeScript
```

UI System:

```text
ShadCN UI
```

Styling:

```text
TailwindCSS
```

Icons:

```text
Lucide React
```

Forms:

```text
React Hook Form
```

Validation:

```text
Zod
```

---

# 3. Design Principles

All components must be:

```text
Reusable

Responsive

Accessible

Composable

Type Safe
```

---

# 4. Component Classification

Components divided into:

```text
Core Components

Layout Components

Feature Components

Domain Components

Shared Components
```

---

# 5. Component Directory Structure

```text
src/

├── components/
│
├── layouts/
│
├── features/
│
├── shared/
│
├── pages/
│
└── ui/
```

---

# 6. Core UI Components

Provided by:

```text
ShadCN UI
```

---

# 7. Required Core Components

```text
Button

Input

Textarea

Dialog

Card

Badge

Tooltip

Tabs

Dropdown

Popover

Accordion

Select

Table

Toast
```

---

# 8. Layout Components

```text
AppLayout

DashboardLayout

WorkspaceLayout

MobileLayout
```

---

# 9. AppLayout

Purpose:

```text
Global Application Shell
```

Contains:

```text
Sidebar

Top Navigation

Main Content Area
```

---

# 10. Sidebar Component

Responsibilities:

```text
Navigation

Collapsible Menus

Mobile Adaptation
```

---

# 11. Top Navigation Component

Contains:

```text
Search

Notifications

User Menu

Profile

Settings
```

---

# 12. Dashboard Components

Required:

```text
WelcomeCard

ProgressCard

ReadinessCard

RecommendationsCard

RecentActivityCard

RepositoryStatusCard
```

---

# 13. WelcomeCard

Displays:

```text
User Name

Current Goal

Repository
```

---

# 14. ProgressCard

Displays:

```text
Completion %

Completed Nodes

Total Nodes
```

---

# 15. ReadinessCard

Displays:

```text
Role Readiness

Skill Readiness

Recommendations
```

---

# 16. Tree Components

Required:

```text
TreeView

TreeNode

TreeToolbar

TreeFilters

TreeActions
```

---

# 17. TreeView Component

Purpose:

```text
Learning Tree Rendering
```

Supports:

```text
Expand

Collapse

Search

Navigation
```

---

# 18. TreeNode Component

Displays:

```text
Title

Status

Progress

Child Count
```

---

# 19. Node Status Badge

States:

```text
Pending

In Progress

Completed
```

---

# 20. Tree Toolbar

Actions:

```text
Expand All

Collapse All

Generate Node

Refresh
```

---

# 21. Knowledge Graph Components

Required:

```text
KnowledgeGraph

GraphToolbar

GraphFilters
```

---

# 22. KnowledgeGraph

Purpose:

```text
Node Relationship Visualization
```

---

# 23. Graph Toolbar

Features:

```text
Zoom

Reset

Filters

Export
```

---

# 24. AI Workspace Components

Required:

```text
ChatWindow

MessageList

MessageBubble

PromptInput

AIActionPanel

ContextPanel
```

---

# 25. ChatWindow

Purpose:

```text
Primary AI Interaction
```

---

# 26. MessageBubble

Types:

```text
User

Assistant

System
```

---

# 27. PromptInput

Supports:

```text
Multiline Input

Attachments

Keyboard Shortcuts
```

---

# 28. ContextPanel

Displays:

```text
Related Nodes

Resources

Notes

Tests
```

---

# 29. Draft Components

Required:

```text
DraftViewer

DraftApprovalPanel

DraftComparisonView
```

---

# 30. DraftApprovalPanel

Actions:

```text
Approve

Reject

Edit
```

---

# 31. Assessment Components

Required:

```text
AssessmentCard

AssessmentViewer

QuestionCard

ResultSummary

RecommendationPanel
```

---

# 32. QuestionCard

Question Types:

```text
MCQ Single Answer
```

Only.

---

# 33. Assessment Viewer

Supports:

```text
Next Question

Previous Question

Submit
```

---

# 34. Assessment Results

Displays:

```text
Score

Correct Answers

Weak Areas

Recommendations
```

---

# 35. Resource Components

Required:

```text
ResourceCard

ResourceList

ResourceFilters

ResourceViewer

BookmarksPanel
```

---

# 36. ResourceCard

Displays:

```text
Title

Provider

Difficulty

Duration
```

---

# 37. Notes Components

Required:

```text
GlobalNotesEditor

NotesList

NotesSearch

NotesViewer
```

---

# 38. Notes Design Rule

Per approved requirement:

```text
Single Global Notes Space
```

---

Not node-specific.

---

# 39. Markdown Components

Required:

```text
MarkdownEditor

MarkdownPreview

SplitViewEditor
```

---

# 40. Markdown Editor Features

Supports:

```text
Live Preview

Auto Save

Syntax Highlighting

Mermaid Rendering
```

---

# 41. Search Components

Required:

```text
GlobalSearchBar

SearchResults

SearchFilters
```

---

# 42. GlobalSearchBar

Available from:

```text
Top Navigation

Ctrl + K
```

---

# 43. Search Results Component

Displays:

```text
Nodes

Pages

Resources

Notes

Tests
```

---

# 44. Settings Components

Required:

```text
ProfileSettings

RepositorySettings

ProviderSettings

APIKeySettings

AppearanceSettings
```

---

# 45. API Key Management Component

Features:

```text
Add Key

Edit Key

Delete Key

Prioritize Key

Test Key
```

---

# 46. FreeLLMAPI Settings Component

Displays:

```text
Status

Models

Usage

Fallback Chain
```

---

# 47. Repository Components

Required:

```text
RepositoryOverview

RepositoryStatus

SyncHistory

BranchViewer
```

---

# 48. Sync Status Component

Displays:

```text
Last Sync

Pending Changes

Current Branch

Sync Health
```

---

# 49. Notification Components

Required:

```text
NotificationCenter

NotificationItem
```

---

# 50. Notification Types

```text
Assessment

Sync

AI

Repository

System
```

---

# 51. Loading Components

Required:

```text
Spinner

SkeletonLoader

ProgressLoader
```

---

# 52. Empty State Components

Required:

```text
NoNodes

NoResults

NoResources

NoAssessments
```

---

# 53. Error Components

Required:

```text
ErrorBoundary

ErrorCard

RetryPanel
```

---

# 54. Mobile Components

Required:

```text
BottomNavigation

MobileSidebar

MobileSearch
```

---

# 55. Android Components

Android UI must:

```text
Reuse Web Components
```

via Capacitor.

---

# 56. Responsive Breakpoints

```text
Mobile

Tablet

Laptop

Desktop

Ultra Wide
```

---

# 57. Accessibility Standards

Required:

```text
Keyboard Navigation

Screen Reader Support

ARIA Labels

Focus Management
```

---

# 58. State Management

Recommended:

```text
Zustand
```

---

Responsibilities:

```text
User State

Tree State

Progress State

Settings State

Search State
```

---

# 59. Data Fetching

Recommended:

```text
TanStack Query
```

---

Responsibilities:

```text
Caching

Refetching

Optimistic Updates
```

---

# 60. Component Documentation

Every reusable component must include:

```text
Purpose

Props

Usage Example

Accessibility Notes
```

---

# 61. Component Naming Convention

Format:

```text
PascalCase
```

Examples:

```text
ProgressCard

TreeNode

AssessmentViewer
```

---

# 62. Future Components

Potential additions:

```text
Voice Tutor

Live Collaboration

Mentor Workspace

Community Hub
```

Not MVP.

---

# 63. Performance Targets

```text
Initial Load < 2s

Component Render < 100ms

Search Open < 100ms

Tree Navigation < 200ms
```

---

# 64. UI Consistency Rules

All pages must:

```text
Use Shared Components

Use Shared Typography

Use Shared Colors

Use Shared Layout Patterns
```

---

# 65. Frontend Component Library Success Criteria

The Component Library is successful when:

* UI remains consistent across the platform
* Components are reusable
* Mobile experience matches desktop quality
* Accessibility standards are met
* New features can be added rapidly
* Maintenance complexity remains low
* Android and Web share the same UI foundation
* Developers avoid duplicate implementations

END OF DOCUMENT
