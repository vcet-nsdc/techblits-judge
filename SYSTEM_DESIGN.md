# Multi-Lab Competition Platform - System Design Document

## Overview

This document specifies the complete system design for a multi-lab, multi-domain competition platform with judge workflows, team management, and dynamic real-time leaderboards. The platform uses **MongoDB** for persistence and **in-memory caching** for performance — no external cache services required.

## Core Requirements Summary

| Requirement | Detail |
|---|---|
| **Physical Labs** | 114A, 114B, 308A, 308B, 220, 221, 222 (7 competition labs) |
| **Finals Venue** | Seminar Hall (dedicated finals venue for top-5 qualifiers per domain) |
| **Competition Domains** | 3 independent domains, each with its own leaderboard |
| **Round Structure** | Lab Round (all teams in 7 labs) → Finals Round (top 5 per domain → Seminar Hall) |
| **Judge Workflow** | Secure, venue-specific access; marks reflected in real-time |
| **Leaderboards** | 3 domain leaderboards (lab round) + 3 domain leaderboards (Seminar Hall finals) |

---

## 1. Data Models & Database Schema

### 1.1 Core Entities

#### Lab (now includes Seminar Hall)
```typescript
interface Lab {
  id: string;
  name: string;         // "114A" | "114B" | "308A" | "308B" | "220" | "221" | "222" | "Seminar Hall"
  location: string;
  type: VenueType;      // NEW: distinguishes competition labs from the finals venue
  capacity: number;     // NEW: max teams the venue can hold
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

enum VenueType {
  LAB = 'lab',               // Regular competition lab (114A, 114B, 308A, 308B, 220, 221, 222)
  SEMINAR_HALL = 'seminar_hall'  // Finals venue — top-5 qualifiers per domain come here
}
```

**Venue Registry:**

| Venue | Type | Purpose |
|-------|------|---------|
| 114A | lab | Lab Round — teams compete here |
| 114B | lab | Lab Round — teams compete here |
| 308A | lab | Lab Round — teams compete here |
| 308B | lab | Lab Round — teams compete here |
| 220 | lab | Lab Round — teams compete here |
| 221 | lab | Lab Round — teams compete here |
| 222 | lab | Lab Round — teams compete here |
| **Seminar Hall** | **seminar_hall** | **Finals — top-5 per domain present here** |

---

#### Domain
```typescript
interface Domain {
  id: string;
  name: string;         // e.g. "AI/ML", "Web Dev", "Data Science"
  description: string;
  scoringCriteria: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Team
```typescript
interface Team {
  id: string;
  name: string;
  labId: string;                // FK → Lab (the lab where the team competes in lab round)
  domainId: string;             // FK → Domain
  members: TeamMember[];
  currentScore: number;
  rank: number;
  qualifiedForFinals: boolean;  // NEW: true when team is in top-5 of their domain
  finalVenueId: string | null;  // NEW: FK → Lab (Seminar Hall) — set on round transition
  finalScore: number | null;    // NEW: score accumulated in the Seminar Hall finals round
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TeamMember {
  name: string;
  email: string;
  role: 'leader' | 'member';
}
```

#### Judge
```typescript
interface Judge {
  id: string;
  name: string;
  email: string;
  passwordHash: string;         // NEVER exposed in API responses
  assignedLabId: string;        // FK → Lab — can be a regular lab OR "Seminar Hall"
  assignedDomains: string[];    // For Seminar Hall judges: which domains they score
  role: JudgeRole;
  isActive: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

enum JudgeRole {
  LAB_ROUND = 'lab_round',           // Scores teams in their assigned lab (lab round only)
  SEMINAR_HALL = 'seminar_hall',     // NEW: scores top-5 teams domain-wise in Seminar Hall
  ADMIN = 'admin'
}
```

> **Seminar Hall Judge distinction**: A `SEMINAR_HALL` judge is assigned `assignedLabId = <SeminarHall._id>` and one or more `assignedDomains`. They only see and score qualifying teams from their assigned domains, physically present in the Seminar Hall.

#### Score
```typescript
interface Score {
  id: string;
  teamId: string;
  judgeId: string;
  domainId: string;
  venueId: string;              // NEW: FK → Lab — records which venue the score was given in
  round: CompetitionRound;
  marks: number;                // 0–100
  criteria: ScoringCriterion[]; // NEW: per-criterion breakdown (optional detailed scoring)
  feedback?: string;
  submittedAt: Date;
  updatedAt: Date;
}

interface ScoringCriterion {
  name: string;    // e.g. "Innovation", "Presentation", "Technical Depth"
  marks: number;   // marks for this criterion
}

enum CompetitionRound {
  LAB_ROUND = 'lab_round',
  FINALS = 'finals'             // renamed from FINAL_ROUND to be explicit
}
```

#### Competition
```typescript
interface Competition {
  id: string;
  name: string;
  currentRound: CompetitionRound;
  seminarHallId: string;        // NEW: FK → Lab (Seminar Hall venue ID)
  labRoundStartTime: Date;
  labRoundEndTime: Date;
  finalsStartTime: Date;        // renamed from finalRoundStartTime
  finalsEndTime: Date;          // renamed from finalRoundEndTime
  qualifiedTeamsPerDomain: number; // configurable, default 5
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 Database Relationships

```
Lab (type=lab)          ──1:N──  Team (labId)          [lab round assignment]
Lab (type=seminar_hall) ──1:N──  Team (finalVenueId)   [finals assignment]
Domain                  ──1:N──  Team
Lab                     ──1:N──  Judge (assignedLabId)  [lab OR seminar hall]
Team                    ──1:N──  Score
Judge                   ──1:N──  Score
Domain                  ──1:N──  Score
Lab                     ──1:N──  Score (venueId)
Competition             ──1:1──  Lab (seminarHallId)
```

### 1.3 MongoDB Indexes (Performance)

```javascript
scoreSchema.index({ teamId: 1, domainId: 1, round: 1 });
scoreSchema.index({ venueId: 1, round: 1 });              // NEW: Seminar Hall score lookups
scoreSchema.index({ judgeId: 1 });
teamSchema.index({ labId: 1 });
teamSchema.index({ domainId: 1 });
teamSchema.index({ qualifiedForFinals: 1, domainId: 1 }); // NEW: finals qualifier queries
judgeSchema.index({ email: 1 });
judgeSchema.index({ assignedLabId: 1 });
judgeSchema.index({ role: 1 });                           // NEW: filter by judge role
labSchema.index({ type: 1 });                             // NEW: distinguish labs vs seminar hall
```

---

## 2. User Roles & Authentication

### 2.1 Role Definitions

| Role | Access |
|------|--------|
| **Public User** | View leaderboards (read-only, no auth) |
| **Lab Round Judge** | Auth required; sees only assigned lab; scores teams in that lab |
| **Seminar Hall Judge** | Auth required; sees only top-5 qualifiers from assigned domains in Seminar Hall; scores domain-wise |
| **Administrator** | Full access: manage labs, teams, judges, competition state |

### 2.2 Authentication Architecture

**Key design decision**: Judge login is on a **separate portal** (`/judge`) — credentials are never visible from the public-facing site.

#### Endpoint Separation
```
/api/leaderboards/*    → No auth (public)
/api/judge/*           → JWT required (judge)
/api/admin/*           → JWT required (admin)
```

#### JWT Payload
```typescript
interface JWTPayload {
  userId: string;
  role: 'judge' | 'admin';
  labId?: string;               // assigned lab OR Seminar Hall ID
  assignedDomains?: string[];
  judgeRole?: JudgeRole;        // 'lab_round' | 'seminar_hall' | 'admin'
  isSeminarHallJudge?: boolean; // NEW: quick flag for middleware checks
  exp: number;
  iat: number;
}
```

#### Security Measures
- **bcrypt** password hashing (salt rounds = 12)
- JWT access tokens (1-hour expiry)
- Refresh tokens (7-day expiry, HTTP-only cookie)
- Rate limiting on login (5 attempts/minute)
- HTTPS enforcement

---

## 3. Judge Workflow & Permissions

### 3.1 Lab Round Judge Login Flow

```
Judge navigates to /judge
    → Enters email/password
    → Server validates, issues JWT with lab + domain restrictions + role=lab_round
    → Redirected to judge dashboard showing ONLY their assigned lab (308A / 308B / etc.)
```

### 3.2 Seminar Hall Judge Login Flow (NEW)

```
Seminar Hall judge navigates to /judge
    → Enters email/password
    → Server validates, issues JWT with seminarHallId + assignedDomains + role=seminar_hall
    → Redirected to Seminar Hall judge dashboard:
        - Shows only qualifying teams (top-5 per assigned domain) present in the Seminar Hall
        - Teams are grouped by domain
        - Score form includes per-criterion breakdown
        - Live final leaderboard visible domain by domain
```

### 3.3 Permission Matrix

| Action | Lab Round Judge | Seminar Hall Judge | Admin |
|--------|:-:|:-:|:-:|
| View assigned lab teams | ✅ | ❌ | ✅ |
| View all lab teams | ❌ | ❌ | ✅ |
| Score assigned lab teams | ✅ | ❌ | ✅ |
| View top-5 qualifiers (Seminar Hall) | ❌ | ✅ | ✅ |
| Score finals teams (domain-wise) | ❌ | ✅ | ✅ |
| View all leaderboards | ❌ | ❌ | ✅ |
| Manage competition state | ❌ | ❌ | ✅ |
| Transition round to finals | ❌ | ❌ | ✅ |

### 3.4 Access Enforcement

**Backend** (every score submission):
```typescript
// Lab round: judge can only score teams in their assigned lab
if (round === 'lab_round') {
  if (judge.role !== JudgeRole.LAB_ROUND) {
    throw new Error('Access denied: not a lab round judge');
  }
  if (team.labId.toString() !== judge.assignedLabId.toString()) {
    throw new Error('Access denied: wrong lab');
  }
}

// Finals (Seminar Hall): judge can only score assigned domains, only qualifying top-5 teams
if (round === 'finals') {
  if (judge.role !== JudgeRole.SEMINAR_HALL) {
    throw new Error('Access denied: not a Seminar Hall judge');
  }

  // 1. Venue check — the team must be assigned to Seminar Hall
  const seminarHall = await Lab.findOne({ type: VenueType.SEMINAR_HALL });
  if (team.finalVenueId?.toString() !== seminarHall._id.toString()) {
    throw new Error('Access denied: team not assigned to Seminar Hall');
  }

  // 2. Domain check — judge must be assigned to this domain
  if (!judge.assignedDomains.includes(team.domainId.toString())) {
    throw new Error('Access denied: wrong domain');
  }

  // 3. Qualification check — team must be a top-5 qualifier
  if (!team.qualifiedForFinals) {
    throw new Error('Access denied: team did not qualify for finals');
  }
}
```

**Frontend**: Navigation and team lists are filtered server-side before rendering.

---

## 4. Real-time Leaderboard Architecture

### 4.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Database | MongoDB with Mongoose ODM |
| Caching | In-memory `Map` with TTL (no external service) |
| Real-time | Socket.io (WebSocket) |
| Frontend | React with Socket.io client |

### 4.2 Update Flow

```
Judge submits score (lab round OR Seminar Hall finals)
    ↓
API validates (venue/domain/round checks) and stores in MongoDB
    ↓
Invalidate in-memory leaderboard cache for that domain+round+venue
    ↓
Recalculate leaderboard via MongoDB aggregation
    ↓
Store result in in-memory cache (30-min TTL)
    ↓
Queue score update for WebSocket processing
    ↓
WebSocket broadcasts updated leaderboard to subscribed clients
    ↓
Frontend re-renders leaderboard instantly
  → Lab Round View: updates per-domain lab leaderboard
  → Seminar Hall View: updates finals leaderboard grouped by domain
```

### 4.3 Leaderboard Calculation (MongoDB Aggregation)

**Lab round leaderboard** (unchanged):
```typescript
const scores = await Score.aggregate([
  { $match: { domainId: ObjectId(domainId), round: 'lab_round' } },
  { $lookup: { from: 'teams', localField: 'teamId', foreignField: '_id', as: 'team' } },
  { $unwind: '$team' },
  { $group: {
      _id: '$teamId',
      teamName: { $first: '$team.name' },
      labId: { $first: '$team.labId' },
      domainId: { $first: '$team.domainId' },
      totalScore: { $sum: '$marks' },
      lastUpdated: { $max: '$submittedAt' }
  }},
  { $sort: { totalScore: -1 } }
]);
return scores.map((s, i) => ({ ...s, rank: i + 1 }));
```

**Seminar Hall finals leaderboard** (NEW — domain-wise):
```typescript
const seminarHallLeaderboard = async (domainId: string) => {
  const seminarHall = await Lab.findOne({ type: VenueType.SEMINAR_HALL });

  return await Score.aggregate([
    {
      $match: {
        domainId: ObjectId(domainId),
        round: 'finals',
        venueId: seminarHall._id
      }
    },
    { $lookup: { from: 'teams', localField: 'teamId', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $lookup: { from: 'judges', localField: 'judgeId', foreignField: '_id', as: 'judge' } },
    { $unwind: '$judge' },
    {
      $group: {
        _id: '$teamId',
        teamName: { $first: '$team.name' },
        domainId: { $first: '$team.domainId' },
        totalScore: { $sum: '$marks' },
        judgeCount: { $sum: 1 },            // how many judges have scored this team
        lastUpdated: { $max: '$submittedAt' }
      }
    },
    { $sort: { totalScore: -1 } }
  ]);
};
```

### 4.4 In-Memory Caching Strategy

All caching uses a singleton `Map<string, { data, expiresAt }>` — zero infrastructure needed.

| Cache Key Pattern | TTL | Purpose |
|---|---|---|
| `leaderboard:{domainId}:lab_round` | 30 min | Lab round leaderboard per domain |
| `leaderboard:{domainId}:finals:seminar_hall` | 30 min | **NEW**: Seminar Hall finals per domain |
| `seminar_hall:qualifiers:{domainId}` | 1 hour | **NEW**: Cached top-5 qualifier list per domain |
| `session:{sessionId}` | 1 hour | Judge session data |
| `score_queue:{domainId}:{round}` | 24 hours | Queued score updates for WebSocket |

**Invalidation**: On every score submission, the matching leaderboard cache key is deleted, forcing a fresh MongoDB aggregation on next read.

---

## 5. Competition Structure: Lab Round → Seminar Hall Finals

### 5.1 Two-Phase Flow

```
PHASE 1 — LAB ROUND
All teams compete in their assigned labs (114A / 114B / 308A / 308B / 220 / 221 / 222)
Lab round judges score teams within their lab
3 live leaderboards update per domain
                    ↓
         [ Admin triggers transition ]
                    ↓
PHASE 2 — SEMINAR HALL FINALS
Top-5 teams per domain (15 teams total for 3 domains) are flagged as qualified
Teams physically move to the Seminar Hall
Seminar Hall judges score domain-wise
3 separate finals leaderboards update live in the Seminar Hall view
```

### 5.2 Round Transition

```typescript
const transitionToFinals = async () => {
  const competition = await Competition.findOne({ isActive: true });
  const seminarHall = await Lab.findOne({ type: VenueType.SEMINAR_HALL });

  // 1. Identify top N teams per domain from lab round
  const qualifiedTeams = await getTopTeamsPerDomain(competition.qualifiedTeamsPerDomain);

  // 2. Mark qualifying teams and assign them to Seminar Hall
  for (const team of qualifiedTeams) {
    await Team.findByIdAndUpdate(team._id, {
      qualifiedForFinals: true,
      finalVenueId: seminarHall._id
    });
  }

  // 3. Update competition state
  await Competition.updateOne({ isActive: true }, {
    currentRound: CompetitionRound.FINALS,
    seminarHallId: seminarHall._id,
    labRoundEndTime: new Date(),
    finalsStartTime: new Date()
  });

  // 4. Invalidate all leaderboard caches
  cacheService.clearPattern('leaderboard:*');

  // 5. Broadcast round change to all connected clients
  socketServer.io?.emit('round_transition', {
    round: 'finals',
    venue: 'Seminar Hall',
    qualifiedTeams: qualifiedTeams.map(t => ({
      teamId: t._id,
      teamName: t.name,
      domainId: t.domainId
    })),
    timestamp: new Date().toISOString()
  });
};
```

### 5.3 Top-5 Filtering Logic

```typescript
const getTopTeamsPerDomain = async (limit: number) => {
  const domains = await Domain.find({ isActive: true });
  const topTeams = [];

  for (const domain of domains) {
    const leaderboard = await LeaderboardService.getLeaderboard(
      domain._id.toString(), CompetitionRound.LAB_ROUND
    );
    const topIds = leaderboard.slice(0, limit).map(e => e.teamId);
    const teams = await Team.find({ _id: { $in: topIds } });
    topTeams.push(...teams);
  }

  // Results: qualifiedTeamsPerDomain × domains (e.g. 5 × 3 = 15 teams total)
  return topTeams;
};
```

### 5.4 Seminar Hall Judge View

Seminar Hall judges see **only** qualifying teams from their assigned domains:

```
GET /api/judge/seminar-hall/teams  (with seminar_hall JWT)
    → Server reads judge.assignedDomains from JWT
    → For each domain, gets teams where qualifiedForFinals=true AND finalVenueId=<SeminarHall>
    → Returns teams grouped by domain
    → Response shape:
      {
        venue: "Seminar Hall",
        domains: [
          {
            domainId: "...",
            domainName: "AI/ML",
            teams: [ { teamId, teamName, members, labRoundScore } ]
          },
          ...
        ]
      }
```

---

## 6. UI/UX Architecture

### 6.1 Three Portals

| Portal | URL | Purpose |
|--------|-----|---------|
| **Public** | `/` | View leaderboards, team info |
| **Judge** | `/judge` | Login → redirects to lab dashboard or Seminar Hall dashboard based on role |
| **Admin** | `/admin` | Manage competition, labs, judges, trigger round transition |

### 6.2 Key Screens

**Public Portal**:
- Landing page with 3 domain leaderboards (auto-refresh via WebSocket)
- **NEW**: Toggle between Lab Round leaderboard and Seminar Hall Finals leaderboard
- Team registration form

**Judge Portal — Lab Round Judge**:
- Login page (email + password, no link from public site)
- Dashboard: assigned lab name (e.g. "Lab 308A")
- Team list (only teams in assigned lab)
- Score form per team (marks 0–100 + optional feedback)
- Live leaderboard for the judge's domain

**Judge Portal — Seminar Hall Judge (NEW)**:
- Login page (same `/judge` entry point)
- Dashboard header: **"Seminar Hall — Finals"**
- Domain tabs (one tab per assigned domain)
- Per domain tab:
  - Table of top-5 qualifying teams with their lab round scores shown for reference
  - Score form: marks 0–100 per team, with optional per-criterion breakdown
  - Submit button locked until all criteria filled
- Live finals leaderboard for the assigned domain, updating as judges score

**Admin Portal**:
- Competition control: Start Lab Round, **Trigger Finals Transition**, End Finals
- Lab round overview: live scores per lab
- **NEW**: Seminar Hall overview — which teams qualified per domain
- Judge management: assign judges to labs or Seminar Hall + domain(s)
- Override scores (lab round and finals)

### 6.3 Real-time UI

```typescript
// Unified hook — works for both lab round and finals
const useLeaderboard = (domainId: string, round: CompetitionRound) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const endpoint = round === 'finals'
      ? `/api/leaderboards/finals/${domainId}`
      : `/api/leaderboards/${domainId}/lab_round`;

    // Initial fetch
    fetch(endpoint).then(r => r.json()).then(setLeaderboard);

    // Live updates
    const socket = io();
    socket.on('leaderboard_update', (data) => {
      if (data.domainId === domainId && data.round === round) {
        setLeaderboard(data.leaderboard);
      }
    });

    // Handle round transition to finals
    socket.on('round_transition', (data) => {
      if (data.round === 'finals') {
        // Notify user that finals have started, prompt leaderboard switch
      }
    });

    return () => { socket.disconnect(); };
  }, [domainId, round]);

  return leaderboard;
};
```

**Seminar Hall Judge Dashboard (React)**:
```typescript
// Seminar Hall judge sees domain tabs + live finals leaderboard
const SeminarHallDashboard = () => {
  const { assignedDomains } = useJudgeContext();
  const [activeTab, setActiveTab] = useState(assignedDomains[0]);
  const teams = useSeminarHallTeams(activeTab);   // fetches /api/judge/seminar-hall/teams
  const leaderboard = useLeaderboard(activeTab, CompetitionRound.FINALS);

  return (
    <div>
      <h1>Seminar Hall — Finals</h1>
      <DomainTabs domains={assignedDomains} active={activeTab} onSelect={setActiveTab} />
      <TeamScoreTable teams={teams} round="finals" />
      <FinalsLeaderboard entries={leaderboard} />
    </div>
  );
};
```

---

## 7. Technical Implementation

### 7.1 Technology Stack

| Layer | Choice |
|-------|--------|
| **Framework** | Next.js 16 (App Router) with TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Database** | MongoDB with Mongoose ODM |
| **Caching** | In-memory `Map` with TTL (built-in, no external service) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Validation** | Zod schemas |
| **Real-time** | Socket.io |
| **Resilience** | Auto-fallback to in-memory storage if MongoDB is unreachable |

### 7.2 API Endpoints

```
# Public (no auth)
GET  /api/leaderboards/:domainId/lab_round
GET  /api/leaderboards/finals/:domainId       NEW: Seminar Hall finals per domain
GET  /api/leaderboards/finals/all             NEW: All domains finals summary
GET  /api/competition/status
GET  /api/domains
GET  /api/labs                                Returns all: 7 labs + Seminar Hall

# Judge (JWT required — lab round judge)
POST /api/judge/login
GET  /api/judge/teams                         Teams in assigned lab
POST /api/judge/scores                        Submit lab round score
GET  /api/judge/scores?domainId=&round=

# Judge (JWT required — seminar hall judge)
GET  /api/judge/seminar-hall/teams            NEW: Top-5 qualifiers grouped by domain
POST /api/judge/seminar-hall/scores           NEW: Submit finals score
GET  /api/judge/seminar-hall/leaderboard      NEW: Live finals leaderboard per domain

# Admin (JWT + admin role)
GET  /api/admin/competition
POST /api/admin/competition/transition         Triggers finals transition (sets qualifiedForFinals)
GET  /api/admin/seminar-hall/qualifiers        NEW: See which teams qualified and their domains
PUT  /api/admin/seminar-hall/qualifiers        NEW: Manually override qualifier list if needed
PUT  /api/admin/teams/:teamId
PUT  /api/admin/judges/:judgeId
```

### 7.3 WebSocket Events

```
Client → Server:
  join_leaderboard:{domainId}:lab_round
  join_leaderboard:{domainId}:finals          NEW: subscribe to Seminar Hall finals updates
  submit_score

Server → Client:
  leaderboard_update   { domainId, round, venue, leaderboard, timestamp }
  score_submitted      { domainId, round, venue, score, timestamp }
  round_transition     { round, venue, qualifiedTeams, timestamp }  UPDATED: includes qualifiedTeams
  team_qualified       { teamId, teamName, domainId, rank }         NEW: per-team qualification event
```

### 7.4 MongoDB Schemas

```javascript
const labSchema = new Schema({
  name: { type: String, required: true, unique: true },
  location: String,
  type: { type: String, enum: ['lab', 'seminar_hall'], default: 'lab' }, // NEW
  capacity: { type: Number, default: 50 },                               // NEW
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const domainSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  scoringCriteria: [String],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const teamSchema = new Schema({
  name: { type: String, required: true },
  labId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
  members: [{ name: String, email: String, role: { type: String, enum: ['leader', 'member'] } }],
  currentScore: { type: Number, default: 0 },
  rank: Number,
  qualifiedForFinals: { type: Boolean, default: false },               // NEW
  finalVenueId: { type: Schema.Types.ObjectId, ref: 'Lab', default: null }, // NEW: Seminar Hall
  finalScore: { type: Number, default: null },                         // NEW
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const judgeSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  assignedLabId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true }, // lab OR seminar_hall
  assignedDomains: [{ type: Schema.Types.ObjectId, ref: 'Domain' }],
  role: { type: String, enum: ['lab_round', 'seminar_hall', 'admin'], default: 'lab_round' }, // UPDATED
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date
}, { timestamps: true });

const scoreSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  judgeId: { type: Schema.Types.ObjectId, ref: 'Judge', required: true },
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true },
  venueId: { type: Schema.Types.ObjectId, ref: 'Lab', required: true },  // NEW
  round: { type: String, enum: ['lab_round', 'finals'], required: true }, // UPDATED
  marks: { type: Number, required: true, min: 0, max: 100 },
  criteria: [{                                                             // NEW: optional breakdown
    name: String,
    marks: { type: Number, min: 0, max: 100 }
  }],
  feedback: { type: String, maxlength: 1000 }
}, { timestamps: true });

const competitionSchema = new Schema({
  name: { type: String, required: true },
  currentRound: { type: String, enum: ['lab_round', 'finals'], default: 'lab_round' }, // UPDATED
  seminarHallId: { type: Schema.Types.ObjectId, ref: 'Lab' },           // NEW
  qualifiedTeamsPerDomain: { type: Number, default: 5 },                // NEW: configurable
  labRoundStartTime: Date,
  labRoundEndTime: Date,
  finalsStartTime: Date,                                                  // renamed
  finalsEndTime: Date,                                                    // renamed
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
```

---

## 8. Security Considerations

### 8.1 Authentication Security
- bcrypt hashing (salt rounds = 12)
- JWT access tokens (1-hour expiry)
- Refresh tokens (7-day, HTTP-only, SameSite cookies)
- Rate limiting on login endpoints

### 8.2 Authorization Security
- Middleware-enforced role checks on every API call
- **Lab round**: judges can only query/score their assigned lab (`role=lab_round`)
- **Seminar Hall finals**: judges limited to their assigned domains, only qualifying teams (`role=seminar_hall`)
- Qualification flag (`qualifiedForFinals`) checked server-side on every finals score submission
- Venue check (`venueId === seminarHall._id`) prevents cross-venue score injection

### 8.3 Input Validation

```typescript
// Lab round score validation (unchanged)
const labScoreSchema = z.object({
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  marks: z.number().min(0).max(100),
  feedback: z.string().max(1000).optional(),
  round: z.literal('lab_round')
});

// Seminar Hall finals score validation (NEW)
const finalsScoreSchema = z.object({
  teamId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  marks: z.number().min(0).max(100),
  criteria: z.array(z.object({
    name: z.string().min(1),
    marks: z.number().min(0).max(100)
  })).optional(),
  feedback: z.string().max(1000).optional(),
  round: z.literal('finals')
});
```

Additional business-logic checks:
- Is the round currently active?
- Does the judge's assigned lab match the team's lab? (lab round)
- Does the judge's role match the current round? (`lab_round` vs `seminar_hall`)
- Is `team.qualifiedForFinals === true`? (finals submission)
- Is `team.finalVenueId === seminarHall._id`? (finals submission)
- Has the judge already scored this team for this round? (prevent duplicate scores)

---

## 9. Resilience & Scalability

### 9.1 Resilient Storage Layer

The app uses a **`ResilientStorage`** wrapper that automatically falls back to in-memory storage when MongoDB is unreachable:

```
Request → ResilientStorage.getTeams()
    → Try MongoDB
        → Success: return data
        → Failure: log warning, fall back to MemStorage
                   retry MongoDB after 30 seconds
```

This means the app **always starts and serves requests**, even without a database connection.

### 9.2 In-Memory Cache

- Zero-infrastructure caching via `Map<string, CacheEntry>`
- TTL-based expiration (checked on read)
- Pattern-based invalidation for bulk clears (`cacheService.clearPattern('leaderboard:*')`)
- Cache survives as long as the Node.js process runs
- Cache miss = live MongoDB query (transparent to caller)

### 9.3 Database Performance
- MongoDB aggregation pipelines for both lab round and finals leaderboard calculation
- Compound indexes on `(teamId, domainId, round)` and `(venueId, round)` for score lookups
- Index on `(qualifiedForFinals, domainId)` for fast qualifier lookups
- Connection pooling with `serverSelectionTimeoutMS: 5000`

### 9.4 Monitoring
- Structured console logging for all errors
- `/api/test` health check endpoint (MongoDB + cache status)
- Graceful degradation: real-time features degrade to polling if WebSocket fails

---

## 10. Implementation Roadmap

| Phase | Deliverables |
|-------|-------------|
| **1. Core** | DB schemas (including Lab.type, Team.qualifiedForFinals, Team.finalVenueId), auth system, basic API endpoints |
| **2. Judge Workflow** | Lab round judge portal UI, score forms, lab enforcement |
| **3. Real-time** | WebSocket, live leaderboards (lab round), score queue |
| **4. Seminar Hall Finals** | Top-5 filtering, round transition (marks qualifiedForFinals, assigns finalVenueId), Seminar Hall judge dashboard, domain-wise scoring, finals leaderboards |
| **5. Admin Portal** | Competition control (trigger round transition), qualifier override, Seminar Hall overview |
| **6. Deploy** | Testing, load testing, deployment, docs |

---

## 11. Seminar Hall Finals — Feature Summary

This section consolidates all new additions for the Seminar Hall finals feature.

### What changes at round transition:
1. Admin clicks "Trigger Finals" in the admin portal
2. Server computes top-N teams per domain from lab round scores
3. Each qualifying team gets `qualifiedForFinals=true` and `finalVenueId=<SeminarHall._id>`
4. Competition state changes to `currentRound='finals'`
5. WebSocket broadcasts `round_transition` event with qualified team list to all clients
6. Public leaderboard UI shows a "Finals have started — view Seminar Hall results" banner

### What Seminar Hall judges see:
- All qualifying teams grouped by their assigned domain(s)
- Each team's lab round score shown as reference
- Score form per team (0–100 overall + optional per-criterion breakdown)
- Live updating finals leaderboard for their domain

### What the public sees:
- Both lab round leaderboard and finals leaderboard are accessible
- Finals leaderboard shows only the 5 finalists per domain, ranked by finals score
- Both update in real-time as judges score

---

## Conclusion

This system design delivers a secure, real-time two-phase competition platform:

- **Lab Round**: All teams compete in 7 physical labs (114A, 114B, 308A, 308B, 220, 221, 222). Lab judges score within their assigned lab. 3 live domain leaderboards rank all teams.
- **Seminar Hall Finals**: Top 5 teams per domain (up to 15 teams total) advance to the Seminar Hall. Seminar Hall judges score domain-wise with per-criterion breakdowns. 3 separate finals leaderboards update live.

Key strengths:
- **Zero-infrastructure caching**: In-memory `Map` with TTL handles all cache needs
- **Resilient**: Auto-fallback to in-memory storage if MongoDB is down
- **Secure**: Separate judge portal, JWT auth, venue+domain isolation at API level, qualification flag enforced server-side
- **Real-time**: WebSocket broadcasts on every score change, round transitions pushed to all clients instantly
- **Simple**: One database (MongoDB), one framework (Next.js), one deployment
