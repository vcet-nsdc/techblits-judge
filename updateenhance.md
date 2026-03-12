# TechBlitz Judge — Complete Fix & Optimisation Prompt
# For Antigravity (Claude Opus 4.6)

---

## WHO YOU ARE AND WHAT YOU MUST DO

You are a senior full-stack engineer doing a complete audit and fix of
**TechBlitz Judge** — a live hackathon competition platform built for
TechBlitz 2026 by VCET NSDC.

The project is fully built but **completely broken in production**.
Data is not flowing from the database, the competition flow is broken
end-to-end, and nothing works as designed.

Your job is:
1. Read every single file in the codebase
2. Identify every broken connection, dead code path, and data sync issue
3. Fix everything so the platform works exactly as designed
4. Optimise what works — remove what doesn't

Do not ask questions. Do not wait. Read, audit, fix, verify.

---

## WHAT THIS PROJECT IS

**TechBlitz Judge** is a real-time multi-lab hackathon platform.

### Physical Venues
| Venue | Type | Domain |
|-------|------|--------|
| 114A | lab | Agentic AI |
| 114B | lab | Agentic AI |
| 308A | lab | UI/UX Challenge |
| 308B | lab | UI/UX Challenge |
| 220  | lab | Vibecoding |
| 221  | lab | Vibecoding |
| 222  | lab | Vibecoding |
| Seminar Hall | seminar_hall | Finals (all domains) |

### Competition Domains
1. Agentic AI
2. UI/UX Challenge
3. Vibecoding

### Default Credentials (from seed.ts)
| Username | Role | Password |
|----------|------|----------|
| judge114a → judge222 | lab_round | NSDC@JUDGE |
| judgeseminar | seminar_hall | NSDC@JUDGE |
| JUDGETECHBLITZ | admin | NSDC@JUDGE |

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix UI) |
| Database | MongoDB + Mongoose 9.2.4 |
| Auth | jsonwebtoken + bcryptjs (cost 12) |
| Validation | Zod |
| Real-time | Socket.io + socket.io-client |
| State | @tanstack/react-query |
| Forms | react-hook-form |
| Cache | In-memory Map + TTL (NO Redis) |
| Animations | framer-motion |
| Charts | recharts |

---

## EXACT FOLDER STRUCTURE (reference this, do not change it)

```
judge/
├── seed.ts
├── src/
│   ├── app/
│   │   ├── judge/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── evaluate/[teamId]/page.tsx
│   │   │   ├── lab/[labId]/page.tsx
│   │   │   ├── leaderboard/page.tsx
│   │   │   └── seminar-hall/page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx               (admin login)
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── teams/page.tsx
│   │   │   ├── judges/page.tsx
│   │   │   ├── competition/page.tsx
│   │   │   ├── seminar-hall/page.tsx
│   │   │   ├── attendance/page.tsx
│   │   │   └── certificates/page.tsx
│   │   ├── certificates/page.tsx
│   │   └── api/
│   │       ├── auth/login + logout
│   │       ├── judge/login, logout, teams, scores, seminar-hall/*
│   │       ├── admin/teams, judges, competition, attendance,
│   │       │         seminar-hall, cache, certificates
│   │       ├── leaderboards/[domainId]/[round], finals/[domainId], finals/all
│   │       ├── competition/status
│   │       ├── domains/
│   │       ├── labs/
│   │       ├── teams/
│   │       ├── certificates/search + generate
│   │       └── internal/certificates/generate
│   ├── components/
│   │   ├── ComicUI.tsx
│   │   ├── Layout.tsx
│   │   └── ui/
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-teams.ts
│   │   ├── use-cache-clear.ts
│   │   ├── use-toast.ts
│   │   └── use-mobile.tsx
│   ├── lib/
│   │   ├── mongodb.ts
│   │   ├── auth.ts
│   │   ├── leaderboard.ts
│   │   ├── cache.ts
│   │   ├── competition-cache.ts
│   │   ├── websocket.ts
│   │   ├── rate-limit.ts
│   │   ├── cache-clear.ts
│   │   ├── certificates.ts
│   │   ├── queryClient.ts
│   │   ├── utils.ts
│   │   └── middleware/auth.ts
│   ├── models/
│   │   ├── index.ts
│   │   ├── Lab.ts
│   │   ├── Domain.ts
│   │   ├── Team.ts
│   │   ├── Judge.ts
│   │   ├── Score.ts
│   │   ├── Competition.ts
│   │   ├── CertificateConfig.ts
│   │   └── CertificateAuditLog.ts
│   └── types/
│       └── competition.ts
```

---

## DATABASE SCHEMAS — SINGLE SOURCE OF TRUTH

Every file in this codebase must use these exact field names.
If any file uses different names → fix that file. Never change the schema.

```typescript
// ─── Lab ───────────────────────────────────────────────────────
{
  name: String,               // "114A" | "114B" | "308A" | "308B" | "220" | "221" | "222" | "Seminar Hall"
  location: String,
  type: 'lab' | 'seminar_hall',
  capacity: Number,
  assignedDomain: ObjectId → Domain,  // lab's primary domain (except Seminar Hall)
  isActive: Boolean
}

// ─── Domain ────────────────────────────────────────────────────
{
  name: String,               // "Agentic AI" | "UI/UX Challenge" | "Vibecoding"
  description: String,
  scoringCriteria: [String],
  isActive: Boolean
}

// ─── Team ──────────────────────────────────────────────────────
{
  name: String,
  labId: ObjectId → Lab,
  domainId: ObjectId → Domain,
  problemStatement: String,
  githubRepo: String,
  figmaLink: String,
  members: [{
    name: String,
    email: String,
    role: 'leader' | 'member',
    attended: Boolean          // default: false — set during attendance marking
  }],
  currentScore: Number,        // default: 0
  rank: Number,
  qualifiedForFinals: Boolean, // default: false — set during round transition
  finalVenueId: ObjectId → Lab,// default: null — set to Seminar Hall on transition
  finalScore: Number,          // default: null
  isActive: Boolean
}

// ─── Judge ─────────────────────────────────────────────────────
{
  name: String,
  email: String,
  passwordHash: String,        // NEVER include in any API response
  assignedLabId: ObjectId → Lab,
  assignedDomains: [ObjectId → Domain],
  role: 'lab_round' | 'seminar_hall' | 'admin',
  isActive: Boolean,
  lastLoginAt: Date
}

// ─── Score ─────────────────────────────────────────────────────
{
  teamId: ObjectId → Team,
  judgeId: ObjectId → Judge,
  domainId: ObjectId → Domain,
  venueId: ObjectId → Lab,     // ALWAYS SET — never null, never undefined
  round: 'lab_round' | 'finals',
  marks: Number,               // 0–100
  criteria: [{ name: String, marks: Number }],
  feedback: String,
  submittedAt: Date
}
// UNIQUE CONSTRAINT: one score per (judgeId + teamId + domainId + round)

// ─── Competition ───────────────────────────────────────────────
{
  name: String,                // "TechBlitz 2026"
  currentRound: 'lab_round' | 'finals',
  seminarHallId: ObjectId → Lab,
  qualifiedTeamsPerDomain: Number,  // default: 5
  labRoundStartTime: Date,
  labRoundEndTime: Date,
  finalsStartTime: Date,
  finalsEndTime: Date,
  isActive: Boolean
}

// ─── CertificateConfig ─────────────────────────────────────────
{
  templateImagePath: String,
  nameX: Number, nameY: Number, nameSize: Number, nameColor: String,
  teamX: Number, teamY: Number, teamSize: Number, teamColor: String
}

// ─── CertificateAuditLog ───────────────────────────────────────
{
  endpoint: String,
  actor: String,
  teamName: String,
  sessionKey: String,
  requestedByIp: String,
  generatedCount: Number,
  success: Boolean,
  errorMessage: String,
  generatedAt: Date
}
```

---

## THE CORRECT COMPETITION FLOW
### This is the canonical sequence. Every file must support exactly this.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — DATABASE SEED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
npm run seed creates:
  - 8 Lab documents (114A, 114B, 308A, 308B, 220, 221, 222, Seminar Hall)
    each with assignedDomain set where applicable
  - 3 Domain documents (Agentic AI, UI/UX Challenge, Vibecoding)
  - 9 Judge documents with correct assignedLabId and assignedDomains
  - 1 Competition document (currentRound: 'lab_round', isActive: true)

Verify seed worked:
  GET /api/labs       → returns 8 labs
  GET /api/domains    → returns 3 domains

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — TEAM REGISTRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Students self-register at /register (hidden route)

  Input: teamName, members[], domain, lab
  Creates: Team { name, labId, domainId, members, qualifiedForFinals: false }

  After register:
    → Team appears in admin /admin/attendance panel
    → Team appears in judge dashboard for that lab's judge
    → GET /api/labs returns correct lab options
    → GET /api/domains returns correct domain options

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — JUDGE LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Judge navigates to /judge (hidden — not in navbar)

  POST /api/judge/login
  Body: { email: "judge114a", password: "NSDC@JUDGE" }

  Server:
    1. Find judge by email in DB
    2. bcrypt.compare(password, judge.passwordHash)
    3. Issue JWT:
       {
         userId: judge._id,
         role: judge.role,                    // 'lab_round'
         labId: judge.assignedLabId,          // Lab ObjectId as string
         assignedDomains: judge.assignedDomains.map(d => d.toString()),
         judgeRole: judge.role,
         isSeminarHallJudge: judge.role === 'seminar_hall',
         exp: now + 3600
       }
    4. Return: { success: true, token, judge: { id, name, email, role, assignedLabId } }
       (NEVER include passwordHash)

  Frontend:
    - Stores token in localStorage as 'judgeToken'
    - Redirects to /judge/dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — JUDGE SEES THEIR TEAMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Judge dashboard loads at /judge/dashboard

  GET /api/judge/teams
  Headers: { Authorization: "Bearer <token>" }

  Server:
    1. Extract + verify JWT from Authorization header
    2. Get judge from DB: Judge.findById(userId).populate('assignedLabId').populate('assignedDomains')
    3. If role === 'lab_round':
       teams = Team.find({ labId: new Types.ObjectId(judge.assignedLabId) })
                   .populate('labId', 'name type')
                   .populate('domainId', 'name scoringCriteria')
                   .lean()
    4. For each team: check if this judge already scored it
       const existingScore = await Score.findOne({
         judgeId: judge._id,
         teamId: team._id,
         round: 'lab_round'
       })
       Add hasScored: !!existingScore to each team object
    5. Return: { success: true, data: { teams, lab, judge } }

  Frontend:
    - Shows list of teams with name, members count, domain, current score
    - Each team has "Score Team" button
    - Teams already scored show "Edit Score" + the existing marks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — JUDGE SUBMITS SCORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Judge navigates to /judge/evaluate/[teamId] or opens inline form

  POST /api/judge/scores
  Headers: { Authorization: "Bearer <token>", Content-Type: "application/json" }
  Body: { teamId, marks, feedback, round: "lab_round", criteria: [] }

  Server validates ALL of these before saving:
    ✓ JWT valid and not expired
    ✓ judge.role === 'lab_round'
    ✓ team.labId.toString() === judge.assignedLabId.toString()
    ✓ competition.currentRound === 'lab_round'
    ✓ marks is number 0–100
    ✓ teamId is valid ObjectId

  Server saves (upsert — one score per judge+team+round):
    Score.findOneAndUpdate(
      { judgeId: judge._id, teamId, round: 'lab_round' },
      {
        $set: {
          marks, feedback, criteria,
          domainId: team.domainId,          // from team document
          venueId: judge.assignedLabId,      // CRITICAL — always set this
          submittedAt: new Date()
        }
      },
      { upsert: true, new: true }
    )

  After save:
    1. LeaderboardService.invalidateLeaderboard(domainId, 'lab_round')
       → delete cache key: `leaderboard:${domainId}:lab_round`
    2. Recalculate leaderboard via aggregation (cast domainId to ObjectId)
    3. Store fresh result in cache
    4. Queue score update for WebSocket: CompetitionCacheService.queueScoreUpdate(...)
    5. Return: { success: true, data: { score, leaderboard } }

  Frontend:
    - Shows success toast: "Score submitted!"
    - Updates that team's score display immediately
    - Re-fetches team list to update hasScored flags

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — LIVE LEADERBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Public leaderboard (no auth)

  GET /api/leaderboards/:domainId/lab_round

  Server:
    1. Check cache: `leaderboard:${domainId}:lab_round`
    2. On miss — run aggregation:
       Score.aggregate([
         { $match: {
             domainId: new Types.ObjectId(domainId),  // CAST — not string
             round: 'lab_round'
         }},
         { $lookup: { from: 'teams', localField: 'teamId',
                      foreignField: '_id', as: 'team' }},
         { $unwind: '$team' },
         { $group: {
             _id: '$teamId',
             teamName: { $first: '$team.name' },
             totalScore: { $sum: '$marks' },
             judgeCount: { $sum: 1 },
             lastUpdated: { $max: '$submittedAt' }
         }},
         { $sort: { totalScore: -1 } }
       ])
    3. Map results to add rank: 1, 2, 3...
    4. Store in cache (TTL: 30 min)
    5. Return: { success: true, data: { leaderboard, domain, round } }

  WebSocket:
    - Client subscribes: socket.emit('join_leaderboard', `leaderboard:${domainId}:lab_round`)
    - Server broadcasts every 5 seconds from score queue:
      io.to(room).emit('leaderboard_update', { domainId, round, leaderboard })

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — ADMIN TRIGGERS ROUND TRANSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin navigates to /admin/competition and clicks "Start Finals"

  POST /api/admin/competition/transition
  Body: { qualifiedPerDomain: 5 }  (optional, defaults to 5)

  Server executes IN THIS ORDER:
    1. const seminarHall = await Lab.findOne({ type: 'seminar_hall' })
       → if not found: return 400 "Seminar Hall venue not found"

    2. const domains = await Domain.find({ isActive: true })

    3. For each domain:
       const top5 = await Score.aggregate([
         { $match: { domainId: domain._id, round: 'lab_round' }},
         { $group: { _id: '$teamId', totalScore: { $sum: '$marks' }}},
         { $sort: { totalScore: -1 }},
         { $limit: qualifiedPerDomain }
       ])
       → collect all qualifying team IDs

    4. await Team.updateMany(
         { _id: { $in: allQualifyingIds }},
         { $set: { qualifiedForFinals: true, finalVenueId: seminarHall._id }}
       )

    5. await Competition.findOneAndUpdate(
         { isActive: true },
         { $set: {
             currentRound: 'finals',
             seminarHallId: seminarHall._id,
             labRoundEndTime: new Date(),
             finalsStartTime: new Date()
           }}
       )

    6. CacheService.clearPattern('leaderboard:*')
       CacheService.clearPattern('seminar_hall:*')

    7. io.emit('round_transition', {
         round: 'finals',
         qualifiedTeams: [...],
         timestamp: new Date().toISOString()
       })

    8. Return: { success: true, data: { qualifiedTeams, count, seminarHall }}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8 — SEMINAR HALL FINALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Seminar Hall judge logs in → goes to /judge/seminar-hall

  GET /api/judge/seminar-hall/teams

  Server:
    1. Verify JWT, confirm role === 'seminar_hall'
    2. const seminarHall = await Lab.findOne({ type: 'seminar_hall' })
    3. teams = await Team.find({
         qualifiedForFinals: true,
         finalVenueId: seminarHall._id,
         domainId: { $in: judge.assignedDomains }
       })
       .populate('labId', 'name')
       .populate('domainId', 'name scoringCriteria')
       .lean()
    4. Group teams by domain
    5. For each team: add hasScored flag (check existing finals score)
    6. Return teams grouped: { domains: [{ domainName, teams: [...] }] }

  POST /api/judge/seminar-hall/scores
    Validates:
      ✓ judge.role === 'seminar_hall'
      ✓ team.qualifiedForFinals === true
      ✓ team.finalVenueId.toString() === seminarHall._id.toString()
      ✓ judge.assignedDomains includes team.domainId
      ✓ competition.currentRound === 'finals'
    Saves: Score with venueId = seminarHall._id, round = 'finals'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 9 — FINALS LEADERBOARD (BIG SCREEN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route: /seminar/leaderboard (fullscreen — no navbar)

  3 domain columns, top 5 per domain, live via Socket.io
  Trophy icons for ranks 1/2/3
  Overall top 5 below columns
  Dark theme, large fonts — designed for projector display

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 10 — ATTENDANCE + CERTIFICATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin marks attendance at /admin/attendance
  → Sets member.attended = true on Team.members[]

Student visits /certificates
  → Enters team name
  → Sees only members where attended === true
  → Downloads certificate per attended member
  → Certificate format: "MEMBER NAME (TEAM NAME)"
  → Uses X/Y/size/color from CertificateConfig
  → Generation logged in CertificateAuditLog
```

---

## PHASE 1 — FULL CODEBASE AUDIT

### Before writing a single line of code, read every file and answer:

For every file in `src/`:
1. Is it imported or referenced anywhere? → If NO: mark DEAD
2. Do its DB queries use the correct field names from the schemas above? → If NO: mark BROKEN
3. Do its fetch/API calls point to routes that actually exist? → If NO: mark BROKEN
4. Does it correctly handle the data it receives (no silent failures)? → If NO: mark BROKEN
5. Is it duplicate logic that already exists in a lib/ service? → If YES: mark REDUNDANT

### Output this triage table before touching any code:

| File | Status | Action | Root Cause |
|------|--------|--------|------------|
| src/app/api/judge/teams/route.ts | BROKEN | REWRITE | Team.find({ lab: ... }) — wrong field |
| src/lib/leaderboard.ts | BROKEN | FIX | $match uses string domainId not ObjectId |
| src/app/judge/dashboard/page.tsx | BROKEN | FIX | fetch missing Authorization header |
| src/app/api/old-debug/route.ts | DEAD | DELETE | nothing imports this |

**Do not start fixing until the complete triage table is done.**

---

## PHASE 2 — DELETE DEAD CODE

Remove every file matching any of these:
- Not imported anywhere in the project
- Duplicate of another file that does the same thing
- Old test or debug route not in the official route list
- Commented-out page replaced by a newer one

Output each deletion:
```
DELETED: src/app/api/debug-scores/route.ts
REASON: not in route spec, nothing calls it
```

---

## PHASE 3 — THE BROKEN PATTERNS (find and fix every occurrence)

### Pattern A — Wrong field names (grep the entire codebase)

```typescript
// ❌ WRONG — these fields do not exist in the schemas
Team.find({ lab: x })
Team.find({ domain: x })
team.qualified
team.finalVenue
team.venue
score.venue
score.roundType
score.round_type
judge.lab
judge.domains
judge.domainList

// ✅ CORRECT
Team.find({ labId: new Types.ObjectId(x) })
Team.find({ domainId: new Types.ObjectId(x) })
team.qualifiedForFinals
team.finalVenueId
score.venueId
score.round
judge.assignedLabId
judge.assignedDomains
```

### Pattern B — Missing or broken .populate() calls

```typescript
// ❌ WRONG — returns ObjectIds, UI shows blank or [object Object]
const teams = await Team.find({ labId });
const judge = await Judge.findById(id);
const scores = await Score.find({ round: 'lab_round' });

// ✅ CORRECT — always populate what the frontend needs
const teams = await Team.find({ labId: new Types.ObjectId(labId) })
  .populate('labId', 'name type assignedDomain')
  .populate('domainId', 'name scoringCriteria')
  .lean();

const judge = await Judge.findById(id)
  .populate('assignedLabId', 'name type')
  .populate('assignedDomains', 'name')
  .select('-passwordHash')
  .lean();

const scores = await Score.find({ round: 'lab_round' })
  .populate('teamId', 'name members')
  .populate('judgeId', 'name email role')
  .populate('domainId', 'name')
  .populate('venueId', 'name type')
  .lean();
```

### Pattern C — String vs ObjectId in aggregation pipelines (most critical bug)

```typescript
// ❌ WRONG — string vs ObjectId ALWAYS returns 0 results
{ $match: { domainId: domainId } }
{ $match: { domainId: req.params.domainId } }
{ $match: { venueId: venueId } }

// ✅ CORRECT — ALWAYS cast in aggregation $match
import { Types } from 'mongoose';
{ $match: { domainId: new Types.ObjectId(domainId) } }
{ $match: { venueId: new Types.ObjectId(venueId) } }
{ $match: { teamId: new Types.ObjectId(teamId) } }
{ $match: { labId: new Types.ObjectId(labId) } }

// Apply to ALL aggregation $match stages in: leaderboard.ts,
// competition-cache.ts, and every /api/leaderboards/* route
```

### Pattern D — venueId never set on Score creation

```typescript
// ❌ WRONG — venueId missing → aggregation finds 0 scores → empty leaderboard
const score = new Score({ teamId, judgeId, domainId, round, marks });
await Score.findOneAndUpdate(
  { judgeId, teamId, round },
  { $set: { marks, feedback } },   // venueId not set
  { upsert: true }
);

// ✅ CORRECT — venueId is REQUIRED, set it from context
// Lab round:
await Score.findOneAndUpdate(
  { judgeId: judge._id, teamId: new Types.ObjectId(teamId), round: 'lab_round' },
  { $set: {
      marks, feedback, criteria,
      domainId: team.domainId,
      venueId: judge.assignedLabId,   // ← judge's lab
      submittedAt: new Date()
  }},
  { upsert: true, new: true }
);

// Finals:
const seminarHall = await Lab.findOne({ type: 'seminar_hall' });
await Score.findOneAndUpdate(
  { judgeId: judge._id, teamId: new Types.ObjectId(teamId), round: 'finals' },
  { $set: {
      marks, feedback, criteria,
      domainId: team.domainId,
      venueId: seminarHall._id,       // ← seminar hall
      submittedAt: new Date()
  }},
  { upsert: true, new: true }
);
```

### Pattern E — Frontend not sending Authorization header

```typescript
// ❌ WRONG — all protected requests return 401, frontend shows empty data
const res = await fetch('/api/judge/teams');
const res = await fetch('/api/judge/scores', { method: 'POST', body: ... });

// ✅ CORRECT — always read token and attach header
const token = localStorage.getItem('judgeToken');
if (!token) { router.push('/judge'); return; }

const res = await fetch('/api/judge/teams', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const res = await fetch('/api/judge/scores', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ teamId, marks, feedback, round: 'lab_round', criteria })
});
```

### Pattern F — Silent error swallowing (submit does nothing, no feedback)

```typescript
// ❌ WRONG — error happens but user sees nothing
const res = await fetch('/api/judge/scores', { method: 'POST', ... });
const data = await res.json();
setScore(data);  // if res is 401 or 500, this silently fails

// ✅ CORRECT — always check res.ok and show feedback
try {
  const res = await fetch('/api/judge/scores', { method: 'POST', ... });
  const data = await res.json();

  if (!res.ok) {
    toast.error(data.error || `Error ${res.status}: Failed to submit score`);
    return;
  }

  toast.success('Score submitted successfully!');
  // re-fetch teams to update hasScored state
  queryClient.invalidateQueries(['judge-teams']);
} catch (err) {
  toast.error('Network error — please try again');
}
```

### Pattern G — Cache returning stale empty data

```typescript
// ❌ WRONG — cache never invalidated after score write
async function submitScore(...) {
  await Score.create({ ... });
  // no cache invalidation
  return score;
}

// ✅ CORRECT — invalidate on EVERY score write
async function submitScore(...) {
  const score = await Score.findOneAndUpdate(..., { upsert: true });

  // Invalidate the specific leaderboard
  const cacheKey = `leaderboard:${domainId}:${round}`;
  cacheService.delete(cacheKey);

  // Also clear finals cache if relevant
  if (round === 'finals') {
    cacheService.delete(`leaderboard:${domainId}:finals:seminar_hall`);
  }

  return score;
}
```

### Pattern H — JWT middleware not extracting token correctly

```typescript
// ❌ WRONG — token not found → all judge routes return 401
const token = req.headers['authorization'];           // might be undefined
const token = req.headers.authorization.split(' ')[1]; // crashes if undefined

// ✅ CORRECT — handle both header and cookie, fail gracefully
export function extractToken(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // Try cookie fallback
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/accessToken=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

export async function verifyJWT(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch {
    return null;
  }
}
```

### Pattern I — MongoDB connection not awaited before queries

```typescript
// ❌ WRONG — query runs before connection is ready → returns nothing
export async function GET(req: Request) {
  const teams = await Team.find({});  // mongoose not connected yet
  return Response.json({ teams });
}

// ✅ CORRECT — always call connectDB first in every route handler
import { connectDB } from '@/lib/mongodb';

export async function GET(req: Request) {
  await connectDB();  // ← this line in EVERY route handler
  const teams = await Team.find({});
  return Response.json({ success: true, data: teams });
}
```

### Pattern J — Leaderboard aggregation missing team info

```typescript
// ❌ WRONG — aggregation returns only scores, no team names
Score.aggregate([
  { $match: { domainId: new Types.ObjectId(domainId), round: 'lab_round' }},
  { $group: { _id: '$teamId', totalScore: { $sum: '$marks' }}}
])
// result: [{ _id: ObjectId, totalScore: 85 }]
// frontend shows ObjectId instead of team name

// ✅ CORRECT — $lookup to get team details
Score.aggregate([
  { $match: { domainId: new Types.ObjectId(domainId), round: 'lab_round' }},
  {
    $lookup: {
      from: 'teams',
      localField: 'teamId',
      foreignField: '_id',
      as: 'team'
    }
  },
  { $unwind: '$team' },
  {
    $group: {
      _id: '$teamId',
      teamName: { $first: '$team.name' },
      labId: { $first: '$team.labId' },
      domainId: { $first: '$team.domainId' },
      totalScore: { $sum: '$marks' },
      judgeCount: { $sum: 1 },
      lastUpdated: { $max: '$submittedAt' }
    }
  },
  { $sort: { totalScore: -1 }}
]).then(results => results.map((r, i) => ({ ...r, rank: i + 1 })))
```

---

## PHASE 4 — FIX IN THIS EXACT ORDER

Do not skip ahead. Each section depends on the previous one being correct.

```
A. src/models/*          — fix all field names, enums, indexes
B. src/lib/mongodb.ts    — confirm connection singleton works
C. src/lib/middleware/auth.ts — fix token extraction (Pattern H)
D. src/lib/auth.ts       — JWT sign/verify, judge CRUD
E. src/lib/leaderboard.ts — aggregation ObjectId casting (Pattern C + J)
F. src/lib/cache.ts      — confirm TTL and invalidation work
G. src/lib/competition-cache.ts — score queue, WebSocket prep
H. src/lib/websocket.ts  — room names, emit events
I. API: /api/judge/login — JWT payload shape
J. API: /api/judge/teams — labId query, populate, hasScored
K. API: /api/judge/scores — venueId, upsert, cache invalidation, socket emit
L. API: /api/judge/seminar-hall/* — qualification filter
M. API: /api/leaderboards/* — aggregation, cache, ObjectId cast
N. API: /api/admin/* — transition logic, team/judge CRUD
O. API: /api/certificates/* — team search, generation, audit log
P. Frontend: /judge/* — auth header on all fetches, error handling
Q. Frontend: /admin/* — fetch URLs, response parsing
R. Frontend: leaderboard pages — Socket.io subscriptions, data mapping
S. seed.ts — confirm seed creates correct data with all required fields
```

---

## PHASE 5 — STANDARD PATTERNS TO ENFORCE EVERYWHERE

### Every API route file must follow this pattern:

```typescript
import { connectDB } from '@/lib/mongodb';
import { verifyJWT } from '@/lib/middleware/auth';

export async function GET(req: Request) {
  try {
    await connectDB();                          // 1. always connect first

    const token = extractToken(req);            // 2. extract token if needed
    if (!token) return Response.json(           // 3. fail fast with clear error
      { success: false, error: 'Unauthorized' }, { status: 401 }
    );

    const payload = await verifyJWT(token);
    if (!payload) return Response.json(
      { success: false, error: 'Invalid or expired token' }, { status: 401 }
    );

    // ... business logic ...

    return Response.json({ success: true, data: result });   // 4. consistent response shape

  } catch (error) {
    console.error('[route name] error:', error);             // 5. always log errors
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Every API response must use this shape:

```typescript
// Success
{ success: true, data: <any> }

// Error
{ success: false, error: "human readable message" }

// Never return raw Mongoose documents — always .lean()
// Never include passwordHash in any response
```

### WebSocket room naming (must be consistent across server and client):

```typescript
// Room names
`leaderboard:${domainId}:lab_round`
`leaderboard:${domainId}:finals`

// Server side — after score saved:
io.to(`leaderboard:${domainId}:lab_round`).emit('leaderboard_update', {
  domainId, round: 'lab_round', leaderboard, timestamp: new Date().toISOString()
});

// Client side — on mount:
socket.emit('join_leaderboard', `leaderboard:${domainId}:lab_round`);
socket.on('leaderboard_update', (data) => {
  if (data.domainId === domainId) setLeaderboard(data.leaderboard);
});
```

---

## PHASE 6 — VERIFY THE COMPLETE FLOW

Run through every checkpoint in order. Fix before continuing if any fails.

```
SEED & SETUP
[ ] npm run seed runs without errors
[ ] GET /api/labs returns 8 venues including "Seminar Hall" (type: seminar_hall)
[ ] GET /api/domains returns 3 domains (Agentic AI, UI/UX Challenge, Vibecoding)
[ ] GET /api/competition/status returns active competition with round: 'lab_round'

TEAM REGISTRATION
[ ] Team registers → created in DB with correct labId and domainId (not null)
[ ] Team appears in GET /api/admin/teams immediately
[ ] Team appears in judge dashboard for that lab

JUDGE LOGIN & TEAM VISIBILITY  ← MOST BROKEN AREA
[ ] POST /api/judge/login with { email: "judge114a", password: "NSDC@JUDGE" }
    → returns { success: true, token: "..." }
    → token contains labId in payload

[ ] GET /api/judge/teams with Authorization: Bearer <token>
    → returns teams (NOT empty array)
    → each team has populated domainId.name (not ObjectId string)
    → each team has hasScored: false initially
    ↳ IF EMPTY: Pattern A, B, C, H, or I is still broken — go back

SCORE SUBMISSION  ← SECOND MOST BROKEN AREA
[ ] POST /api/judge/scores with valid body + auth header
    → returns { success: true, data: { score } }
    → Score document saved in DB with venueId SET (not null)
    → hasScored flips to true on team list
    ↳ IF NOTHING HAPPENS: Pattern D, E, F, or G is still broken — go back

LEADERBOARD  ← THIRD MOST BROKEN AREA
[ ] GET /api/leaderboards/:domainId/lab_round
    → returns teams with scores (NOT empty array)
    → each entry has: rank, teamName, totalScore (not ObjectId)
    ↳ IF EMPTY: Pattern C (ObjectId cast) or D (venueId) is still broken — go back

[ ] Submit another score → leaderboard updates within 5 seconds via WebSocket
[ ] Cache is invalidated after score write (no stale data)

ADMIN FLOW
[ ] Admin logs in → /admin/dashboard shows real data (no empty panels, no ObjectIds)
[ ] All teams show with names, domains, labs populated
[ ] POST /api/admin/competition/transition
    → 15 teams (5 per domain) get qualifiedForFinals: true
    → competition.currentRound === 'finals' in DB
    → WebSocket 'round_transition' event received by connected clients

SEMINAR HALL FINALS
[ ] Seminar Hall judge logs in → dashboard shows exactly 15 qualifying teams
[ ] Teams grouped by domain (3 groups of 5)
[ ] Seminar Hall judge submits score → finals leaderboard updates
[ ] /seminar/leaderboard shows top 5 per domain + overall in fullscreen

ATTENDANCE & CERTIFICATES
[ ] Admin marks member.attended = true in /admin/attendance
[ ] GET /api/certificates/search?q=teamName finds the team
[ ] Certificate generated for attended members only
[ ] AuditLog entry created in CertificateAuditLog collection
[ ] Name format on certificate: "MEMBER NAME (TEAM NAME)"
```

---

## PHASE 7 — OPTIMISATION (do this after everything works)

Once all bugs are fixed, apply these optimisations:

### 1. React Query for all data fetching
All frontend data fetches must use `useQuery` from `@tanstack/react-query`.
No raw `useState` + `useEffect` + `fetch` patterns.

```typescript
// ❌ WRONG — manual fetch
const [teams, setTeams] = useState([]);
useEffect(() => {
  fetch('/api/judge/teams').then(r => r.json()).then(d => setTeams(d.data.teams));
}, []);

// ✅ CORRECT — React Query with auth
const { data, isLoading, error } = useQuery({
  queryKey: ['judge-teams'],
  queryFn: async () => {
    const token = localStorage.getItem('judgeToken');
    const res = await fetch('/api/judge/teams', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch teams');
    const { data } = await res.json();
    return data.teams;
  }
});
```

### 2. Invalidate React Query cache after mutations
```typescript
const { mutate: submitScore } = useMutation({
  mutationFn: async (scoreData) => { /* POST /api/judge/scores */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['judge-teams'] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    toast.success('Score submitted!');
  },
  onError: (err) => toast.error(err.message)
});
```

### 3. MongoDB connection pooling
```typescript
// src/lib/mongodb.ts — singleton pattern
let cached: typeof mongoose | null = null;

export async function connectDB() {
  if (cached) return cached;
  cached = await mongoose.connect(process.env.MONGODB_URI!, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000
  });
  return cached;
}
```

### 4. Parallel DB queries where possible
```typescript
// ❌ WRONG — sequential, slow
const labs = await Lab.find({ isActive: true });
const domains = await Domain.find({ isActive: true });
const competition = await Competition.findOne({ isActive: true });

// ✅ CORRECT — parallel
const [labs, domains, competition] = await Promise.all([
  Lab.find({ isActive: true }).lean(),
  Domain.find({ isActive: true }).lean(),
  Competition.findOne({ isActive: true }).lean()
]);
```

### 5. Remove all console.log in production paths
Replace with structured logging:
```typescript
// ❌ console.log('[debug]', data)
// ✅ console.error('[api/judge/scores] Score save failed:', error.message)
```

---

## ABSOLUTE RULES

1. Never change collection names, route paths, or schema field names
2. Never add new npm packages — use only what is in package.json
3. Never touch .env or .env.local — only read process.env.VARIABLE_NAME
4. Never include passwordHash in any API response — always `.select('-passwordHash')`
5. Never use string comparison against ObjectId in aggregation $match — always cast
6. Never leave venueId unset when creating or upserting a Score
7. Never return raw Mongoose documents — always `.lean()` or `.toJSON()`
8. Always call `await connectDB()` at the top of every API route handler
9. Always send `Authorization: Bearer <token>` header from frontend on protected routes
10. Always show a toast on success AND on error — never let submissions disappear silently

---

## OUTPUT FORMAT

For every file you change or create:

```
════════════════════════════════════════════════════════
ACTION : REWRITE | FIX | CREATE | DELETE
FILE   : src/path/to/file.ts
REASON : exactly what was wrong / why it was dead
════════════════════════════════════════════════════════
[complete file content — no placeholders, no "// TODO"]
```

---

## START COMMAND

Begin your response with exactly this:

"I have read the complete TechBlitz Judge codebase. Here is my full triage table:"

[output complete triage table for every file in src/]

Then:

"Triage complete. Dead files being removed:"

[list all deletions]

Then:

"Beginning Phase 3: fixing broken patterns, then rebuilding section by section."

[fix everything in the Phase 4 order without stopping]

Do not stop until every Phase 6 checkpoint passes.