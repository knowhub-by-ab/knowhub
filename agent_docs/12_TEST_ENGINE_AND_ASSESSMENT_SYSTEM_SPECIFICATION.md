# 12_TEST_ENGINE_AND_ASSESSMENT_SYSTEM_SPECIFICATION.md

# KnowHub

## Test Engine & Assessment System Specification

Version: 1.0

Status: Approved Baseline

Depends On:

```text
01_PRD.md

02_SYSTEM_ARCHITECTURE.md

03_DATABASE_SCHEMA.md

05_UI_UX_SPECIFICATION.md

06_AI_SYSTEM_SPECIFICATION.md

07_TREE_GRAPH_ENGINE_SPECIFICATION.md

08_SEARCH_ENGINE_SPECIFICATION.md

11_CONTENT_GENERATION_AND_KNOWLEDGE_ENGINE_SPECIFICATION.md
```

---

# 1. Purpose

This document defines:

* Assessment Architecture
* Test Engine
* Question Generation
* Scoring System
* Knowledge Validation
* Weakness Detection
* Learning Recommendations
* Readiness Measurement

The Assessment System ensures that learning is verified rather than merely consumed.

---

# 2. Core Philosophy

Learning is not considered complete because content was read.

Learning is considered complete only when understanding is demonstrated.

```text
Learn
↓
Practice
↓
Assess
↓
Identify Gaps
↓
Improve
↓
Reassess
```

---

# 3. Assessment Objectives

The system must:

```text
Validate Understanding

Measure Retention

Detect Weaknesses

Identify Knowledge Gaps

Recommend Learning

Support Career Readiness

Track Progress
```

---

# 4. Question Format Policy

Per user requirement:

```text
ALL ASSESSMENTS MUST USE MCQ FORMAT
```

Only.

---

# 5. Supported Question Types

Supported:

```text
Single Correct MCQ

Multiple Correct MCQ
```

---

Not Supported:

```text
Essay

Short Answer

Long Answer

Coding Challenges

Fill In The Blank

Matching

True False
```

---

# 6. Why MCQ Only

Benefits:

```text
Simple

Mobile Friendly

Easy Evaluation

AI Generation Friendly

Consistent Experience
```

---

# 7. Assessment Levels

Assessments may target:

```text
Knowledge Recall

Conceptual Understanding

Application

Scenario Analysis

Industry Thinking
```

while still using MCQs.

---

# 8. Test Categories

Supported:

```text
Node Test

Topic Test

Module Test

Domain Test

Roadmap Test

Readiness Test
```

---

# 9. Node Test

Purpose:

Assess a single node.

Example:

```text
Git Basics
```

---

Questions cover:

```text
Node Content Only
```

---

# 10. Topic Test

Purpose:

Assess multiple related nodes.

Example:

```text
Git

GitHub

Branching
```

---

# 11. Module Test

Purpose:

Assess an entire learning module.

Example:

```text
Python Fundamentals
```

---

# 12. Domain Test

Purpose:

Assess an entire domain.

Example:

```text
Cloud Computing
```

---

# 13. Roadmap Test

Purpose:

Measure progress toward a role.

Example:

```text
AI Engineer

Cloud Engineer

Program Manager
```

---

# 14. Readiness Test

Purpose:

Estimate role readiness.

Example:

```text
Product Manager Readiness

AI Engineer Readiness

FDE Readiness
```

---

# 15. Assessment Generation Workflow

```text
Selected Topic
↓
Context Collection
↓
AI Generation
↓
Validation
↓
Draft
↓
Approval
↓
Repository Storage
```

---

# 16. Question Structure

Every question contains:

```json
{
  "id": "",
  "question": "",
  "options": [],
  "correct_answers": [],
  "explanation": ""
}
```

---

# 17. Answer Explanations

Every question must include:

```text
Correct Explanation

Why Others Are Wrong

Reference Topic
```

---

# 18. Question Difficulty

Internal classification:

```text
Easy

Medium

Hard

Professional
```

---

# 19. Easy Questions

Focus:

```text
Terminology

Definitions

Basic Concepts
```

---

# 20. Medium Questions

Focus:

```text
Understanding

Concept Connections

Use Cases
```

---

# 21. Hard Questions

Focus:

```text
Problem Solving

Tradeoffs

Application
```

---

# 22. Professional Questions

Focus:

```text
Industry Scenarios

Decision Making

Architecture Thinking

Best Practices
```

---

# 23. Assessment Coverage Rules

Questions should cover:

```text
Definitions

Concepts

Relationships

Applications

Common Mistakes
```

---

# 24. Minimum Question Counts

Suggested defaults:

```text
Node Test = 10

Topic Test = 20

Module Test = 30

Domain Test = 50

Roadmap Test = 100
```

Configurable.

---

# 25. Assessment Metadata

Example:

```yaml
id: git-basics-test

title: Git Basics Assessment

difficulty: beginner

question_count: 10

related_node: git-basics
```

---

# 26. Scoring Engine

Scoring based on:

```text
Correct Answers

Incorrect Answers

Skipped Answers
```

---

# 27. Score Calculation

Formula:

```text
Score %

=
Correct Answers
÷
Total Questions
× 100
```

---

# 28. Pass Threshold

Default:

```text
70%
```

Configurable.

---

# 29. Score Categories

```text
90-100 = Excellent

80-89 = Strong

70-79 = Good

50-69 = Needs Improvement

Below 50 = Weak
```

---

# 30. Assessment Results

Displays:

```text
Score

Correct Count

Incorrect Count

Time Taken

Recommendations
```

---

# 31. Weak Area Detection

Purpose:

Identify concepts needing review.

---

Example:

```text
Git Branching Questions Failed
```

---

Recommendation:

```text
Review Git Branching Node
```

---

# 32. Knowledge Gap Analysis

Inputs:

```text
Assessment Results

Learning History

Progress
```

---

Outputs:

```text
Weak Areas

Missing Dependencies

Suggested Learning
```

---

# 33. Learning Recommendations

Generated after assessment.

Examples:

```text
Review Node

Retake Test

Study Dependency

Continue Learning
```

---

# 34. Adaptive Recommendations

Example:

User fails:

```text
Docker Networking
```

---

System may recommend:

```text
Docker Networking

Linux Networking

TCP/IP Basics
```

---

# 35. Readiness Scoring

Roadmap readiness incorporates:

```text
Node Completion

Assessment Scores

Dependency Completion
```

---

# 36. Readiness Formula

Example:

```text
40% Learning Progress

40% Assessment Results

20% Dependency Coverage
```

---

Configurable.

---

# 37. Assessment History

Track:

```text
Attempts

Scores

Dates

Improvements
```

---

# 38. Retest Policy

Users may:

```text
Retake Anytime
```

No restrictions.

---

# 39. Question Pool System

Each assessment may maintain:

```text
Large Question Pool
```

---

Test generation selects subsets.

---

# 40. AI Question Generation Rules

Questions must:

```text
Be Accurate

Avoid Ambiguity

Avoid Trivial Tricks

Align To Content
```

---

# 41. Hallucination Prevention

AI must generate questions using:

```text
Existing Repository Content
```

first.

---

# 42. Assessment Repository Structure

Stored in:

```text
tests/
```

---

Example:

```text
tests/

├── git/
├── python/
├── cloud/
└── ai-engineering/
```

---

# 43. AI Assessment Drafts

Generated tests enter:

```text
Draft Workspace
```

first.

---

Never directly committed.

---

# 44. Approval Workflow

```text
Generate Test
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

# 45. Dashboard Integration

Dashboard displays:

```text
Average Scores

Recent Tests

Weak Areas

Readiness Trends
```

---

# 46. Analytics

Track:

```text
Tests Taken

Pass Rate

Average Score

Most Missed Topics
```

---

# 47. Future Features

Potential additions:

```text
Mock Interviews

Coding Challenges

Live Assessments

Peer Assessments

Certification Tracks
```

Not MVP.

---

# 48. Performance Targets

Assessment load:

```text
< 1 Second
```

---

Result generation:

```text
< 3 Seconds
```

---

# 49. Assessment KPIs

Track:

```text
Completion Rate

Pass Rate

Knowledge Growth

Readiness Growth
```

---

# 50. Test Engine Success Criteria

The Assessment System is successful when:

* Learning is measurable
* Weaknesses are identified
* Recommendations are useful
* Assessments remain beginner-friendly
* Professional readiness can be estimated
* AI-generated questions remain accurate
* Progress is visible
* Knowledge retention improves over time

END OF DOCUMENT
