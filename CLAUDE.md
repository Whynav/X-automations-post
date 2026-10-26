# Project Rules — Reddit & AEO Agency X Growth Studio

This file encodes permanent operational constraints for this project. All contributors (human and AI) must follow these rules without exception.

---

## RULE 1: API COST GUARDRAIL 🔒
This project must **only ever use `GEMINI_API_KEY`** for all LLM calls.

- `ANTHROPIC_API_KEY` is NOT to be added back under any circumstances.
- `KIE_AI_API_KEY` is NOT to be added back under any circumstances.
- Free Reddit `.json` endpoints (`https://www.reddit.com/r/{sub}/top.json`) must be used for the majority of data fetching.
- Apify calls must be hard-capped at `maxItems <= 5` per creator and triggered **only on demand by the user**, never on a schedule or cron.

---

## RULE 2: HUMAN GATE — NO AUTO-PUBLISHING 🚫
This is a **Drafting Studio only**. It is strictly forbidden to:
- Add automated X/Twitter posting endpoints
- Add automated reply or DM scripts
- Add any webhook that triggers publishing without explicit user action

All content must terminate as a draft or one-click copy packet in `/posts`. Publishing remains 100% manual via X app or Typefully.

---

## RULE 3: ANTI-AI-SLOP PROMPT INTEGRITY 📝
Any prompt updated in `data/configs.csv` or `context/` must:
- Explicitly forbid emoji numbered lists (`1️⃣`, `🧵`)
- Explicitly forbid generic openings ("In 2026, Reddit is a goldmine...")
- Explicitly forbid fabricated client results
- Enforce zero-client proof standards: public subreddit data, live LLM citation tests, public thread dissections only

---

## RULE 4: SELF-IMPROVEMENT LOOP 📈
Whenever `data/my_analytics.csv` is updated:
- Extract the top 20% by bookmark + profile-visit patterns
- Append new learnings as bullet rules to `context/voice_and_rules.md`
- Use Gemini 2.5 Flash for the analysis (no manual re-prompting required)

---

## RULE 5: SCHEMA STABILITY
The `Post` type in `app/src/lib/types.ts` must always include these 7 studio fields:
- `hookFormula`, `whyItWorked`, `visualArchetype`
- `redditAeoAdaptation`, `personalizeQuestion`
- `claudePromptPacket`, `chatgptImagePrompt`

And `data/posts.csv` columns must always include them. Never remove or rename these columns.

---

## RULE 6: SUBREDDIT FETCHER SAFETY
The Reddit `.json` fetcher (`app/src/lib/reddit.ts`) must always enforce `MAX_ITEMS_CAP = 25`.
The Apify scraper in `pipeline.ts` must always enforce `MAX_TWEETS_PER_CREATOR = 5`.
