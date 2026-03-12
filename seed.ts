import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ── Inline schemas (avoid Next.js path aliases in standalone script) ──────────

// --- VenueType / CompetitionRound enums ---
const VenueType = { LAB: 'lab', SEMINAR_HALL: 'seminar_hall' } as const;
const CompetitionRound = { LAB_ROUND: 'lab_round', FINALS: 'finals' } as const;
const JudgeRole = { LAB_ROUND: 'lab_round', SEMINAR_HALL: 'seminar_hall', ADMIN: 'admin' } as const;

// --- Lab ---
const LabSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  location: { type: String },
  type: { type: String, enum: Object.values(VenueType), default: VenueType.LAB },
  capacity: { type: Number, default: 50 },
  assignedDomain: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const Lab = mongoose.models.Lab || mongoose.model('Lab', LabSchema);

// --- Domain ---
const DomainSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  scoringCriteria: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const Domain = mongoose.models.Domain || mongoose.model('Domain', DomainSchema);

// --- Team (models/ style – ObjectId refs) ---
const TeamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['leader', 'member'], default: 'member' },
});
const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  labId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: true },
  members: [TeamMemberSchema],
  currentScore: { type: Number, default: 0 },
  rank: { type: Number },
  qualifiedForFinals: { type: Boolean, default: false },
  finalVenueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', default: null },
  finalScore: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const Team = mongoose.models.Team || mongoose.model('Team', TeamSchema);

// --- Judge ---
const JudgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  assignedLabId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  assignedDomains: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Domain' }],
  role: { type: String, enum: Object.values(JudgeRole), default: JudgeRole.LAB_ROUND },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date },
}, { timestamps: true });
const Judge = mongoose.models.Judge || mongoose.model('Judge', JudgeSchema);

// --- Score ---
const ScoreSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  judgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Judge', required: true },
  domainId: { type: mongoose.Schema.Types.ObjectId, ref: 'Domain', required: true },
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', required: true },
  round: { type: String, enum: ['lab_round', 'finals'], required: true },
  marks: { type: Number, required: true, min: 0, max: 100 },
  criteria: [{ name: String, marks: { type: Number, min: 0, max: 100 } }],
  feedback: { type: String, maxlength: 1000 },
}, { timestamps: true });
const Score = mongoose.models.Score || mongoose.model('Score', ScoreSchema);

// --- Competition ---
const CompetitionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  currentRound: { type: String, enum: ['lab_round', 'finals'], default: 'lab_round' },
  seminarHallId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  qualifiedTeamsPerDomain: { type: Number, default: 5 },
  labRoundStartTime: { type: Date },
  labRoundEndTime: { type: Date },
  finalsStartTime: { type: Date },
  finalsEndTime: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const Competition = mongoose.models.Competition || mongoose.model('Competition', CompetitionSchema);

// --- TeamModel (db/models style – integer id, string fields) ---
const TeamModelSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  domain: { type: String, required: true },
  problemStatement: { type: String, required: true },
  lab: { type: String, required: true },
  githubRepo: { type: String, required: true },
  figmaLink: { type: String, default: null },
  members: { type: [String], required: true },
  gitScore: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'teams' });
// Note: This shares the 'teams' collection name but won't conflict because
// the ObjectId-based Team model uses default collection 'teams' too.
// We use a separate model name to avoid clashes.
const TeamReg = mongoose.models.TeamReg || mongoose.model('TeamReg', TeamModelSchema);

// --- EvaluationModel (db/models style) ---
const EvaluationSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  teamId: { type: Number, required: true },
  judgeId: { type: String, required: true },
  innovation: { type: Number, required: true },
  techComplexity: { type: Number, required: true },
  uiUx: { type: Number, required: true },
  practicalImpact: { type: Number, required: true },
  presentation: { type: Number, required: true },
  totalScore: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
}, { collection: 'evaluations' });
const EvaluationModel = mongoose.models.Evaluation || mongoose.model('Evaluation', EvaluationSchema);

// ── Seed data ─────────────────────────────────────────────────────────────────

const LABS = [
  { name: '114A', location: 'Room 114A', type: VenueType.LAB, capacity: 50, assignedDomain: 'Agentic AI' },
  { name: '114B', location: 'Room 114B', type: VenueType.LAB, capacity: 50, assignedDomain: 'Agentic AI' },
  { name: '308A', location: 'Room 308A', type: VenueType.LAB, capacity: 50, assignedDomain: 'UI/UX Challenge' },
  { name: '308B', location: 'Room 308B', type: VenueType.LAB, capacity: 50, assignedDomain: 'UI/UX Challenge' },
  { name: '220',  location: 'Room 220',  type: VenueType.LAB, capacity: 50, assignedDomain: 'Vibecoding' },
  { name: '221',  location: 'Room 221',  type: VenueType.LAB, capacity: 50, assignedDomain: 'Vibecoding' },
  { name: '222',  location: 'Room 222',  type: VenueType.LAB, capacity: 50, assignedDomain: 'Vibecoding' },
  { name: 'Seminar Hall', location: 'Main Seminar Hall', type: VenueType.SEMINAR_HALL, capacity: 200, assignedDomain: null },
];

const DOMAINS = [
  { name: 'Agentic AI',      description: 'Autonomous AI Agents and Intelligent Systems',    scoringCriteria: ['Algorithm Design', 'Accuracy', 'Efficiency'] },
  { name: 'Vibecoding',      description: 'Creative Vibe Coding and Rapid Prototyping',      scoringCriteria: ['Creativity', 'Functionality', 'Performance'] },
  { name: 'UI/UX Challenge', description: 'User Interface and User Experience Design',       scoringCriteria: ['Design', 'Usability', 'Accessibility'] },
];

const JUDGE_PASSWORD = 'NSDC@JUDGE';

// ── Main seed function ────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB ?? 'competition-platform';

  if (!uri) {
    console.error('❌ MONGODB_URI is not set. Create a .env file (see .env.example).');
    process.exit(1);
  }

  console.log(`🌱 Connecting to MongoDB (${dbName})...`);
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected\n');

  // ── 1. Drop existing data ────────────────────────────────────────────────
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    Lab.deleteMany({}),
    Domain.deleteMany({}),
    Team.deleteMany({}),
    Judge.deleteMany({}),
    Score.deleteMany({}),
    Competition.deleteMany({}),
    EvaluationModel.deleteMany({}),
  ]);
  // Clear the registration-style teams collection separately (shared collection name)
  await mongoose.connection.db!.collection('teams').deleteMany({});
  console.log('✅ Cleared\n');

  // ── 2. Create Domains ────────────────────────────────────────────────────
  console.log('🏗️  Creating domains...');
  const createdDomains = await Domain.insertMany(DOMAINS);
  const domainMap = new Map(createdDomains.map((d: any) => [d.name, d._id]));
  console.log(`   Created ${createdDomains.length} domains\n`);

  // ── 3. Create Labs ───────────────────────────────────────────────────────
  console.log('🏗️  Creating labs...');
  const labsToCreate = LABS.map(l => ({
    ...l,
    assignedDomain: l.assignedDomain ? domainMap.get(l.assignedDomain as string) ?? null : null
  }));
  const createdLabs = await Lab.insertMany(labsToCreate);
  const labMap = new Map(createdLabs.map((l: any) => [l.name, l._id]));
  console.log(`   Created ${createdLabs.length} venues (7 labs + Seminar Hall)`);
  console.log('   Lab → Domain mapping:');
  for (const l of createdLabs) {
    if ((l as any).assignedDomain) console.log(`     ${(l as any).name} → ${domainMap.get((LABS.find(x => x.name === (l as any).name)?.assignedDomain as string) || '')}`);
  }
  console.log('');

  // ── 4. Create Competition ────────────────────────────────────────────────
  console.log('🏗️  Creating competition...');
  const competition = await Competition.create({
    name: 'TechBlitz 2026',
    currentRound: CompetitionRound.LAB_ROUND,
    seminarHallId: labMap.get('Seminar Hall'),
    qualifiedTeamsPerDomain: 5,
    labRoundStartTime: new Date(),
    isActive: true,
  });
  console.log(`   Competition: ${competition.name}\n`);

  // ── 5. Teams ─────────────────────────────────────────────────────────────
  // No mock teams — students register themselves via the registration page.
  // Each student selects their domain and the labs shown are filtered by domain:
  //   Agentic AI     → 114A, 114B
  //   UI/UX Challenge → 308A, 308B
  //   Vibecoding      → 220, 221, 222
  console.log('ℹ️  No teams seeded — students will register themselves\n');

  // ── 6. Create Judges ─────────────────────────────────────────────────────
  console.log('🏗️  Creating judges...');
  const passwordHash = await bcrypt.hash(JUDGE_PASSWORD, 12);
  const allDomainIds = createdDomains.map((d: any) => d._id);

  // One judge per lab (all domains)
  const labJudges = [
    { name: 'Judge 114A',  email: 'judge114a',  lab: '114A' },
    { name: 'Judge 114B',  email: 'judge114b',  lab: '114B' },
    { name: 'Judge 308A',  email: 'judge308a',  lab: '308A' },
    { name: 'Judge 308B',  email: 'judge308b',  lab: '308B' },
    { name: 'Judge 220',   email: 'judge220',   lab: '220'  },
    { name: 'Judge 221',   email: 'judge221',   lab: '221'  },
    { name: 'Judge 222',   email: 'judge222',   lab: '222'  },
  ];

  for (const j of labJudges) {
    await Judge.create({
      name: j.name,
      email: j.email,
      passwordHash,
      assignedLabId: labMap.get(j.lab),
      assignedDomains: allDomainIds,
      role: JudgeRole.LAB_ROUND,
      isActive: true,
    });
  }

  // Seminar Hall judge
  await Judge.create({
    name: 'Judge Seminar Hall',
    email: 'judgeseminar',
    passwordHash,
    assignedLabId: labMap.get('Seminar Hall'),
    assignedDomains: allDomainIds,
    role: JudgeRole.SEMINAR_HALL,
    isActive: true,
  });

  // Default admin/judge combo
  await Judge.create({
    name: 'Admin Judge',
    email: 'JUDGETECHBLITZ',
    passwordHash,
    assignedLabId: labMap.get('114A'),
    assignedDomains: allDomainIds,
    role: JudgeRole.ADMIN,
    isActive: true,
  });

  console.log(`   Created ${labJudges.length + 2} judges (password: ${JUDGE_PASSWORD})\n`);

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════');
  console.log('✅ Seed complete!');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('Summary:');
  console.log(`  Labs:         ${createdLabs.length} (7 labs + Seminar Hall)`);
  console.log(`  Domains:      ${createdDomains.length}`);
  console.log('  Teams:        0 (students register themselves)');
  console.log(`  Judges:       ${labJudges.length + 2}`);
  console.log(`  Competition:  ${competition.name}`);
  console.log('');
  console.log('Lab → Domain mapping:');
  console.log('  114A, 114B       → Agentic AI');
  console.log('  308A, 308B       → UI/UX Challenge');
  console.log('  220, 221, 222    → Vibecoding');
  console.log('');
  console.log('Judge credentials:');
  console.log('  Lab judges:     judge114a / judge114b / judge308a / judge308b / judge220 / judge221 / judge222');
  console.log('  Seminar Hall:   judgeseminar');
  console.log('  Admin:          JUDGETECHBLITZ');
  console.log(`  Password (all): ${JUDGE_PASSWORD}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
