### How We Build This: Chat vs. Google Antigravity

You do not have to choose between building here or in Google Antigravity—**we use both together**:

1. **What I have built for you right here in this response:** I have inspected the exact codebase of `melnikoff-oleg/x-ai` (a Next.js 16 + TypeScript + Tailwind v4 + CSV-storage web app that originally used Apify → Gemini 2.5 Flash → Claude API → Kie AI) and redesigned the entire architecture, pre-seeded creator datasets, knowledge base files, and exact LLM prompts tailored to your **Zero-Client Reddit + AEO/GEO Agency**.
2. **Why you run the app inside Google Antigravity:** Because `x-ai` runs locally on `http://localhost:3000` and reads/writes local CSV files in its `data/` directory, you will clone the repo into **Google Antigravity** and paste the **6 Argon slash-command prompts** (`/plan`, `Subagents`, `/goal`, `/browser`, `/learn`, `Thinking level`) provided in **Section C** below. Argon will automatically strip out the paid Claude/Kie API dependencies and transform the repo into your custom **Drafting & Swipe-File Studio** in under 10 minutes.



---

## TASK A: Total System Clarity & Architecture Map

### 1. Operational Foundation (Answering the 6 Core Operator Questions)

Before a single post is drafted, your system is anchored to these 6 operational truths (which live inside `context/agency_positioning.md` so every AI prompt references them):

| Operational Question | Your System's Ground-Truth Answer |
| --- | --- |
| **1. Precise Offer & Price Point** | **Offer:** "Done-for-you Organic Reddit Distribution & LLM Citation Engineering—we get your SaaS mentioned in high-intent subreddit threads that rank on Google and get cited by ChatGPT, Perplexity, and Gemini without getting your brand banned." **Pricing:** $500–$1,000 Paid Reddit/AEO Diagnostic Audit (entry wedge at 0 clients) $\rightarrow$ $2,500–$5,000/mo retainer. |
| **2. Exact ICP & Why Buy at 0 Clients** | **ICP:** Seed-to-Series A AI B2B SaaS and AI tool founders ($10k–$100k+ MRR) whose buyers ask "best tool for X" on Reddit or LLMs. **Why they buy from you:** Shill farms use bot accounts that get nuked and destroy domain reputation. You prove deep subreddit mechanics, moderator psychology, and measurable LLM citation patterns publicly through data dissections. |
| **3. Ban Risk Mitigation (Delivery USP)** | Strict separation of **Discovery/Data** (automated via Apify/scripts) and **Execution** (aged high-CQS accounts, 80/20 non-promotional value ratio, unlinked brand mentions vs. natural comparative anchors, subreddit-specific rule compliance). |
| **4. Delivery Capacity (First 2–3 Clients)** | Productized solo workflow: Automated Apify thread monitoring + LLM reply briefs $\rightarrow$ manual human-edited comment placement. Caps at 3–4 clients solo before hiring a dedicated community writer trained on your SOPs. |
| **5. Measuring AEO/GEO Impact** | Track 4 tiers beyond vanity upvotes: **(1)** Thread survival rate (>95% unremoved after 14 days), **(2)** Google SERP ranking for `"keyword + reddit"`, **(3)** Direct citation presence across Perplexity/ChatGPT/Gemini prompts for category queries, and **(4)** Branded search / referral lift. |
| **6. Inbound + Light Outbound Mix** | **Inbound (60%):** Daily data-backed X posts + 2–3 weekly threads + "Comment `[KEYWORD]`" lead magnets $\rightarrow$ DM triage. **Light Outbound (40%):** Daily 30–45 min sniper replies on the 21 tracked accounts + DMing SaaS founders whose brands are currently getting roasted or ignored in target subreddits with a free 3-bullet teardown. |

---

### 2. End-to-End System Data Flow & Where `x-ai` Sits

```
[INPUT LAYER: On-Demand Data Collection ($5/mo Apify Cap Protected)]
 ├── 1. Apify X Scraper (On-Demand Button) ──► Pulls top tweets from 21 Niche Creators (`data/creators.csv`)
 ├── 2. Reddit Data Fetcher (Free .json API + Apify Fallback) ──► Pulls 2k+ upvote threads & banned promos
 └── 3. Weekly X Analytics CSV (Manual Export from X) ──► Dropped into `data/my_analytics.csv`
          │
          ▼
[PROCESSING LAYER: Modified `melnikoff-oleg/x-ai` Backend (Gemini 2.5 Flash API ONLY)]
 ├── Phase 1 (Ingest): Filters for outliers (high bookmark-to-like ratio, specific numbers, threads)
 ├── Phase 2 (Multimodal Analyze via Gemini 2.5 Flash):
 │    └── Extracts Hook Formula, Psychological Trigger, Thread Arc, and Visual Structure (text + image)
 └── Phase 3 (Generate Studio Assets via Gemini 2.5 Flash + `context/` files):
      ├── Asset A: 3 Adapted Hook Angles + Initial Draft (60% Infographic / 30% Personal / 10% Contrarian)
      ├── Asset B: "Personalize Question" (Grok-Bot style prompt asking for your real take/observation)
      ├── Asset C: One-Click "Claude Pro Writer + Critic Prompt Packet" (pre-loaded with your Voice Rules)
      └── Asset D: One-Click "Raw ChatGPT Image / Infographic Prompt" (replaces Kie AI)
          │
          ▼
[CONTROL LAYER: `x-ai` Next.js Local Studio (`http://localhost:3000`)]
 ├── `/creators` ──► Manage the 21 Reddit, AEO, and Agency X accounts + target Subreddits
 ├── `/configs`  ──► Store and tweak the 5 core Gemini & Claude system prompts
 ├── `/run`      ──► On-demand trigger with hard max-items cap (protects $5 Apify credit) + SSE live log
 └── `/posts`    ──► Side-by-side Swipe File & Drafting Studio with 1-Click Copy Buttons
          │
          ▼
[HUMAN GATE & EXECUTION LAYER (100% Manual Control)]
 ├── 1. Copy "Claude Pro Packet" + answer the "Personalize Question" ──► Paste into Claude Pro Project
 ├── 2. Copy "ChatGPT Image Prompt" (or take real Reddit/Apify screenshot) ──► Generate visual in ChatGPT
 ├── 3. Paste final human-edited post + visual into X / Typefully ──► Engage hard for first 30–60 mins
 └── 4. Comment-to-DM Lead Magnet ("Comment 'SUBS'") ──► DM Asset + Diagnostic Question ──► Paid Audit / Retainer

```

---

### 3. Automated vs. Manual Responsibility Matrix

| Workflow Step | Automated or Manual? | Tool Used | Why (Based on High-Signal Operator Rules) |
| --- | --- | --- | --- |
| **Scouting Niche Winners & Subreddit Data** | **Automated (On-Demand)** | `x-ai` (`/run`) + Apify / Reddit `.json` | Saves hours of scrolling while protecting your $5/mo Apify limit via manual button triggers. |
| **Multimodal Hook & Visual Breakdown** | **Automated** | `x-ai` + Gemini 2.5 Flash API | Gemini 2.5 Flash natively reads tweet screenshots, charts, and thread structures at near-zero cost. |
| **Prompt Packet & Image Prompt Assembly** | **Automated** | `x-ai` + Gemini 2.5 Flash API | Automatically bundles the viral structure, Reddit data point, and your voice rules into a single copy-paste block. |
| **Injecting Personal Angle / Observation** | **Strictly Manual** | You (answering the Studio's "Personalize Question") | Pure AI generation without a human observation produces generic slop that X's algorithm buries. |
| **Final Voice Drafting & Critic Pass** | **Semi-Automated (Human-Triggered)** | Your **Claude Pro** Subscription | Uses your paid Claude Pro plan (zero extra API cost) to run the Architect $\rightarrow$ Writer $\rightarrow$ Critic loop. |
| **Visual / Infographic Creation** | **Semi-Automated (Human-Triggered)** | **ChatGPT Images** + Real Screenshots | Replaces paid Kie AI API; mixes clean ChatGPT diagrams with authentic annotated Reddit/AEO screenshots. |
| **Publishing, Replies & DM Conversion** | **Strictly Manual** | X App / Typefully | Keeps approval for publishing and sending; prevents bot-ban flags and builds real founder relationships.

 |

---

## TASK B: Optimal Hybrid System Architecture, Datasets & Prompts

### 1. Why This Exact Hybrid Wins for Your Constraints

We are combining **Option 2 (Grok Bot Multi-Agent Architecture)** + **Option 5 (Claude Permanent Context/Skill Loop)** + **Option 1 (Weekly CSV Analytics Feedback)** inside the `melnikoff-oleg/x-ai` UI:

* **Zero New Subscriptions or Paid API Drain:** By stripping `ANTHROPIC_API_KEY` and `KIE_AI_API_KEY` out of `x-ai` and routing backend tasks strictly through `GEMINI_API_KEY`, your backend costs $0.00, while your existing **Claude Pro** and **ChatGPT** accounts handle final prose polishing and infographic generation.
* **Saves Your $5/mo Apify Credit:** Standard `x-ai` scrapes X accounts heavily. We add a **Free Reddit `.json` Fetcher** (appending `.json` to any subreddit URL requires $0 Apify credits!) for your daily Reddit dissections, saving your $5 Apify credit exclusively for targeted X creator scrapes (capped at 10 tweets per run).

---

### 2. Pre-Seeded Creator Database (`data/creators.csv`)

Replace the default 8 CRO accounts in `melnikoff-oleg/x-ai/data/creators.csv` with all **21 operator accounts** from your research, categorized by how our prompts will use them:

```csv
handle,name,category,study_focus,active
pxue,Paul Xue,Reddit Agency Operator,Transparent $1M-$2M agency numbers + market shifts + operational lessons,true
ashnichrist,Ashni Christ,Reddit & AEO Tactics,500k-1M view post breakdowns + aged accounts + ban avoidance + AEO citations,true
kmahjn,KM | Reddit Marketing,Reddit Agency Operator,Operator-level Reddit processes + content quality differentiation + client convos,true
arnavgjalan,Arnav G Jalan,Reddit Reputation & Hiring,Evaluating Reddit agencies + reputation control + real results vs screenshots,true
aniketeye,Aniket,Reddit Ranking & Agency,Positioning as a specialist + Reddit ranking mechanics + scaling,true
vithikaonreddit,Vithika,Reddit Marketing Operator,Subreddit culture breakdowns + organic distribution workflows,true
datanerdsaas,Data Nerd SaaS,Reddit Data & SaaS,Data-backed SaaS marketing on Reddit + quantitative teardowns,true
JustARedditNerd,Just A Reddit Nerd,Reddit Growth Specialist,Karma systems + thread structures + anti-ban rules,true
mohit04narayan,Mohit Narayan,Reddit Community Growth,Organic community distribution + founder case studies,true
Davegoldenzz,Dave Golden,Reddit Distribution,High-converting Reddit threads + traffic funnels,true
patye91,Pat,Reddit Organic Growth,Subreddit growth experiments + B2B traction,true
oleggca,Oleg,Reddit & Community Systems,Systematized community marketing + operator insights,true
SandrineZambou,Sandrine Zambou,AEO & GEO Visibility,LLM citation mechanics + AI search optimization + brand visibility,true
SEOKeval,Keval SEO,AEO & Search Strategy,Reddit SERP dominance + GEO citation patterns + technical proof,true
askOkara,Okara,Growth Playbooks,High-bookmark structured playbooks combining Reddit + multi-channel growth,true
wizofecom,Mubbu,Agency Client Acquisition,Turning X content into high-ticket deals + concrete founder wins,true
ItsMeBenChan,Ben Chan,Low-Follower Call Booking,Personal brand frameworks that book calls under 5k followers + DM funnels,true
theroborourke,Rob O'Rourke,Agency Positioning,Positioning around buyer pain rather than portfolio flexing,true
lukethorburg,Luke Thorburg,Value-First Outbound,Dream-client value outreach + creative agency acquisition hooks,true
_Rohan__mehta,Rohan Mehta,Authority Systems,System breakdowns + authority funnel architecture,true
Rakshaweb3,Raksha,Organic Founder Growth,Reply velocity + stage-based organic X growth systems,true

```

---

### 3. Permanent Knowledge Base Files (`context/` Folder & Claude Pro Project)

Create these two files inside `melnikoff-oleg/x-ai/context/` AND upload them to a dedicated **Claude Pro Project** named `"X Growth & Reddit/AEO Studio"`:

#### File 1: `context/voice_and_rules.md` (Your Anti-AI-Slop & Viral Structure Bible)

```markdown
# VOICE, HOOK & THREAD ARCHITECTURE RULES (2026 OPERATOR STANDARD)

## 1. Core Identity & Tone
- Direct, analytical operator building in the Reddit marketing + AEO/GEO space.
- Zero fluff, zero fake gurus, zero fabricated client case studies.
- Since we are in Phase 0/1 (0 clients), ALL proof comes from:
  1. Scraped public subreddit data (e.g., "I scraped 140 posts in r/SaaS from the last 30 days...").
  2. Public teardowns of winning vs. banned SaaS promotions on Reddit.
  3. Live AEO/GEO citation tests across ChatGPT, Perplexity, and Gemini.
  4. Transparent behind-the-scenes SOPs (account aging, CQS scoring, mod rule analysis).

## 2. Strictly Banned AI-Slop Patterns (Instant Fail in Critic Pass)
- NEVER use emoji numbered lists (`1️⃣`, `🧵`, `🚀`, `💡`).
- NEVER open with "In 2026, Reddit is a goldmine..." or "Most people sleep on X..."
- NEVER use AI transition words: "delve", "testament", "game-changer", "unlock", "harness", "moreover", "crucial", "tapestry", "symphony".
- NEVER use symmetrical 3-bullet lists in every single tweet. Vary sentence length: mix 4-word punchy declarations with dense, specific operational sentences.
- NEVER end with "Follow me and RT the first tweet!"

## 3. Proven Hook Formulas (Tweet 1 = 40-50% of Performance)
- **Data Scrape + Contrarian Finding:** "I scraped [X] posts in r/[Subreddit] over the last [Y] days. [Z]% of SaaS founders got their posts removed by mods within 2 hours. The [W]% that hit 500+ upvotes all used the same 3-part structure:"
- **Specific AEO Observation + Mystery:** "Ask Perplexity or ChatGPT for the 'best [SaaS category]' right now. 4 of the top 5 cited tools come from a single 8-month-old Reddit thread with only 42 upvotes. Here is the exact anatomy of an LLM-cited Reddit comment:"
- **Public Mistake Autopsy:** "A B2B SaaS founder spent 6 months building a product, posted it in r/[Subreddit] yesterday, and got permanently banned in 14 minutes. I pulled the removed post. Here are the 3 triggers that set off Reddit's spam filter (and how I'd rewrite it):"
- **Operator System Confession:** "Shill agencies charge $5k/mo to blast upvoted bot comments on Reddit. Within 3 weeks, the brand's domain gets blacklisted across major subs. Here is the exact non-promotional SOP we use to build organic citation lift safely:"

## 4. Thread Structure (Sweet Spot: 6–10 Tweets)
- **Tweet 1 (Hook):** Stop the scroll. High specificity + tension/curiosity gap. Under 240 chars.
- **Tweet 2 (Context / The Trap):** Why standard advice or shill agencies fail here.
- **Tweets 3–7 (The Meat):** One concrete insight, step, or data point per tweet. Include real subreddit names (`r/SaaS`, `r/devops`, `r/microsaas`), real numbers, and before/after phrasing.
- **Tweet 8 (The Proof / Visual Anchor):** Reference the attached annotated screenshot, scraped data table, or LLM citation output.
- **Tweet 9 (Soft CTA / Lead Magnet):** Either a specific operator question ("Which subreddit gives your brand the hardest time right now?") OR a soft resource drop ("I compiled the mod-rule & citation breakdown for 35 B2B SaaS subreddits. Reply 'SUBS' and I'll DM you the sheet.").

```

---

### 4. Exact System Prompts to Power `x-ai` (`/configs`) & Claude Pro

#### Prompt 1: `x-ai` Multimodal Scout & Pattern Extractor (Runs via Gemini 2.5 Flash API)

> **Where this goes:** Saved in `data/configs.csv` inside `x-ai`. When you click **Run**, Gemini 2.5 Flash analyzes the scraped X posts (text + attached images) or scraped Reddit threads and generates the studio row.

```markdown
You are the Scout & Pattern Extraction Engine for an organic Reddit Marketing & AEO/GEO (Answer Engine Optimization) Agency.
Analyze the provided source post (and its attached image/visual, if any) plus any provided Reddit data context.

Output a strict JSON object with these exact keys:
1. "why_it_worked": 2 concise sentences explaining the psychological trigger, hook mechanism, and why it achieved high bookmarks/engagement.
2. "hook_formula": Abstract the opening tweet into a reusable bracketed template (e.g., "I analyzed [N] [items] in [place]. [X]% failed because [mistake]. The top [Y]% did [mechanism]:").
3. "visual_archetype": Classify the visual style into one of: ["Annotated Screenshot", "Process Flowchart / Infographic", "Before vs After Comparison", "Data Table / Scrape Breakdown", "Text-Only Punchy"].
4. "reddit_aeo_adaptation": 3 distinct angles adapting this exact format to our niche (Organic Reddit Distribution, Subreddit Ban Avoidance, or LLM/AEO Citation Mechanics for B2B SaaS) using ONLY zero-client public proof (scraped subreddit data, public thread dissections, or live LLM citation queries).
5. "personalize_question": Write 1 pointed question asking the human operator to inject a real observation before final drafting (e.g., "Which specific subreddit or SaaS category did you notice this pattern in today, and what stood out in the comments?").
6. "chatgpt_image_prompt": Write a complete, detailed prompt that the user can copy-paste directly into ChatGPT Images to generate a clean, high-contrast infographic or comparison visual matching the "visual_archetype" for the best adapted angle. Also include a 1-sentence instruction if a real annotated screenshot of Reddit/Perplexity would perform better.
7. "claude_prompt_packet": Generate a self-contained prompt block (using the template below) that bundles the extracted `hook_formula`, the strongest `reddit_aeo_adaptation`, and a placeholder `[INSERT MY QUICK ANSWER HERE]` for the `personalize_question`, ready to paste into Claude Pro.

```

#### Prompt 2: The One-Click "Claude Pro Writer + Critic" Master Prompt

> **Where this goes:** Automatically generated in the `claude_prompt_packet` column of `/posts` in `x-ai` (or saved as System Instructions in your Claude Pro Project). You copy-paste this into Claude Pro, type your 1-sentence personal observation, and hit Enter.

```markdown
You are a 3-stage sequential X Content Engine (Architect -> Voice Writer -> Ruthless Critic) writing for an operator building a Reddit Marketing & AEO/GEO agency (currently at 0 clients, proving authority strictly through public subreddit data dissections, ban-avoidance SOPs, and live LLM citation analyses).

### INPUTS FROM MY X-AI STUDIO:
- **Source Hook Formula:** {{hook_formula}}
- **Viral Mechanism:** {{why_it_worked}}
- **Selected Reddit/AEO Angle:** {{reddit_aeo_adaptation}}
- **My Real Operator Observation / Data Point:** [TYPE YOUR 1-2 SENTENCE OBSERVATION OR SCRAPED STAT HERE]
- **Target Format:** [Single Long-Form Post OR 7-9 Tweet Thread]

### EXECUTE THESE 3 STEPS IN ORDER:

#### STEP 1: ARCHITECT (Hook Lab)
Write 5 distinct Hook variations under 240 characters based on the Source Hook Formula and my observation:
- Hook 1: Hard Data Scrape / Specific Number
- Hook 2: Contrarian Process Insight (Why shill factories get banned)
- Hook 3: Live AEO/GEO Citation Observation (ChatGPT/Perplexity/Gemini proof)
- Hook 4: Public Brand Mistake Autopsy
- Hook 5: Transparent Operator SOP / Framework

#### STEP 2: VOICE WRITER (Drafting)
Select the strongest Hook and write the complete draft (both a **7–9 Tweet Thread version** AND a **Long-Form Single Post version**).
- Follow every rule in `voice_and_rules.md`.
- Name real subreddits (`r/SaaS`, `r/microsaas`, `r/entrepreneur`, `r/devops`, etc.) and concrete mechanics (CQS score, mod automod regex filters, unlinked brand mentions vs. anchor links, Perplexity citation decay).
- End with a natural soft CTA (either a specific operator question OR a comment-to-DM lead magnet trigger like "Reply 'AUDIT' or 'SUBS'").

#### STEP 3: RUTHLESS CRITIC & FINAL POLISH
Audit your own Step 2 draft against these 5 failure points:
1. Did any AI-isms ("delve", "game-changer", "unlock", emoji lists) sneak in?
2. Does it fake having clients instead of using transparent public data/experiments?
3. Are the paragraph breaks mobile-first (1-2 sentences per block, uneven rhythm)?
4. Would a $30k MRR SaaS founder bookmark this to read later?
5. Is the first line scroll-stopping without sounding like a template?

List the flaws found, then output the **FINAL HUMAN-READY THREAD & SINGLE POST** formatted cleanly for one-click copy into X / Typefully.

```

#### Prompt 3: Reddit JSON Scrape $\rightarrow$ X Proof Asset Extractor (Runs via Gemini 2.5 Flash)

> **Where this goes:** Used when you drop a subreddit `.json` scrape or Apify Reddit output into `x-ai` to manufacture zero-client proof assets.

```markdown
Analyze this raw JSON dataset of recent posts and comments from r/{{subreddit}}.
Do not summarize generically. Extract 3 concrete, data-backed "Zero-Client Proof Assets" I can turn into X threads today:

1. **The Winner Dissection:** Identify the highest-upvoted post/thread where a software tool, workflow, or brand was mentioned positively without getting removed. Extract: exact title structure, word count, how the product was introduced (story vs. teardown vs. comment reply), and why moderators allowed it.
2. **The graveyard / Downvote Pattern:** Identify posts that got 0 upvotes, hostile comments, or mod-removed flags. What exact phrasing triggered the community's anti-marketing reflex?
3. **The AEO / Buyer-Intent Goldmine:** Extract the top 3 recurring "How do I..." or "Best alternative to..." questions asked in this dataset that LLMs (Perplexity/ChatGPT) pull from, and write a 4-step SOP on how a SaaS brand in this niche should organically answer them to capture the citation.

```

#### Prompt 4: Monday X Analytics CSV Feedback Loop Prompt (Runs in Claude Pro or `x-ai`)

> **Where this goes:** Every Monday, download your X Analytics CSV (`Content` tab) and run this prompt to retrain `context/voice_and_rules.md`.

```markdown
Attached is my X Analytics CSV from the last 7–30 days.
Calculate my median Impressions, Bookmarks, Replies, and Profile Visits.
Weight **Bookmarks (x4)**, **Profile Visits (x3)**, and **Replies (x2)** much heavier than Likes.

1. **Top 20% Winners:** List my top 3–5 posts against my median. Extract the exact opening line, topic pillar (Reddit Dissection vs. AEO Citation vs. Mistake Autopsy vs. SOP), post length, and visual type.
2. **Bottom 30% Flops:** Identify what flopped and diagnose why the hook or angle failed to stop the scroll.
3. **Hook Rewrite Rescue:** Take my #1 highest-value idea that flopped under my median impressions and write 3 brand-new Hooks using the winning patterns from my Top 20% so I can repost the idea this week.
4. **Rule Update (`learn`):** Output 3 new bullet rules I should append to my `context/voice_and_rules.md` file based on this week's real data.

```

---

### 5. Daily & Weekly Operating Cadence (60–75 Mins/Day Total)

| Time Block | Action Inside Your System | Output / Goal |
| --- | --- | --- |
| **Morning Discovery (15 mins)** | Open `localhost:3000/run` or drop a free subreddit `.json` file (`[https://www.reddit.com/r/SaaS/top.json?t=week&limit=25](https://www.reddit.com/r/SaaS/top.json?t=week&limit=25)`) into `x-ai`. Review the 3 surfaced angles on `/posts`. | Pick 1 strong X format + 1 real Reddit/AEO data point. |
| **Draft & Polish (20 mins)** | Answer the **Personalize Question** in 1 sentence $\rightarrow$ Click **"Copy Claude Pro Packet"** $\rightarrow$ Paste into Claude Pro Project $\rightarrow$ Click **"Copy ChatGPT Image Prompt"** (or annotate a real Reddit/Perplexity screenshot). | 1 high-signal single post + 1 thread (2–3x/week) queued in Typefully/X. |
| **Sniper Engagement (25 mins)** | Open an X List of the **21 tracked accounts** + target SaaS founders. Leave 10–15 substantive operator replies (add a data point, a screenshot, or a subreddit insight—never "Great post!"). | Borrow reach in Phase 0/1 (0–2k followers) and drive high-intent profile visits. |
| **Inbound / Light Outbound Conversion (15 mins)** | Check comments on your lead-magnet posts ("Reply 'SUBS'") $\rightarrow$ DM the Notion sheet + ask: *"Are you guys actively trying to rank on Reddit/LLMs right now or just exploring?"* Send 2–3 unsolicited 3-bullet Reddit teardowns to SaaS founders whose posts flopped in `r/SaaS`. | Turn profile visits and comments into Paid Diagnostic Audits ($500–$1k) and retainers. |
| **Monday Feedback Loop (20 mins)** | Export X Analytics CSV $\rightarrow$ Run **Prompt 4** $\rightarrow$ Append new winning patterns to `context/voice_and_rules.md`. | Closed-loop compounding based on your real median metrics. |

---

## TASK C: Step-by-Step Build Plan Using Argon in Google Antigravity

Here is how we apply the **6 Argon techniques** (`/plan`, `Subagents`, `/goal`, `/browser`, `/learn`, `Thinking level`) to clone and transform `melnikoff-oleg/x-ai` inside Google Antigravity with strict spend and publishing guardrails.

### Step 0: Clone the Repo in Antigravity Terminal

Open Google Antigravity IDE, open the integrated terminal, and run:

```bash
git clone https://github.com/melnikoff-oleg/x-ai.git
cd x-ai/app && npm install
cp ../.env.example ../.env

```

In `.env`, only fill in these two keys (leave `ANTHROPIC_API_KEY` and `KIE_AI_API_KEY` blank):

```env
APIFY_API_TOKEN=your_apify_free_tier_token
GEMINI_API_KEY=your_gemini_api_key

```

---

### Step 1: Set Thinking Level & Run `1. /plan`

> **Argon Technique #1 (`/plan`) & #6 (`Thinking level`):** Set Argon's **Thinking level to High** for architectural planning so we agree on every file change before it modifies the codebase.
> 
> 

Paste this exact prompt into Argon inside Antigravity:

```text
/plan
We are refactoring this cloned `melnikoff-oleg/x-ai` repository into a "Zero-Client Reddit & AEO Agency X Growth Studio" operating strictly on `APIFY_API_TOKEN` (capped for the $5/mo free tier) and `GEMINI_API_KEY` (zero Anthropic API or Kie AI API costs).

Before changing any files, inspect the repo (`app/`, `scripts/`, `data/`, `context/`) and output a file-by-file modification plan for my approval covering these 5 requirements:
1. Remove all paid calls to `ANTHROPIC_API_KEY` and `KIE_AI_API_KEY` in `scripts/` and `app/api/`. Route both Phase 2 (Multimodal Analysis) and Phase 3 (Generation) through `GEMINI_API_KEY` (using `gemini-2.5-flash`).
2. Add a Free Reddit Subreddit Fetcher (`https://www.reddit.com/r/{subreddit}/top.json?t=week&limit=15`) alongside the on-demand Apify X scraper so we can ingest real Reddit threads at $0 API cost, and enforce a strict `maxItems: 5` per creator cap on Apify runs to protect the $5/mo Apify credit.
3. Expand the generated posts CSV schema (`data/posts.csv`) and TypeScript types to store: `hook_formula`, `why_it_worked`, `visual_archetype`, `reddit_aeo_adaptation`, `personalize_question`, `claude_prompt_packet`, and `chatgpt_image_prompt`.
4. Upgrade `/posts` (`app/src/app/posts/page.tsx`) into a "Drafting & Swipe-File Studio" featuring:
   - An editable input box for the user's answer to `personalize_question` that dynamically injects their answer into the `claude_prompt_packet`.
   - 3 one-click Copy buttons: [Copy Claude Pro Writer+Critic Prompt], [Copy Raw ChatGPT Image Prompt], and [Copy Final Thread/Post for X/Typefully].
   - Zero auto-publishing to X (keep human approval for all publishing).
5. Seed `data/creators.csv` with our 21 Reddit/AEO/Agency accounts and `data/configs.csv` with our Reddit/AEO Scout & Generator prompts.

```

---

### Step 2: Execute in Parallel with `2. Subagents` & `3. /goal`

> **Argon Technique #2 (`Subagents`) & #3 (`/goal`):** Once you approve the `/plan`, switch **Thinking level to Medium** and split the independent jobs across 3 parallel Subagents with a strict `/goal` finish line and spend guardrails.
> 
> 

Paste this into Argon:

```text
/goal Refactor `x-ai` into the local Reddit/AEO Drafting Studio running cleanly on `localhost:3000` with `npm run build` passing with zero TypeScript errors.
LIMITS: Do not run any live Apify API calls during testing (use mock/free Reddit .json data for verification to preserve the $5 Apify budget). Never add any automated X publishing endpoints.

Spawn 3 Subagents in parallel to execute the approved plan:

- Subagent 1 (Backend Pipeline & Gemini Engine):
  Refactor the pipeline scripts (`scripts/`) and `app/api/run` to use `@google/generative-ai` (`gemini-2.5-flash`) exclusively. Strip out `ANTHROPIC_API_KEY` and `KIE_AI_API_KEY`. Add the free Reddit `.json` fetcher endpoint and hardcode a safety cap (`maxTweetsPerCreator = 5`) on the on-demand Apify scraper. Output the new CSV columns (`hook_formula`, `personalize_question`, `claude_prompt_packet`, `chatgpt_image_prompt`).

- Subagent 2 (Data & Knowledge Base Seeding):
  Populate `data/creators.csv` with the 21 Reddit, AEO, and Agency X creators. Create `context/voice_and_rules.md` and `context/agency_positioning.md` with our anti-AI-slop rules and zero-client proof positioning. Update `data/configs.csv` with the Reddit/AEO Scout & Prompt Packet templates.

- Subagent 3 (Frontend Studio UI in `/posts` and `/run`):
  Update the `/posts` page UI to render side-by-side cards showing: Original Scraped Post/Thread, Gemini's Multimodal Analysis, the interactive "Personalize Question" input box, and the 3 one-click Copy buttons ([Copy Claude Pro Prompt Packet], [Copy ChatGPT Image Prompt], [Copy Formatted X Text]). Add a "Fetch Subreddit .JSON (Free)" button on `/run` alongside the On-Demand Apify button.

```

---

### Step 3: Verify the User Journey with `4. /browser`

> **Argon Technique #4 (`/browser`):** Have Argon open the running Next.js app in its headless browser and test the actual user journey end-to-end.
> 
> 

Paste this into Argon:

```text
/browser
Start the dev server (`npm run dev` inside `app/`), open `http://localhost:3000`, and verify the complete user journey:
1. Navigate to `/creators` and confirm all 21 Reddit/AEO/Agency accounts are loaded from `data/creators.csv`.
2. Navigate to `/configs` and verify the Reddit/AEO Scout & Prompt Packet configuration is active.
3. Navigate to `/run`, trigger a test run using the Free Subreddit `.json` fetcher (`r/SaaS`, limit 3 posts) so zero Apify credits are spent, and verify SSE progress streams to completion.
4. Navigate to `/posts`, type a test observation into the "Personalize Question" input box, and verify that clicking [Copy Claude Pro Prompt Packet] and [Copy ChatGPT Image Prompt] copies the populated prompt strings to the clipboard without errors.

```

---

### Step 4: Lock In Project Rules with `5. /learn`

> **Argon Technique #5 (`/learn`):** Turn your operational constraints and anti-AI-slop corrections into permanent reusable project rules inside the repo.
> 
> 

Paste this into Argon:

```text
/learn
Save these 4 permanent project rules into `CLAUDE.md` and the workspace rules:
1. API COST GUARDRAIL: This project must only ever use `GEMINI_API_KEY` for LLM calls and free Reddit `.json` endpoints or manually-triggered, hard-capped (`maxItems <= 5`) Apify calls. Never re-introduce paid Anthropic API or Kie AI calls.
2. HUMAN GATE RULE: Never add automated X posting, auto-replying, or auto-DMing scripts. All outputs must terminate as drafts and one-click copy packets in `/posts`.
3. ANTI-AI-SLOP PROMPT RULE: Any prompt updated in `data/configs.csv` or `context/` must explicitly forbid emoji numbered lists, generic openings ("In 2026..."), and fabricated client results, enforcing public data dissections and live AEO citation proof.
4. SELF-IMPROVEMENT RULE: Whenever a new weekly X Analytics CSV is dropped into `data/my_analytics.csv`, extract the top 20% bookmark/profile-visit patterns and append them to `context/voice_and_rules.md`.

```

---

### 5. Measurement Dashboard & Risk Controls

#### Metrics That Matter by Stage (Track Weekly in `data/my_analytics.csv`)

| Stage | Primary North-Star Metrics | Ignore (Vanity Metrics) | Conversion Target |
| --- | --- | --- | --- |
| **Phase 0–1 (Weeks 1–4: 0 Clients, 0–500 Followers)** | **1. Bookmark-to-Impression Ratio** (>1.5% signals high-value proof)<br>

<br>**2. Profile Visit Conversion Rate**<br>

<br>**3. Keyword Replies ("SUBS" / "AUDIT")** | Raw Likes, Follower count alone | **10–15 DM conversations/week** started from lead-magnet commenters + sniper replies. |
| **Phase 2 (Weeks 4–8: First Pilots & Audits)** | **1. DMs $\rightarrow$ Diagnostic Audit Calls Booked**<br>

<br>**2. Substack/Notion Lead Magnet Views**<br>

<br>**3. Live Pilot Thread Survival Rate (>95%)** | Viral 1-liner impressions from non-SaaS accounts | **2–4 Paid Diagnostic Audits ($500–$1k)** converted into your first **$2.5k–$4k/mo retainers**. |
| **Phase 3 (Month 3+: Scaling Retainers)** | **1. Client LLM Citation Lift (Perplexity/ChatGPT/Gemini)**<br>

<br>**2. Inbound Booking Link Clicks from Pinned Case Study** | Generic engagement bait | **3–5 active retainers ($10k–$20k/mo MRR)** with anonymized permissioned case studies feeding the X engine. |

#### Built-in Risk Controls

* **Apify $5/mo Credit Protection:** Never run Apify on a cron schedule. Use the **Free Subreddit `.json` Fetcher** (`r/SaaS`, `r/microsaas`, `r/entrepreneur`, `r/devops`) for 80% of your daily content ideation, and click the **Apify X Creator Scrape** button only **once per week** (fetching the top 5 tweets from 5–7 selected accounts per batch costs ~$0.15–$0.30 per weekly run, keeping you well under $5/month).
* **Reddit Client & Brand Safety:** When posting public Reddit dissections on X, blur or anonymize specific non-public account usernames so you never draw brigading reports, while showcasing the exact structural mechanics, subreddit rules, and Perplexity/ChatGPT citation screenshots.