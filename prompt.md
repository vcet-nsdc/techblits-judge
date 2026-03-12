# BattleHack — Full Project Nuclear Fix

## SITUATION

The entire project is broken. Nothing works end-to-end.
There is dead code everywhere, mismatched DB calls, broken API routes,
and the admin, judge, and public portals are all disconnected from each other.

### CONFIRMED BROKEN FEATURES (reported by developer — fix these with highest priority)

---

**BUG 1: Judges cannot see any teams on their dashboard**

When a judge logs in, their team list is completely empty.
The judge is assigned to a lab but zero teams appear.

Investigate and fix ALL of these possible causes:
- The GET /api/judge/teams route is querying with the wrong field:
  ```typescript
  // BROKEN — 'lab' does not exist on Team schema
  Team.find({ lab: judge.assignedLabId })

  // FIXED
  Team.find({ labId: judge.assignedLabId })
  ```
- The labId comparison is string vs ObjectId — cast correctly:
  ```typescript
  Team.find({ labId: new Types.ObjectId(judge.assignedLabId) })
  ```
- The JWT token is not including labId in its payload — the route has nothing to filter by
- Teams were registered without a labId field set — they exist in DB but have labId=null
- The .populate() is failing silently and returning nothing
- The frontend is not sending the Authorization: Bearer <token> header with the request
- The frontend receives the data but maps it with wrong field names so nothing renders

Fix: The judge dashboard MUST show all teams where team.labId === judge.assignedLabId,
fully populated with team name, members, domain name, and current score.

---

**BUG 2: Judges can click the mark/score button but cannot submit marks**

The score form appears but submitting it does nothing.
No score is saved, no error is shown, no success message appears.

Investigate and fix ALL of these possible causes:
- The POST /api/judge/scores route does not exist or has a typo in the path
- The request body is missing required fields — the route validates and rejects silently:
  ```typescript
  // The body MUST include all of these:
  { teamId, marks, round: 'lab_round' }
  // The route adds: judgeId (from JWT), domainId (from team), venueId (from judge.assignedLabId)
  ```
- The frontend form is submitting to the wrong URL:
  ```typescript
  // BROKEN
  fetch('/api/scores', { method: 'POST', body: ... })
  fetch('/api/judge/score', { method: 'POST', body: ... })

  // FIXED
  fetch('/api/judge/scores', { method: 'POST', body: ... })
  ```
- The Authorization header is missing from the fetch call:
  ```typescript
  // BROKEN — no auth header
  fetch('/api/judge/scores', { method: 'POST', body: JSON.stringify(data) })

  // FIXED
  const token = localStorage.getItem('judgeToken'); // or however token is stored
  fetch('/api/judge/scores', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
  ```
- The route returns a 4xx/5xx error but the frontend has no .catch() or error display,
  so the judge sees nothing happen and thinks the button is broken
- The score IS being saved but the UI does not re-fetch or update after submission,
  so the judge thinks it failed
- The venueId is missing from the Score document — the save fails validation silently

Fix: Submitting marks MUST save a Score document, show a success confirmation to the
judge, update that team's displayed score on the judge's screen, and trigger a
leaderboard update via Socket.io.

---

**BUG 3: Public leaderboard shows nothing**

The leaderboard page loads but shows no teams, no scores, no rankings.

Investigate and fix ALL of these possible causes:
- The MongoDB aggregation uses string domainId instead of ObjectId:
  ```typescript
  // BROKEN — always returns 0 results
  { $match: { domainId: domainId, round: 'lab_round' } }

  // FIXED
  { $match: {
    domainId: new Types.ObjectId(domainId),
    round: 'lab_round'
  }}
  ```
- venueId was never saved on Score documents — the aggregation filters by venueId
  and finds nothing because all scores have venueId=null or undefined
- The leaderboard API route path does not match what the frontend is calling:
  ```typescript
  // Frontend calls:
  fetch(`/api/leaderboards/${domainId}/lab_round`)
  // But route file is at:
  /app/api/leaderboard/[domainId]/route.ts   // wrong — missing 'lab_round' segment
  ```
- The cache is returning an empty array that was cached on first load before
  any scores existed — and the cache is never invalidated after scores are submitted
- domainId being passed to the leaderboard page is undefined or null because the
  Domain documents don't exist in the DB yet (missing seed data)
- The frontend receives the data correctly but maps wrong field names:
  ```typescript
  // BROKEN — 'score' does not exist, field is 'totalScore'
  entry.score
  entry.team

  // FIXED
  entry.totalScore
  entry.teamName
  ```

Fix: The leaderboard MUST show teams ranked by total marks for each domain,
updating in real-time via Socket.io as judges submit scores.

---

## THE CORRECT COMPETITION FLOW
### This is the single source of truth. Every feature must support this exact flow.

```
STEP 1 — PARTICIPANT REGISTRATION
  Participant visits registration page (hidden route — not in navbar)
  Enters: Team Name, Member Names, Domain (AI/ML / Web Dev / Data Science), Lab Number
  → Creates Team document: { name, labId, domainId, members, qualifiedForFinals: false }
  → Team immediately visible in admin attendance panel
  ↓

STEP 2 — LAB ROUND JUDGING
  Judge logs in at /judge with email + password
  → JWT issued with: { userId, role, labId: judge.assignedLabId, judgeRole: 'lab_round' }
  Judge dashboard loads → fetches GET /api/judge/teams
  → Returns ONLY teams where team.labId === judge.assignedLabId (populated with domain name)
  Judge clicks a team → score form expands inline or opens modal
  Judge enters marks (0–100) + optional feedback → clicks Submit
  → POST /api/judge/scores with { teamId, marks, feedback }
  → Server adds: judgeId (from JWT), domainId (from team), venueId=judge.assignedLabId,
    round='lab_round'
  → Score saved → cache invalidated → Socket.io emits leaderboard update
  Judge sees: success toast + that team's score updates on their screen
  ↓

STEP 3 — LIVE LEADERBOARD UPDATES (Lab Round)
  Public /leaderboard page shows 3 domain tabs
  Each tab: teams ranked by total marks, highest first
  Every time a judge submits a score → leaderboard updates live via WebSocket
  No page refresh needed
  ↓

STEP 4 — ADMIN TRIGGERS FINALS
  Admin at /admin/competition clicks "Trigger Finals"
  → Server finds TOP 5 teams per domain from lab_round Score aggregation
  → Updates those 15 teams: qualifiedForFinals=true, finalVenueId=SeminarHall._id
  → Updates competition: currentRound='finals'
  → Clears all leaderboard cache
  → Emits 'round_transition' WebSocket event to all clients
  Public leaderboard shows banner: "Finals have started"
  ↓

STEP 5 — SEMINAR HALL FINALS JUDGING
  Seminar Hall judge logs in at /judge
  → JWT issued with: { role, judgeRole: 'seminar_hall', assignedDomains: [...] }
  Judge dashboard shows: only top 5 qualifying teams from their assigned domain(s)
  → Query: Team.find({ qualifiedForFinals: true, finalVenueId: SeminarHall._id,
                        domainId: { $in: judge.assignedDomains } })
  Judge scores each team → POST /api/judge/seminar-hall/scores
  → Score saved with: venueId=SeminarHall._id, round='finals'
  ↓

STEP 6 — FINALS LEADERBOARD (Big Screen)
  /seminar/leaderboard — fullscreen, no navbar
  3 domain columns side by side, each showing top 5 teams with rank + score
  Auto-refreshes via Socket.io as finals scores come in
  Designed to be projected on the seminar hall screen during the event
```

---

## YOUR MISSION

Do not patch. Do not band-aid.
**Rebuild every broken file cleanly from scratch while keeping the folder structure.**

Rules:
- DELETE any file that is dead, unused, or duplicated
- REWRITE any file that has broken logic, wrong DB calls, or stale data
- KEEP the folder structure and route names intact
- KEEP any file that is genuinely working (confirm before touching it)
- After every file, the system must be closer to fully working — not further

---

## STEP 1 — BEFORE YOU WRITE A SINGLE LINE OF CODE

Read the ENTIRE codebase first. Go through every single file:

For each file answer these 4 questions:
1. Is this file actually being used anywhere? (if NO → DELETE IT)
2. Does this file's DB calls match the actual Mongoose schema? (if NO → REWRITE)
3. Does this file's API calls point to routes that actually exist? (if NO → FIX)
4. Does this file correctly handle the data it receives? (if NO → FIX)

Output a TRIAGE TABLE before writing any code:

| File | Status | Action | Reason |
|------|--------|--------|--------|
| /app/api/judge/scores/route.ts | BROKEN | REWRITE | venueId never set, wrong round enum |
| /app/admin/dashboard/page.tsx | BROKEN | REWRITE | fetching /api/admin/leaderboard which doesnt exist |
| /lib/cache.ts | WORKING | KEEP | cache logic is correct |
| /app/api/old-test/route.ts | DEAD | DELETE | nothing imports this |

Fill this table for EVERY file in the project.
Do not skip any file.
Do not start fixing until the full triage table is complete.

---

## STEP 2 — DELETE ALL DEAD CODE

Remove every file that is:
- Not imported or referenced anywhere
- A duplicate of another file
- A leftover test, seed experiment, or debug route
- A commented-out page that was replaced

List every deleted file clearly:
```
DELETED: /app/api/test-score/route.ts — reason: unused, replaced by /api/judge/scores
DELETED: /components/OldLeaderboard.tsx — reason: replaced by /components/Leaderboard.tsx
```

---

## STEP 3 — THE SINGLE SOURCE OF TRUTH

Everything in this project must be built around these exact schemas.
If ANY file uses different field names, fix that file — do NOT change the schema.

### MongoDB Schemas (do not change these)

```typescript
// Lab
{
  name: String,           // "114A" | "114B" | "308A" | "308B" | "220" | "221" | "222" | "Seminar Hall"
  type: 'lab' | 'seminar_hall',
  capacity: Number,
  isActive: Boolean
}

// Domain
{
  name: String,           // "AI/ML" | "Web Development" | "Data Science"
  description: String,
  scoringCriteria: [String],
  isActive: Boolean
}

// Team
{
  name: String,
  labId: ObjectId → Lab,
  domainId: ObjectId → Domain,
  members: [{ name, email, role: 'leader'|'member' }],
  currentScore: Number,
  rank: Number,
  qualifiedForFinals: Boolean,   // default: false
  finalVenueId: ObjectId → Lab,  // set on transition, default: null
  finalScore: Number,            // default: null
  isActive: Boolean
}

// Judge
{
  name: String,
  email: String,
  passwordHash: String,
  assignedLabId: ObjectId → Lab,
  assignedDomains: [ObjectId → Domain],
  role: 'lab_round' | 'seminar_hall' | 'admin',
  isActive: Boolean,
  lastLoginAt: Date
}

// Score
{
  teamId: ObjectId → Team,
  judgeId: ObjectId → Judge,
  domainId: ObjectId → Domain,
  venueId: ObjectId → Lab,       // ALWAYS SET THIS — never null
  round: 'lab_round' | 'finals', // ONLY these two values, nothing else
  marks: Number,                 // 0–100
  criteria: [{ name, marks }],
  feedback: String
}

// Competition
{
  name: String,
  currentRound: 'lab_round' | 'finals',
  seminarHallId: ObjectId → Lab,
  qualifiedTeamsPerDomain: Number,  // default: 5
  labRoundStartTime: Date,
  labRoundEndTime: Date,
  finalsStartTime: Date,
  finalsEndTime: Date,
  isActive: Boolean
}

// CertificateConfig
{
  templateImagePath: String,
  nameX: Number, nameY: Number, nameSize: Number, nameColor: String,
  teamX: Number, teamY: Number, teamSize: Number, teamColor: String
}
```

---

## STEP 4 — FIX EVERY BROKEN PATTERN

These are the exact patterns that are breaking the project.
Find every occurrence of each one and fix it.

### Pattern 1: Wrong field names in queries
```typescript
// BROKEN — these field names do not exist in schema
Team.find({ lab: labId })
Team.find({ domain: domainId })
team.qualified
team.finalVenue
score.venue
score.roundType
judge.lab
judge.domains

// FIXED
Team.find({ labId: labId })
Team.find({ domainId: domainId })
team.qualifiedForFinals
team.finalVenueId
score.venueId
score.round
judge.assignedLabId
judge.assignedDomains
```

### Pattern 2: Missing .populate() on every team/score query
```typescript
// BROKEN — returns raw ObjectIds, UI shows "[object Object]" or blank
const teams = await Team.find({ labId });

// FIXED — always populate refs before sending to frontend
const teams = await Team.find({ labId })
  .populate('labId', 'name type')
  .populate('domainId', 'name');

// BROKEN — score with no context
const scores = await Score.find({ round: 'lab_round' });

// FIXED
const scores = await Score.find({ round: 'lab_round' })
  .populate('teamId', 'name members')
  .populate('judgeId', 'name email role')
  .populate('domainId', 'name')
  .populate('venueId', 'name type');
```

### Pattern 3: ObjectId string comparison in aggregations
```typescript
// BROKEN — string vs ObjectId mismatch → always returns 0 results
{ $match: { domainId: domainId } }

// FIXED — always cast to ObjectId in aggregation pipelines
import { Types } from 'mongoose';
{ $match: { domainId: new Types.ObjectId(domainId) } }

// Apply this fix to: domainId, venueId, teamId, labId, judgeId
// in EVERY aggregation pipeline in the project
```

### Pattern 4: venueId never set when creating Score
```typescript
// BROKEN — venueId is missing → leaderboard aggregation returns nothing
const score = new Score({ teamId, judgeId, domainId, round, marks });

// FIXED — always include venueId
// For lab round judge:
const score = new Score({
  teamId, judgeId,
  domainId: team.domainId,
  venueId: judge.assignedLabId,  // judge's lab
  round: 'lab_round',
  marks
});

// For seminar hall judge:
const seminarHall = await Lab.findOne({ type: 'seminar_hall' });
const score = new Score({
  teamId, judgeId,
  domainId: team.domainId,
  venueId: seminarHall._id,       // seminar hall
  round: 'finals',
  marks
});
```

### Pattern 5: Admin fetch URLs pointing to non-existent routes
```typescript
// BROKEN — these routes do not exist
fetch('/api/admin/leaderboard')
fetch('/api/admin/scores')
fetch('/api/admin/lab-teams')

// FIXED — use the actual route paths
fetch(`/api/leaderboards/${domainId}/lab_round`)
fetch(`/api/leaderboards/finals/${domainId}`)
fetch(`/api/admin/teams?labId=${labId}`)
```

### Pattern 6: JWT payload fields read with wrong names
```typescript
// BROKEN
req.user.lab
req.user.domain
req.user.judgeType
req.user.isFinals

// FIXED — match the JWT payload spec exactly
req.user.labId
req.user.assignedDomains    // string[]
req.user.judgeRole          // 'lab_round' | 'seminar_hall' | 'admin'
req.user.isSeminarHallJudge // boolean
```

### Pattern 7: Round transition not saving correctly
```typescript
// BROKEN — team never gets marked as qualified
await Team.updateMany({ _id: { $in: topTeamIds } }, {
  qualified: true,         // wrong field name
  venue: seminarHallId     // wrong field name
});

// FIXED
await Team.updateMany({ _id: { $in: topTeamIds } }, {
  $set: {
    qualifiedForFinals: true,
    finalVenueId: seminarHall._id
  }
});

// Also update competition state
await Competition.findOneAndUpdate(
  { isActive: true },
  {
    $set: {
      currentRound: 'finals',
      seminarHallId: seminarHall._id,
      labRoundEndTime: new Date(),
      finalsStartTime: new Date()
    }
  }
);
```

### Pattern 8: Cache never invalidated → stale data forever
```typescript
// After EVERY score submission — add this:
cacheService.delete(`leaderboard:${domainId}:${round}`);
// or for finals:
cacheService.delete(`leaderboard:${domainId}:finals:seminar_hall`);

// After round transition — add this:
cacheService.clearPattern('leaderboard:*');
cacheService.clearPattern('seminar_hall:*');
```

### Pattern 9: Socket.io emitting to wrong room names
```typescript
// BROKEN — mismatched room keys
socket.emit('update', data)
io.to(`domain-${domainId}`).emit('leaderboard', data)

// FIXED — use consistent room key format everywhere
// Server emits:
io.to(`leaderboard:${domainId}:lab_round`).emit('leaderboard_update', data);
io.to(`leaderboard:${domainId}:finals`).emit('leaderboard_update', data);

// Client subscribes:
socket.emit('join_leaderboard', `leaderboard:${domainId}:lab_round`);
socket.on('leaderboard_update', (data) => { ... });
```

### Pattern 10: Seminar hall judge seeing all teams instead of just qualified ones
```typescript
// BROKEN — no qualification filter
const teams = await Team.find({ domainId: { $in: assignedDomains } });

// FIXED — three conditions required
const seminarHall = await Lab.findOne({ type: 'seminar_hall' });
const teams = await Team.find({
  qualifiedForFinals: true,
  finalVenueId: seminarHall._id,
  domainId: { $in: judge.assignedDomains }
}).populate('labId', 'name').populate('domainId', 'name');
```

---

## STEP 5 — REBUILD EACH SECTION IN THIS ORDER

Work through the project in this exact order.
Do not move to the next section until the current one is complete and verified.

### Section A: Mongoose Models (foundation — fix this first)
Files: `/models/*.ts` or `/lib/models/*.ts`

For each model:
- Confirm all field names match the schema spec above exactly
- Add any missing fields with safe defaults (null, false, 0)
- Confirm all indexes are present
- Confirm all enum values are exact strings ('lab_round', 'finals', 'lab', 'seminar_hall')

### Section B: Middleware & Auth
Files: `/middleware.ts`, `/lib/auth.ts`, `/lib/jwt.ts`

- JWT payload shape must match exactly: userId, role, labId, assignedDomains, judgeRole, isSeminarHallJudge
- Admin auth: reads ADMIN_ID and ADMIN_PASS from env
- Judge auth: validates email+password, returns JWT with correct payload
- Route protection: /admin/* requires admin JWT, /judge/* requires judge JWT
- Public routes: /api/leaderboards/* need NO auth

### Section C: API Routes — Public
Files: `/app/api/leaderboards/[domainId]/lab_round/route.ts`
       `/app/api/leaderboards/finals/[domainId]/route.ts`
       `/app/api/leaderboards/finals/all/route.ts`
       `/app/api/competition/status/route.ts`
       `/app/api/domains/route.ts`
       `/app/api/labs/route.ts`

For each:
- No auth required
- Returns populated data (no raw ObjectIds)
- Uses cache before hitting MongoDB
- Invalidates cache correctly on writes

### Section D: API Routes — Judge
Files: `/app/api/judge/login/route.ts`
       `/app/api/judge/teams/route.ts`
       `/app/api/judge/scores/route.ts`
       `/app/api/judge/seminar-hall/teams/route.ts`
       `/app/api/judge/seminar-hall/scores/route.ts`
       `/app/api/judge/seminar-hall/leaderboard/route.ts`

For each:
- JWT required, correct role enforced
- All validation rules applied (see score submission rules below)
- venueId ALWAYS set on score creation
- Cache invalidated after score write
- Socket.io event emitted after score write

Score submission validation rules — check ALL of these server-side:
```
Lab Round:
  ✓ judge.role === 'lab_round'
  ✓ team.labId.toString() === judge.assignedLabId.toString()
  ✓ competition.currentRound === 'lab_round'
  ✓ no existing score from this judge for this team this round

Finals:
  ✓ judge.role === 'seminar_hall'
  ✓ team.qualifiedForFinals === true
  ✓ team.finalVenueId.toString() === seminarHall._id.toString()
  ✓ judge.assignedDomains.includes(team.domainId.toString())
  ✓ competition.currentRound === 'finals'
  ✓ no existing score from this judge for this team this round
```

### Section E: API Routes — Admin
Files: `/app/api/admin/competition/route.ts`
       `/app/api/admin/competition/transition/route.ts`
       `/app/api/admin/teams/route.ts`
       `/app/api/admin/judges/route.ts`
       `/app/api/admin/attendance/route.ts`
       `/app/api/admin/seminar-hall/qualifiers/route.ts`

For transition route specifically:
```typescript
// Full transition flow — every step must execute
1. const seminarHall = await Lab.findOne({ type: 'seminar_hall' })
2. for each active domain:
     top5 = aggregate lab_round scores, group by teamId, sort desc, limit 5
3. await Team.updateMany({ _id: { $in: allTop5Ids } }, {
     $set: { qualifiedForFinals: true, finalVenueId: seminarHall._id }
   })
4. await Competition.findOneAndUpdate({ isActive: true }, {
     $set: { currentRound: 'finals', seminarHallId: seminarHall._id,
             labRoundEndTime: new Date(), finalsStartTime: new Date() }
   })
5. cacheService.clearPattern('leaderboard:*')
6. io.emit('round_transition', { round: 'finals', qualifiedTeams, timestamp })
7. return { success: true, qualifiedTeams, count: allTop5Ids.length }
```

### Section F: Admin Pages (Frontend)
Files: `/app/admin/dashboard/page.tsx`
       `/app/admin/competition/page.tsx`
       `/app/admin/teams/page.tsx`
       `/app/admin/judges/page.tsx`
       `/app/admin/seminar-hall/page.tsx`
       `/app/admin/attendance/page.tsx`
       `/app/admin/certificates/page.tsx`

For each page:
- Fetch URLs must match actual API route paths exactly
- Response parsing must match actual response shape
- Loading and error states present
- Data shows populated names (not ObjectIds)
- Forms submit to correct endpoints with correct field names

### Section G: Judge Pages (Frontend)
Files: `/app/judge/page.tsx` (login)
       `/app/judge/dashboard/page.tsx` (lab round)
       `/app/judge/seminar-hall/page.tsx` (finals)

- Login reads email+password, calls /api/judge/login, stores JWT
- Lab round dashboard: shows ONLY assigned lab teams, score form per team
- Seminar hall dashboard: domain tabs, only qualified teams per assigned domain
- Both subscribe to correct Socket.io rooms for live leaderboard

### Section H: Public Pages (Frontend)
Files: `/app/page.tsx`
       `/app/leaderboard/page.tsx`
       `/app/standings/page.tsx`
       `/app/certificates/page.tsx`
       `/app/seminar/leaderboard/page.tsx`

- Leaderboard fetches per domain, subscribes to Socket.io
- Tab toggle between Lab Round and Finals leaderboards
- /seminar/leaderboard: fullscreen, auto-refresh, top 5 per domain + overall
- Certificates: team name input → member list → download buttons

### Section I: Socket.io
Files: `/lib/socket.ts` (server), `/lib/socket-client.ts` or hook

Server:
- Room join handler: `socket.on('join_leaderboard', (room) => socket.join(room))`
- Emit on score: `io.to(room).emit('leaderboard_update', { domainId, round, leaderboard })`
- Emit on transition: `io.emit('round_transition', { qualifiedTeams })`

Client:
- Connect on mount, disconnect on unmount
- Join correct room based on domainId + round
- Handle 'leaderboard_update' → update state
- Handle 'round_transition' → show banner, switch to finals tab

### Section J: Certificate System
Files: `/app/api/certificates/generate/route.ts`
       `/app/api/certificates/config/route.ts`
       `/app/admin/certificates/page.tsx`
       `/app/certificates/page.tsx`

Certificate generation:
```typescript
// 1. Find team (case-insensitive)
const team = await Team.findOne({ name: new RegExp(`^${teamName}$`, 'i') });

// 2. Get config from DB
const config = await CertificateConfig.findOne();

// 3. For each member, composite text onto template using 'sharp'
// Name format: "MEMBER NAME (TEAM NAME)"
const image = await sharp(config.templateImagePath)
  .composite([{
    input: Buffer.from(`
      <svg width="1000" height="700">
        <text x="${config.nameX}" y="${config.nameY}"
              font-size="${config.nameSize}"
              fill="${config.nameColor}"
              text-anchor="middle">
          ${member.name} (${team.name})
        </text>
      </svg>`),
    top: 0, left: 0
  }])
  .png()
  .toBuffer();

// 4. Return as base64 per member
```

---

## STEP 6 — VERIFY THE FULL COMPETITION FLOW END TO END

Run through every step below in order. Each one must work before moving to the next.
If any step fails, fix it immediately before continuing.

```
REGISTRATION
[ ] 1. Participant registers team at hidden /register route
       → Team appears in DB with labId and domainId correctly set
       → Team appears in admin attendance panel immediately

LAB ROUND JUDGING (the most broken area — verify carefully)
[ ] 2. Judge logs in at /judge with email + password
       → JWT stored in browser (localStorage or cookie)
       → Redirected to judge dashboard

[ ] 3. Judge dashboard loads and shows teams
       → Teams visible = ONLY teams assigned to that judge's lab
       → Each team shows: name, members, domain name, current score
       → If zero teams show: THIS IS BUG 1 — it is not fixed yet, go back

[ ] 4. Judge clicks score button on a team
       → Score form appears with marks input (0–100) and feedback field
       → Submit button is clickable

[ ] 5. Judge fills in marks and clicks Submit
       → Request goes to POST /api/judge/scores with Authorization header
       → Score saved in DB with venueId set (not null)
       → Success message shown to judge
       → That team's score updates on judge's screen
       → If nothing happens on submit: THIS IS BUG 2 — it is not fixed yet, go back

LEADERBOARD (third most broken area)
[ ] 6. Public /leaderboard page loads and shows data
       → 3 domain tabs visible: AI/ML | Web Development | Data Science
       → Each tab shows teams ranked by total score
       → Teams and scores appear (not empty, not "[object Object]")
       → If leaderboard is empty: THIS IS BUG 3 — it is not fixed yet, go back

[ ] 7. Judge submits another score → leaderboard updates live
       → No page refresh needed
       → Ranking changes reflected within 2 seconds via Socket.io

ADMIN FLOW
[ ] 8. Admin logs in at /admin → dashboard shows all panels with real data
       → Attendance panel: real team names + member names (not ObjectIds)
       → Lab leaderboard panel: scores per domain showing correctly
       → Quick stats: correct team/participant counts

[ ] 9. Admin triggers Finals Transition at /admin/competition
       → Confirmation shows: "15 teams qualified (5 per domain)"
       → DB: exactly 15 teams have qualifiedForFinals=true
       → DB: competition.currentRound === 'finals'
       → Public leaderboard shows "Finals have started" banner

SEMINAR HALL FINALS
[ ] 10. Seminar Hall judge logs in → sees ONLY top 5 teams from their domain
        → NOT all teams — only the qualified finalists
        → Teams grouped by domain if judge handles multiple domains

[ ] 11. Seminar Hall judge submits score
        → Score saved with round='finals', venueId=SeminarHall._id
        → /seminar/leaderboard updates live

[ ] 12. /seminar/leaderboard fullscreen display
        → 3 domain columns side by side
        → Top 5 teams per domain with rank + score
        → Updates live — no refresh needed

CERTIFICATES
[ ] 13. Student enters team name at /certificates
        → Members of that team listed with download buttons
        → Certificate generated with format: "MEMBER NAME (TEAM NAME)"

[ ] 14. Admin updates certificate coordinates at /admin/certificates
        → New X,Y positions saved to DB
        → Next certificate generated uses new coordinates
```

---

## OUTPUT FORMAT

For each file you change or create:

```
═══════════════════════════════════════════
ACTION: REWRITE | FIX | DELETE | CREATE
FILE: /path/to/file.ts
REASON: [what was broken / why this was dead code]
═══════════════════════════════════════════
[full file content]
```

For deleted files:
```
DELETED: /path/to/file.ts
REASON: [why it was removed]
```

---

## ABSOLUTE RULES

1. Do not change collection names or route paths that other files already depend on
2. Do not add new npm packages — use what is already installed
3. Do not touch .env.local — only reference process.env.VARIABLE_NAME
4. Every API response must be JSON with consistent shape:
   - Success: `{ success: true, data: {...} }`
   - Error:   `{ success: false, error: "message" }`
5. Never return raw Mongoose documents — always call .toJSON() or use .lean()
6. Never expose passwordHash in any API response — exclude it explicitly:
   `Judge.findOne(...).select('-passwordHash')`
7. If a feature is genuinely complex to fix in isolation, leave a clear
   TODO comment — do not silently break other things trying to fix one thing

---

## START HERE

Begin with: "I have read the full codebase. Here is my triage table:"
Then output the complete triage table.
Then say: "Beginning fixes in order. Section A: Mongoose Models."
Then fix everything section by section without stopping.