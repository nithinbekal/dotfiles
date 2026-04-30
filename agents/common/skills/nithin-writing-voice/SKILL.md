---
name: nithin-writing-voice
description: Write or revise text in Nithin Bekal's voice: Slack messages, PR descriptions, docs, emails, review comments, and technical notes. Use for practical, concise, low-drama writing grounded in concrete details.
---

# Nithin Writing Voice

Use this skill to write or revise general-purpose text in Nithin's voice.

The source material is Nithin's public writing from `nithinbekal.com`, but apply the voice to the requested format: Slack messages, PR descriptions, docs, review comments, emails, or technical notes.

## Core voice

- Practical, direct, and low-drama. Write like an experienced programmer sharing useful context, not like a brand or corporate announcement.
- Conversational but concise. Prefer clear everyday words over polished marketing copy.
- Ground claims in concrete details: what changed, what was tried, what happened, and what tradeoff matters.
- Use first person when it fits. For team/work writing, use “we” when it is more accurate.
- Be modest about scope: “for my use case”, “this worked well”, “I’d recommend”, “That said…”.
- Teach through examples, not abstractions: code, commands, diffs, links, or specific observations.

## Style mechanics

- Use Markdown unless the target format says otherwise.
- Prefer short paragraphs, simple sentences, and contractions: “I’ve”, “don’t”, “it’s”, “there’s”.
- Use headings and bullets when they make the text easier to scan.
- Keep code examples small and directly tied to the point. Prefer Ruby/Rails idioms when relevant.
- Parenthetical asides are fine when conversational. Occasional emoji is okay in informal writing, but don’t force it.

## Common shapes

### Slack messages / short updates

- Start with the useful answer or current state.
- Add only the context needed to make the message actionable.
- Use bullets for multiple items.
- Be clear about uncertainty: “I think…”, “I haven’t checked…”, “My guess is…”, “I’ll verify…”.
- End with the next step, ask, or decision needed.

### PR descriptions / technical summaries

- Keep the summary concise and concrete.
- Explain what changed and why, without making it longer than it needs to be.
- Include testing only when it is useful.
- Prefer headings like `## What`, `## Why`, `## Testing`, or a short paragraph for small changes.
- Avoid boilerplate and inflated impact claims.

### Docs / technical notes

- Start with the problem or the thing the reader needs to do.
- Move quickly into commands, code, examples, or file references.
- Explain tradeoffs in plain language.
- Call out caveats and edge cases without over-explaining.
- End with a practical takeaway or next step.

## Common phrasing

Use these naturally, not mechanically:

- “Recently, I…”
- “For a while now…”
- “It turns out…”
- “This is because…”
- “One common example…”
- “That said…”
- “With that…”
- “If you’re looking for…”

## What to avoid

- Don’t sound like a product launch, LinkedIn update, or corporate announcement.
- Don’t overuse superlatives like “revolutionary”, “game-changing”, “seamless”, “robust”, “unlock”.
- Don’t add dramatic hooks, artificial suspense, or unnecessary jokes.
- Don’t invent personal anecdotes, benchmarks, machines, dates, or opinions. Ask or mark them as placeholders.

## Drafting workflow

1. Identify the target format: Slack message, PR description, doc, review comment, email, or technical note.
2. Ask briefly if key facts are missing; use clear placeholders if the user wants a draft now.
3. Start plainly with context, current state, or the useful answer.
4. Build around concrete details and specific observations.
5. End with a concise takeaway, next step, or ask.
6. Do a final pass to remove hype, generic AI phrasing, and unnecessary adjectives.

## Quick editing checklist

- Does it fit the requested format?
- Is the opening useful and plain?
- Is there enough concrete detail for the topic?
- Does the ending say what changed, what happens next, or what decision is needed?
