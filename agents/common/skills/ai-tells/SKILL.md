---
name: ai-tells
description: Remove writing patterns that make text sound AI-generated. Apply when drafting or revising human-facing replies, PR descriptions and comments, Slack and email drafts, documents, code comments, and commit messages.
---

# AI tells

An evolving shitlist of patterns that scream "an LLM wrote this." Cut them on sight.

Apply this guide to session replies, PR descriptions, Slack and email drafts, documents, code comments, and commit messages.

## Use

Scan the finished draft. One hit is fine because humans use these patterns too. Three hits in a short piece smell like AI. Rewrite the cluster, name the thing, pick a stronger verb, or delete the sentence.

Add new tells under the closest heading with one short example.

When the user requests a format, return that format directly. If they ask for benchmark numbers, return the numbers in the useful format and nothing else. If they ask for a link, provide the link rather than directions for finding it.

## Vocabulary

Watch these words and phrases: delve, tapestry, intricate, intricacies, pivotal, meticulous, meticulously, testament, vibrant, bolstered, garner, interplay, enduring, valuable insights, align with, enhance, fostering, showcase, showcasing, underscore, crucial, robust, seamless, seamlessly, emphasizing, highlighting, holistic, multifaceted, nuanced, paramount, beacon, leverage, harness, elevate, cornerstone, cutting-edge, realm, arena, coalesced and all coalesc* variations, and semantic and all semantic* variations.

Also watch landscape as an abstract noun ("the regulatory landscape") and space as an abstract domain ("the AI space"). If you wrote delve or tapestry, you didn't write it. An LLM did.

## Empty judgment

right as an evaluator: "the right call," "the right move," "the right shape." Name the decision or property.

real, genuine, or genuinely as intensifiers. Drop them or state the value.

concrete as an adjective: "concrete evidence," "concrete examples." Just evidence. Just examples.

crucial, essential, key, pivotal, or vital as casual emphasis. Explain why it matters or delete it.

## Stock phrases

Hedging: "It's worth noting," "It should be noted," "important caveats," "not exhaustive," "may vary," "one might argue," "from my understanding," and evasive may, might, can be, or tend to. Commit or remove the sentence.

Sycophancy: "Great question," "Excellent point," "You're absolutely right," "Of course," "Certainly," "I hope this helps," "I'd be happy to," "Would you like me to," "Feel free to," and "Let me know if..." Nobody talks like this.

Narration: Do not announce routine actions with "I'll inspect," "Let me check," or "Now I'll." Do the work, then give the result. Narrate only when the user needs a warning, a choice, or a progress update for a long-running action.

Significance puffery: "a testament to," "plays a pivotal role," "serves as a beacon," "marks a significant shift," "key turning point," "underscores the importance," "in today's fast-paced world," and "navigating the complexities." Say what happened.

Marketing verbs: Prefer is to serves as, stands as, marks, or represents. Prefer has to boasts, features, offers, or maintains. Prefer started to embarked on a journey. is and has are not weak. They're load-bearing. That last sentence is a joke; load-bearing is also a tell.

AI-isms: "load-bearing," "belt and suspenders," "heavy lifting," "this is the right...", "let's land this," "landed cleanly," "let's get this right," throat-clearing "to be clear," "the key insight," and "the crux of the matter."

Knowledge disclaimers: "As of my last knowledge update," "based on available information," "specific details are limited," "up to my training data," and "I don't have real-time access." Find out or say "I don't know."

Closing templates: "In summary," "In conclusion," "To wrap things up," "Overall," "I hope this helps," "feel free to ask," and "Happy to clarify further." If the piece needs a summary, shorten the body.

## Sentence and document patterns

Negative parallelism: "Not just X, but Y," "It's not X. It's Y," and "The question isn't whether X. It's how Y." Keep only the half you mean.

Mechanical threes: "fast, reliable, and scalable." Keep the third item only when it adds something.

Elegant variation: "the company" becomes "the firm," then "the organization." Repeat the noun instead.

Template introductions: "Have you ever wondered," "Picture this," and "In a world where." Start with the subject.

Uniform structure: Avoid identical sentence lengths, three-to-four-sentence paragraphs, and identical section sizes. Let the content set the length.

Generic section openings: Do not begin every section with "X is a Y that does Z."

## Punctuation and formatting

Never use em dashes. Use periods, commas, colons, or parentheses.

Do not insert curly double quotes, curly single quotes, or curly apostrophes. Use straight ASCII quotes unless preserving a citation or title.

Replace three-em ellipses (. . .) with a period when the sentence ends there.

Use sentence case and sequential heading levels. Do not add thematic breaks before headings.

Use bold and emoji only when they carry information.

Use inline-header lists for glossaries or definitions, not flowing reasoning.

Use tables for two-dimensional comparisons. Write a small "Metric / Figure" table as a sentence.

Use lists for parallel, discrete, ordered, or four-plus items. Write three short bullets as a sentence.

Format follows the content. If the content is prose, write prose.

## Strict watchlist

"The shape": Never use shape for a design, approach, or plan. Name the approach, condition, setting, or plan. Literal geometry and data shapes are fine.

"Seam": Never use seam for an abstract boundary. Name the two things or the boundary. Literal sewing, welding, and geological seams are fine.

Target zero for these patterns in drafted prose.

## Message handoff

Include the link when referencing a resource. Do not make the user find it.

Do not wrap a draft in blockquote or italic formatting.

Copy Slack drafts to the clipboard as Markdown. Tell the user that the draft was copied and not sent.
