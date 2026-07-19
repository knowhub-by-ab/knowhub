import { BookOpen, Copy, Check } from "lucide-react";
import { useState } from "react";

const GUIDE_SECTIONS = [
  {
    title: "Quick Start",
    content: `The simplest possible presentation markdown:

\`\`\`markdown
# My Presentation Title

## Introduction
### First Slide
- Key point one
- Key point two
- Key point three

### Second Slide
- Another point
- More content
\`\`\`

That's it. KnowHub's AI will turn this into a polished presentation.`,
  },
  {
    title: "Frontmatter (YAML Settings)",
    content: `Add a YAML block at the very top of your file to control how the presentation is generated:

\`\`\`yaml
---
theme: aurora-dark
accent-color: "#6366f1"
font: Inter
slide-count: 12
audience-level: intermediate
language: en
narration-tone: conversational
image-style: illustration
---
\`\`\`

**Available themes:** \`aurora-dark\` · \`corporate-blue\` · \`edu-warm\` · \`minimal-white\` · \`tech-green\` · \`sunset-orange\` · \`ocean-teal\` · \`slate-pro\`

**Audience levels:** \`beginner\` · \`intermediate\` · \`expert\`

**Narration tones:** \`formal\` · \`conversational\` · \`enthusiastic\`

**Image styles:** \`illustration\` · \`photorealistic\` · \`minimal\` · \`flat-icon\` · \`none\`

**Language:** Any ISO 639-1 code — \`en\`, \`es\`, \`fr\`, \`de\`, \`hi\`, \`zh\`, \`ar\`, \`ja\`, \`ko\`, etc.`,
  },
  {
    title: "Heading Levels → Slide Types",
    content: `| Heading | Slide Type | Description |
|---|---|---|
| \`#\` | Title slide | One per deck — the opening slide |
| \`##\` | Section divider | Full-colour chapter break |
| \`###\` | Content slide | Regular bullet slide |

Example:
\`\`\`markdown
# Machine Learning Fundamentals

## Part 1: Supervised Learning

### What is Supervised Learning?
- Training data with labels
- Model learns from examples
- Makes predictions on new data

### Common Algorithms
- Linear Regression
- Decision Trees
- Neural Networks

## Part 2: Unsupervised Learning

### Clustering Methods
- K-means clustering
- Hierarchical clustering
\`\`\``,
  },
  {
    title: "Speaker Notes",
    content: `Use blockquotes (\`>\`) for speaker notes. These appear in the presenter view and handout PDF, but NOT on the slide itself.

\`\`\`markdown
### Neural Networks
- Inspired by biological brains
- Layers of interconnected nodes
- Learns through backpropagation

> Speaker note: Mention that modern neural networks have billions of parameters.
> Reference the 2017 Attention is All You Need paper when discussing transformers.
\`\`\``,
  },
  {
    title: "Custom Narration Script",
    content: `Override the AI-generated narration with your own spoken script using an HTML comment:

\`\`\`markdown
### Gradient Descent
- Optimisation algorithm
- Moves toward minimum loss
- Learning rate controls step size

<!-- narration: Gradient descent is the engine behind training neural networks.
Think of it like rolling a ball down a hill — it always moves toward the lowest point.
The learning rate determines how big each step is. -->
\`\`\`

The narration comment is stripped from the slide — it only goes into the audio track.`,
  },
  {
    title: "Images",
    content: `**Option 1 — AI-generated image prompt (Pollinations AI):**
\`\`\`markdown
### System Architecture
- Frontend React app
- REST API backend
- PostgreSQL database

<!-- image-prompt: Modern tech architecture diagram with three layers, minimalist flat style -->
\`\`\`

**Option 2 — Local image file:**
\`\`\`markdown
### Architecture Overview
![slide-image](./diagrams/architecture.png)
\`\`\`
Use the tag \`![slide-image]\` to mark which image belongs to this slide.

**Option 3 — Assign in the editor:**
After generation, drag-drop an image onto any slide card in the editor, or use the Image panel.

**Image layout options:**
- \`full-background\` — image fills slide, text overlaid
- \`right-half\` — content left 60%, image right 40%
- \`top-banner\` — narrow image strip at top
- \`inline-below-title\` — image between title and bullets
- \`bottom-strip\` — image at bottom`,
  },
  {
    title: "Code Slides",
    content: `Fenced code blocks become formatted code panels on the slide:

\`\`\`markdown
### Python Example
Here's a simple neural network layer:

\\\`\\\`\\\`python
import torch.nn as nn

class Layer(nn.Module):
    def __init__(self, in_dim, out_dim):
        super().__init__()
        self.linear = nn.Linear(in_dim, out_dim)
        self.relu = nn.ReLU()

    def forward(self, x):
        return self.relu(self.linear(x))
\\\`\\\`\\\`
\`\`\``,
  },
  {
    title: "Force a New Slide",
    content: `Use a horizontal rule (\`---\`) to force a slide break at any point, regardless of heading structure:

\`\`\`markdown
### Long Content Slide
- Point one
- Point two

---

This content starts a new slide automatically.
\`\`\``,
  },
  {
    title: "Quiz Slides",
    content: `Mark a slide to pull a question from your Question Bank:

\`\`\`markdown
### Check Your Understanding
<!-- quiz: true -->
\`\`\`

KnowHub will find a question from the Question Bank that matches this slide's topic and insert it as a quiz slide. The question must already exist in your Question Bank module.`,
  },
  {
    title: "Full Example",
    content: `\`\`\`markdown
---
theme: aurora-dark
audience-level: beginner
slide-count: 8
narration-tone: enthusiastic
image-style: illustration
---

# Introduction to Machine Learning
A beginner-friendly overview

## Core Concepts

### What is Machine Learning?
- Computers learn from data
- No explicit programming needed
- Improves with experience

> Speaker note: Start with the classic example of spam detection.

<!-- narration: Machine learning is one of the most exciting fields in technology today.
Instead of writing rules by hand, we let computers discover patterns from data. -->

<!-- image-prompt: Robot brain learning from data points, colorful illustration -->

### Types of Machine Learning
- Supervised learning — labelled data
- Unsupervised learning — find patterns
- Reinforcement learning — reward signals

## Practical Applications

### Where ML is Used Today
- Image recognition
- Language translation
- Medical diagnosis
- Recommendation systems

![slide-image](./ml-applications.png)

### Check Your Understanding
<!-- quiz: true -->

# Thank You
Ready to start learning?
\`\`\``,
  },
];

export default function MdGuidePage() {
  const [copied, setCopied] = useState<string | null>(null);

  function copySection(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={24} className="text-indigo-400" />
          <h1 className="text-2xl font-bold">Markdown Authoring Guide</h1>
        </div>
        <p className="text-zinc-400 mb-8">
          How to write a <code className="text-indigo-300 bg-zinc-800 px-1 rounded">.md</code> file that becomes a great presentation.
          KnowHub's AI reads your Markdown and turns it into slides — these conventions tell it exactly what you want.
        </p>

        {/* Sections */}
        <div className="space-y-8">
          {GUIDE_SECTIONS.map((section, idx) => (
            <section key={idx} className="border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-900 border-b border-zinc-800">
                <h2 className="font-semibold text-zinc-100">{section.title}</h2>
                <button
                  onClick={() => copySection(section.content, String(idx))}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {copied === String(idx) ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copied === String(idx) ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="p-5">
                <FormattedContent content={section.content} />
              </div>
            </section>
          ))}
        </div>

        {/* Quick reference card */}
        <div className="mt-8 p-5 bg-zinc-900 border border-zinc-700 rounded-xl">
          <h2 className="font-semibold text-zinc-100 mb-4">Quick Reference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { tag: "#", desc: "Title slide (one per deck)" },
              { tag: "##", desc: "Section divider slide" },
              { tag: "###", desc: "Content slide" },
              { tag: "> text", desc: "Speaker notes" },
              { tag: "---", desc: "Force new slide" },
              { tag: "<!-- narration: ... -->", desc: "Custom narration script" },
              { tag: "<!-- image-prompt: ... -->", desc: "AI image for this slide" },
              { tag: "<!-- quiz: true -->", desc: "Insert quiz question" },
              { tag: "![slide-image](path)", desc: "Local image for this slide" },
              { tag: "```code```", desc: "Code panel slide" },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <code className="text-indigo-300 bg-zinc-800 px-1.5 py-0.5 rounded text-xs whitespace-nowrap flex-shrink-0">{item.tag}</code>
                <span className="text-zinc-400 text-xs">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Simple inline renderer for the guide content
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).split("\n");
          const code = lines.slice(1).join("\n");
          return (
            <pre key={i} className="bg-zinc-800 rounded-lg p-4 overflow-x-auto text-xs text-zinc-200 border border-zinc-700">
              <code>{code}</code>
            </pre>
          );
        }
        return (
          <div key={i} className="space-y-1 whitespace-pre-wrap">
            {part.split("\n").map((line, j) => {
              if (line.startsWith("**") && line.endsWith("**")) {
                return <p key={j} className="font-semibold text-zinc-100">{line.slice(2, -2)}</p>;
              }
              if (line.startsWith("| ")) {
                return <p key={j} className="font-mono text-xs text-zinc-400">{line}</p>;
              }
              if (line.startsWith("- ") || line.startsWith("* ")) {
                return <p key={j} className="pl-4">• {line.slice(2)}</p>;
              }
              return <p key={j}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}
