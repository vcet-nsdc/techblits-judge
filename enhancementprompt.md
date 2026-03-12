# BattleHack — Data Sync & DB Mismatch Fix Prompt

## CONTEXT

You are fixing a critical bug in the BattleHack competition platform.
The project is built with Next.js (App Router) + TypeScript + MongoDB (Mongoose) + Socket.io.

The core problem is: **the admin panel and the rest of the platform are NOT in sync**.
Data written in one part of the system is not reflected in another.
DB calls are inconsistent — some pages fetch stale data, some write to wrong collections,
and some UI panels show nothing because the query shapes don't match the schema.

---

## YOUR JOB

Do NOT rewrite the project. Do NOT change working features.
Your ONLY job is to:

1. Audit every DB call across the entire codebase
2. Find every mismatch, missing populate(), wrong field name, broken query, or stale fetch
3. Fix them — one file at a time, showing the before and after for each fix
4. Ensure all data flows correctly end-to-end across every role and route

---

## STEP 1 — AUDIT PHASE (do this first, before touching any code)

Read every file in the project. For each file, answer:

### API Routes (`/app/api/**`)
- What collection is this route reading from or writing to?
- Does the Mongoose query match the actual schema field names exactly?
- Are all required `.populate()` calls present?
  - teamId → Team → labId, domainId, members
  - judgeId → Judge → assignedLabId, assignedDomains
  - venueId → Lab
  - domainId → Domain
- Is the correct `round` enum value used? ('lab_round' or 'finals' — never anything else)
- Is `venueId` being set on every Score document at creation time?
- Is `qualifiedForFinals` being checked where required?

### Admin Pages (`/app/admin/**`)
- What API endpoint is each admin page calling?
- Does that API endpoint actually exist?
- Does the response shape match what the frontend expects?
- Are there hardcoded field names that don't match the schema?

### Judge Pages (`/app/judge/**`)
- Is the JWT payload being read correctly? (userId, role, labId, assignedDomains, judgeRole)
- Is the lab round judge restricted to their assignedLabId?
- Is the seminar hall judge restricted to their assignedDomains + qualifiedForFinals teams only?

### Public Pages (`/app/**` — leaderboards, standings, certificates)
- Are API calls hitting the correct endpoints?
- Is the response being parsed correctly?
- Is the domain filter working (domainId passed correctly)?

### Socket.io
- Is the server emitting 'leaderboard_update' after EVERY score submission?
- Is the client subscribing to the correct room keys?
  Format: `leaderboard:{domainId}:lab_round` or `leaderboard:{domainId}:finals`
- Is 'round_transition' being emitted and received correctly?

---

## STEP 2 — KNOWN ISSUES TO LOOK FOR

Check every single one of these specifically:

### Schema Field Name Mismatches
```
WRONG                          CORRECT
team.lab          →            team.labId
team.domain       →            team.domainId
team.qualified    →            team.qualifiedForFinals
team.finalVenue   →            team.finalVenueId
score.venue       →            score.venueId
score.round_type  →            score.round
judge.lab         →            judge.assignedLabId
judge.domains     →            judge.assignedDomains
competition.round →            competition.currentRound
```

### Missing populate() Calls
Every team query in the admin must populate:
```typescript
Team.find(...)
  .populate('labId')       // → Lab document
  .populate('domainId')    // → Domain document
```

Every score query must populate:
```typescript
Score.find(...)
  .populate('teamId')
  .populate('judgeId')
  .populate('domainId')
  .populate('venueId')     // ← this is most commonly missing
```

### venueId Never Set on Score Creation
When a judge submits a score, venueId MUST be saved:
```typescript
// Lab round score
const score = new Score({
  teamId,
  judgeId,
  domainId: team.domainId,
  venueId: judge.assignedLabId,   // ← set from judge's assigned lab
  round: 'lab_round',
  marks
});

// Finals score
const score = new Score({
  teamId,
  judgeId,
  domainId: team.domainId,
  venueId: seminarHall._id,        // ← set to Seminar Hall _id
  round: 'finals',
  marks
});
```

### Leaderboard Aggregation Pipeline — Wrong Match Stage
The match stage MUST use ObjectId casting:
```typescript
// WRONG — string comparison against ObjectId field will return 0 results
{ $match: { domainId: domainId } }

// CORRECT
import { Types } from 'mongoose';
{ $match: { domainId: new Types.ObjectId(domainId) } }
```
Apply this fix everywhere: domainId, venueId, teamId, labId in all aggregations.

### Admin Dashboard Panels Showing Empty Data
Check each panel's fetch URL against the actual API route path exactly.
Common issues:
- `/api/admin/leaderboard` called but route is at `/api/leaderboards/:domainId/lab_round`
- `/api/admin/teams` returns teams without populated lab/domain names
- `/api/admin/attendance` returns raw ObjectIds instead of populated names
- `/api/admin/seminar-hall/qualifiers` returns empty because `qualifiedForFinals`
  field was never set during transition

### Round Transition Not Marking Teams
The transitionToFinals function must:
```typescript
await Team.findByIdAndUpdate(team._id, {
  $set: {
    qualifiedForFinals: true,
    finalVenueId: seminarHall._id   // ← must be Seminar Hall _id, NOT name string
  }
});
```
After transition, verify with:
```typescript
const qualified = await Team.find({ qualifiedForFinals: true });
console.log('Qualified teams count:', qualified.length);
// Should be: qualifiedTeamsPerDomain × number of domains (e.g. 5 × 3 = 15)
```

### Competition currentRound Not Updating
After transition:
```typescript
await Competition.findOneAndUpdate(
  { isActive: true },
  {
    $set: {
      currentRound: 'finals',          // ← must be exact enum string
      seminarHallId: seminarHall._id,
      labRoundEndTime: new Date(),
      finalsStartTime: new Date()
    }
  }
);
```

### Cache Invalidation Not Happening
After every score submission:
```typescript
// Delete the specific cache key
cacheService.delete(`leaderboard:${domainId}:${round}`);

// After round transition — clear ALL leaderboard cache
cacheService.clearPattern('leaderboard:*');
```
If cache is never invalidated, the leaderboard will show stale data forever.

### JWT Payload Fields Not Being Read
In middleware and protected routes:
```typescript
// WRONG — different field names
req.user.lab
req.user.domain
req.user.judgeType

// CORRECT — match the JWT payload spec exactly
req.user.labId
req.user.assignedDomains      // array of domain ObjectId strings
req.user.judgeRole            // 'lab_round' | 'seminar_hall' | 'admin'
req.user.isSeminarHallJudge   // boolean
```

### Seminar Hall Judge Seeing Wrong Teams
The query for seminar hall teams MUST filter by all three conditions:
```typescript
const teams = await Team.find({
  qualifiedForFinals: true,
  finalVenueId: seminarHall._id,
  domainId: { $in: judge.assignedDomains }   // ← only their assigned domains
}).populate('labId').populate('domainId');
```
Missing ANY of these conditions causes wrong data to appear.

### Certificate System — Members Not Found
Certificate fetch must query the attendance/registration collection correctly:
```typescript
// The student enters a team name — look up that team and its attended members
const team = await Team.findOne({
  name: { $regex: new RegExp(`^${teamName}$`, 'i') }  // case-insensitive match
}).populate('members');

// members who attended — check the attended flag if it exists
const attendedMembers = team.members.filter(m => m.attended === true);
```

---

## STEP 3 — FIX PROTOCOL

For EVERY file you fix, output in this exact format:

```
FILE: /app/api/[route]/route.ts
ISSUE: [describe the exact mismatch]
BEFORE:
  [paste the broken code]
AFTER:
  [paste the fixed code]
REASON: [one line explanation]
```

Do NOT output the entire file — only the changed sections with enough context
(5 lines above and below) to understand where the fix goes.

---

## STEP 4 — CROSS-SYSTEM DATA FLOW VERIFICATION

After all fixes, verify these 6 end-to-end flows work correctly:

### Flow 1: Judge submits lab round score → leaderboard updates
```
POST /api/judge/scores
  → Score saved with correct venueId, domainId, round='lab_round'
  → Cache key 'leaderboard:{domainId}:lab_round' invalidated
  → MongoDB aggregation runs fresh
  → Socket emits 'leaderboard_update' to room 'leaderboard:{domainId}:lab_round'
  → Public leaderboard re-renders with new ranking
```

### Flow 2: Admin triggers finals → teams marked → seminar hall judge sees them
```
POST /api/admin/competition/transition
  → Top 5 per domain fetched from lab_round scores
  → Each team: qualifiedForFinals=true, finalVenueId=SeminarHall._id
  → competition.currentRound = 'finals'
  → Cache cleared
  → Socket emits 'round_transition' with qualifiedTeams list
  → GET /api/judge/seminar-hall/teams returns those 15 teams (5 per domain)
```

### Flow 3: Seminar Hall judge scores → finals leaderboard updates
```
POST /api/judge/seminar-hall/scores
  → Validates: qualifiedForFinals=true, correct domain, correct venue
  → Score saved with venueId=SeminarHall._id, round='finals'
  → Cache key 'leaderboard:{domainId}:finals:seminar_hall' invalidated
  → Socket emits 'leaderboard_update' to room 'leaderboard:{domainId}:finals'
  → /seminar/leaderboard display updates live
```

### Flow 4: Admin dashboard loads all panels with real data
```
GET /admin/dashboard
  → Morning registrations panel: real team+member data with domain names
  → Lab leaderboard panel: scores per domain from aggregation (populated)
  → Quick stats: accurate counts from DB
  → Seminar Hall panel: 15 qualified teams with their finals scores
```

### Flow 5: Student enters team name → gets certificate
```
POST /api/certificates/generate (or GET with query param)
  → Team found by name (case-insensitive)
  → Members fetched (attended only)
  → Certificate config fetched from certificateConfig collection
  → Backend composites name on template image using saved X,Y,size,color
  → Returns image buffer per member
  → Frontend shows download buttons
```

### Flow 6: Public leaderboard toggle Lab Round ↔ Finals
```
/leaderboard page
  → Tab 1 (Lab Round): calls GET /api/leaderboards/{domainId}/lab_round for each domain
  → Tab 2 (Finals): calls GET /api/leaderboards/finals/{domainId} for each domain
  → Both tabs subscribe to correct Socket.io rooms
  → Switching tabs does not break real-time updates
```

---

## STEP 5 — FINAL CHECKLIST

Before finishing, confirm every item below is true:

### Database
- [ ] All Score documents have venueId set (not null)
- [ ] All ObjectId comparisons use `new Types.ObjectId(id)` in aggregations
- [ ] All queries that need populated data call `.populate()` correctly
- [ ] `qualifiedForFinals` is `true` on exactly (qualifiedTeamsPerDomain × domains) teams after transition
- [ ] `competition.currentRound` is updated to 'finals' after transition
- [ ] `competition.seminarHallId` is set to the Seminar Hall lab _id

### Admin
- [ ] Dashboard morning registrations panel shows real data
- [ ] Dashboard lab leaderboard shows scores with team names (not ObjectIds)
- [ ] Dashboard seminar hall panel shows qualified teams after transition
- [ ] Competition control triggers transition and shows confirmation
- [ ] Judge management creates judges with correct role and assignedLabId

### Judges
- [ ] Lab round judge sees only their lab's teams
- [ ] Lab round judge cannot submit scores for teams in other labs (403)
- [ ] Seminar Hall judge sees only qualifying teams in their domains
- [ ] Seminar Hall judge cannot score non-qualifying teams (403)
- [ ] Both judge types see live leaderboard update after score submission

### Public
- [ ] Lab round leaderboard shows 3 domain tabs with correct rankings
- [ ] Finals leaderboard shows after round transition
- [ ] /seminar/leaderboard big screen shows top 5 per domain + overall
- [ ] WebSocket reconnects gracefully if connection drops

### Certificates
- [ ] Student can find team by name (case-insensitive)
- [ ] Certificate generated with correct name format: "NAME (TEAM)"
- [ ] Admin coordinate config saves to DB and is used in generation
- [ ] Download works for each team member

### Cache
- [ ] Cache is invalidated on every score write
- [ ] Cache is fully cleared on round transition
- [ ] Stale cache never serves data older than TTL

---

## IMPORTANT RULES

- Do NOT change any working feature — only fix broken data sync
- Do NOT rename any collection, field, or route that is already working
- Do NOT switch libraries or change the tech stack
- Show every changed file clearly with BEFORE/AFTER
- If you find a missing API route that is being called, CREATE it
- If you find a frontend fetch pointing to a non-existent endpoint, fix the URL
- If you find a schema field missing that is required, add it with a default value
  using a migration-safe approach (default: null or default: false)

---

## OUTPUT FORMAT

Deliver fixes in this order:
1. Mongoose Models (schema fixes first — everything depends on these)
2. API Routes (fix DB queries, populate calls, aggregation pipelines)
3. Middleware (JWT field name fixes)
4. Admin Pages (fix fetch URLs and response parsing)
5. Judge Pages (fix auth checks and data display)
6. Public Pages (fix leaderboard fetches and Socket.io subscriptions)
7. Socket.io server (fix emit events and room names)
8. Certificate system (fix team lookup and config fetch)
9. Final end-to-end flow test results (console.log outputs confirming data flows)