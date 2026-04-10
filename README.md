# ProLearner: LearnHaus AI ProLearning Discovery Engine

## What I Built

An end-to-end ProLearning discovery prototype that lets users describe what they want to learn (with optional context about their background, budget, and format preference), streams live Claude Sonnet 4.6 reasoning to explain its thinking, then surfaces a ranked, scored list of real ProLearning activities — courses, certificates, hackathons, communities, volunteering, meetups, and professional associations — pulled from a curated SQLite index of 25 verified opportunities. Users can filter results by type, modality, cost, and eligibility, then drag activities into a kanban-style shortlist (Saved → Enrolled → Completed) that persists in localStorage.

## Architecture

```
User (browser)
    │
    │  POST /api/search  { query, background, budget, location_pref }
    ▼
Next.js App (app/api/search/route.ts)
    │
    ├── better-sqlite3 ──► data/activities.db  (25 curated activities)
    │         reads full index into context
    │
    ├── Anthropic SDK ──► Claude Sonnet 4.6
    │         system prompt + activity index + user context
    │         model streams back <thinking> + <recommendations>
    │
    │  SSE stream  data: {"type":"text","text":"..."}
    │              data: {"type":"done","activities":[...]}
    ▼
React UI (app/page.tsx)
    │
    ├── Live streaming reasoning panel (<thinking> block)
    ├── Ranked result cards with matchScore + matchReason badges
    ├── Sidebar filters (type / modality / cost / eligibility)
    └── Kanban shortlist (localStorage)
```

## How It Works

**1. Intake** — The search screen collects a freeform query plus optional structured context (background level, budget, format preference). These are combined into a `userContext` string sent as the user message.

**2. Index build** — On every request, all 25 activities are read from SQLite and serialized into a compact single-line-per-activity format including ID, title, provider, type, cost, level, modality, eligibility, location, tags, and description. This index is injected into the system prompt.

**3. Claude reasoning** — Claude reads the full index and the user context, reasons step-by-step inside a `<thinking>` block (referencing activities by `[ID:X]`), then emits a `<recommendations>` block with one line per recommended activity in the format `[ID:X] | score:N | reason: ...`. Streaming SSE tokens are forwarded to the client in real time so the user sees the reasoning as it is generated.

**4. Structured output parsing** — After streaming completes, the server parses the `<recommendations>` block with regex to extract per-activity `score` (1–10) and `reason`. Activities scoring 6+ are resolved from the DB, sorted descending by score, and returned in the `done` SSE event with `matchScore` and `matchReason` fields attached to each activity object.

## API Reference

### POST /api/search

**Request:**
```json
{
  "query": "I want to break into machine learning as a college sophomore",
  "background": "college",
  "budget": "free only",
  "location_pref": "online"
}
```

All fields except `query` are optional.

**Response (SSE stream):**
- `data: {"type":"text","text":"..."}` — Claude streaming tokens (thinking + recommendations text)
- `data: {"type":"done","activities":[...]}` — Final ranked activities with matchScore and matchReason
- `data: {"type":"error","message":"..."}` — Error event

**Example activity in done response:**
```json
{
  "id": 1,
  "title": "Machine Learning Specialization",
  "provider": "Coursera / DeepLearning.AI",
  "type": "course",
  "url": "https://www.coursera.org/specializations/machine-learning-introduction",
  "description": "Andrew Ng's foundational ML course covering supervised learning, unsupervised learning, and best practices.",
  "cost": "free to audit",
  "modality": "online",
  "level": "beginner",
  "tags": "machine learning, python, deep learning, neural networks",
  "eligibility": "all",
  "location": "online",
  "freshness": "2025-01",
  "matchScore": 9,
  "matchReason": "Directly addresses the user's goal of breaking into ML as a beginner; free to audit removes the cost barrier entirely."
}
```

## Data Model

| Field | Type | Example | Notes |
|---|---|---|---|
| id | INTEGER | 1 | Auto-increment primary key |
| title | TEXT | Machine Learning Specialization | Activity name |
| provider | TEXT | Coursera / DeepLearning.AI | Organization offering the activity |
| type | TEXT | course | One of: course, certificate, hackathon, community, volunteering, meetup, professional association |
| url | TEXT | https://... | Canonical source URL, verified at seed time |
| description | TEXT | Andrew Ng's foundational... | 1-2 sentence description used in LLM context |
| cost | TEXT | free to audit | Human-readable cost string (e.g. "free", "freemium", "paid ($149/mo)") |
| modality | TEXT | online | online / in-person / hybrid |
| level | TEXT | beginner | beginner / intermediate / advanced / all |
| tags | TEXT | machine learning, python | Comma-separated topic tags |
| eligibility | TEXT | all | Who can participate (e.g. "all", "college students", "18+") |
| location | TEXT | online | Geographic location or "online" |
| freshness | TEXT | 2025-01 | YYYY-MM of last manual verification |

## Activity Index

25 curated, real ProLearning activities across 7 types:

| Type | Count | Examples |
|---|---|---|
| course | 9 | Machine Learning Specialization (Coursera), CS50 (Harvard/edX), Full Stack Open (Helsinki), Y Combinator Startup School, AI Safety Fundamentals, LinkedIn Learning, Tech Elevator |
| certificate | 4 | Google Data Analytics Certificate, AWS Cloud Practitioner, Responsible AI Certification, PMP |
| community | 6 | MLH Fellowship, AI Community of Practice (Digital.gov), Buildspace Nights & Weekends, Kaggle Competitions, Dev.to Community, Product Management Fellowship |
| hackathon | 4 | HackMIT, TreeHacks (Stanford), PennApps, HackNY |
| volunteering | 2 | Google Summer of Code, Taproot Foundation Pro Bono |
| professional association | 1 | IEEE Student Membership |
| meetup | 1 | Data Science DC Meetup |

All activities have real, working source URLs verified at seed time. The `freshness` field records when each entry was last manually checked. See the live index at `GET /api/activities`.

## Ranking System

**Hybrid: LLM in-context reasoning.**

Claude Sonnet 4.6 receives the full activity index (~3k tokens) plus the user's query and context, then reasons step-by-step about:
- **Goal fit** — Does the activity directly address what the user is trying to learn or achieve?
- **Level match** — Is the difficulty appropriate for the user's stated background?
- **Cost accessibility** — Does the cost fit the user's budget constraint?
- **Eligibility** — Is the user eligible to participate?

Claude returns a 1–10 match score and a 1–2 sentence reason for each recommended activity. The server filters to scores >= 6 and sorts descending before returning results.

No embeddings, vector search, or heuristic keyword matching are used. The index is small enough (25 activities) that full in-context reasoning is faster and more accurate than similarity search for nuanced, goal-oriented queries.

## Assumptions

- **Activity data is curated/seeded (25 real activities), not live-scraped.** This is by design: the brief recommends "a small number of higher-value source integrations" over broad scraping. Quality and accuracy matter more than volume.
- **Freshness is tracked via a `freshness` field** on each activity (date last verified). A production system would re-verify these periodically via a background job.
- **Ranking is semantic via LLM, not heuristic or embedding-based.** Tradeoff: slower (3-8s) but more context-aware and explainable. The structured score + reason output makes the ranking transparent and auditable.
- **Budget constraints are passed as natural language to Claude** rather than parsed numerically. This handles the varied cost formats in the DB ("free to audit", "paid ($100 exam)", "freemium") without needing a cost normalization layer.
- **No user accounts or persistent profiles.** The brief explicitly de-prioritizes this. The kanban shortlist uses localStorage for lightweight session persistence.

## Tradeoffs & Decisions

| Decision | Chosen | Alternative | Why |
|---|---|---|---|
| Retrieval | Full in-context index | Vector embeddings | Index is small (25 items); LLM reasoning outperforms cosine similarity for nuanced, goal-oriented queries |
| Auth | None | NextAuth + DB | Brief says heavy profile system is out of scope; localStorage kanban is sufficient |
| Data source | Curated seed | Live web scraping | Brief explicitly recommends curated over broad scraping; quality > quantity |
| Streaming | SSE | REST | Better UX for 3-8s LLM calls; shows live reasoning so the wait feels productive |
| Database | SQLite | PostgreSQL | No infra needed; activities are read-mostly with no concurrent writes |
| Scoring | LLM-generated 1-10 | Rule-based | Explainable, context-aware, handles free-text goals naturally |
| Context intake | Structured pills + freeform | Freeform only | Pills reduce friction while passing clean structured signals to the model |

## What I'd Build Next (with more time)

1. **Activity freshness pipeline** — cron job that re-verifies URLs and updates the `freshness` field weekly; flags stale activities for manual review
2. **More activity sources** — integrate Coursera API, Eventbrite (hackathons), LinkedIn Learning catalog, GitHub Education
3. **Semantic caching** — cache Claude responses for semantically similar queries (e.g. using embedding similarity) to reduce latency and cost for repeat searches
4. **Conversational refinement** — let users say "only show free ones" or "I'm more of an intermediate" as follow-up messages without re-entering the full query
5. **Admin panel** — UI to add/edit/verify activities without touching the DB directly; bulk import from CSV

## Setup

```bash
npm install
cp .env.local.example .env.local   # add your ANTHROPIC_API_KEY
npx ts-node --project tsconfig.json scripts/seed.ts   # seeds 25 activities into SQLite
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Next.js 16.2.3**, React 19, TypeScript
- **Tailwind CSS v4**
- **better-sqlite3** (SQLite, read-only in API routes)
- **Anthropic SDK** (claude-sonnet-4-6, streaming messages)
- **SSE streaming** (ReadableStream, text/event-stream)
- No external auth, no ORM, no vector DB
