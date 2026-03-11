import { cacheService } from "@/lib/cache";

import { connectDB } from "@/lib/mongodb";

import { TeamModel, EvaluationModel, ITeam, IEvaluation } from "./models";

import { type Team, type InsertTeam, type Evaluation, type InsertEvaluation } from "./schema";



export interface IStorage {

  getTeams(): Promise<Team[]>;

  getTeam(id: number): Promise<Team | undefined>;

  createTeam(team: InsertTeam): Promise<Team>;

  getEvaluations(): Promise<Evaluation[]>;

  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;

}



export class MongoStorage implements IStorage {

  private async getNextId(collectionName: "teams" | "evaluations"): Promise<number> {

    await connectDB();

    let latestId = 0;

    

    if (collectionName === "teams") {

      const latest = await TeamModel.findOne().sort({ id: -1 }).exec();

      latestId = latest?.id ?? 0;

    } else {

      const latest = await EvaluationModel.findOne().sort({ id: -1 }).exec();

      latestId = latest?.id ?? 0;

    }

    

    return latestId + 1;

  }



  async getTeams(): Promise<Team[]> {

    try {

      const cached = await cacheService.getTeams();

      if (cached) {

        return cached.map(this.transformMongoTeam);

      }



      await connectDB();

      const teams = await TeamModel.find({}).sort({ createdAt: -1 }).lean() as unknown as ITeam[];

      

      const transformedTeams = teams.map(this.transformMongoTeam);

      await cacheService.setTeams(transformedTeams);

      

      return transformedTeams;

    } catch (error) {

      console.error('Error fetching teams from MongoDB:', error);

      throw error;

    }

  }



  async getTeam(id: number): Promise<Team | undefined> {

    try {

      const cached = await cacheService.getTeam(id);

      if (cached) {

        return this.transformMongoTeam(cached);

      }



      await connectDB();

      const team = await TeamModel.findOne({ id }).lean() as unknown as ITeam;

      

      if (team) {

        await cacheService.setTeam(id, team);

        return this.transformMongoTeam(team);

      }

      

      return undefined;

    } catch (error) {

      console.error('Error fetching team from MongoDB:', error);

      throw error;

    }

  }



  async createTeam(insertTeam: InsertTeam): Promise<Team> {

    try {

      await connectDB();

      const gitScore = Math.floor(Math.random() * 16) + 5;

      const newId = await this.getNextId("teams");

      

      const teamToInsert = {

        ...insertTeam,

        id: newId,

        gitScore,

        figmaLink: insertTeam.figmaLink ?? null,

        createdAt: new Date(),

      };



      const result = await TeamModel.create(teamToInsert);

      

      if (result) {

        await cacheService.invalidateTeamCache(newId);

        return this.transformMongoTeam(result.toObject() as unknown as ITeam);

      }

      

      throw new Error('Failed to create team');

    } catch (error) {

      console.error('Error creating team in MongoDB:', error);

      throw error;

    }

  }



  async getEvaluations(): Promise<Evaluation[]> {

    try {

      const cached = await cacheService.getEvaluations();

      if (cached) {

        return cached.map(this.transformMongoEvaluation);

      }



      await connectDB();

      const evaluations = await EvaluationModel.find({}).lean() as unknown as IEvaluation[];

      

      const transformedEvals = evaluations.map(this.transformMongoEvaluation);

      await cacheService.setEvaluations(transformedEvals);

      

      return transformedEvals;

    } catch (error) {

      console.error('Error fetching evaluations from MongoDB:', error);

      throw error;

    }

  }



  async createEvaluation(insertEvaluation: InsertEvaluation): Promise<Evaluation> {

    try {

      await connectDB();

      const totalScore = 

        insertEvaluation.innovation + 

        insertEvaluation.techComplexity + 

        insertEvaluation.uiUx + 

        insertEvaluation.practicalImpact + 

        insertEvaluation.presentation;

      const newId = await this.getNextId("evaluations");

      

      const evaluationToInsert = {

        ...insertEvaluation,

        id: newId,

        totalScore,

        createdAt: new Date(),

      };



      const result = await EvaluationModel.create(evaluationToInsert);

      

      if (result) {

        await cacheService.invalidateEvaluationCache();

        return this.transformMongoEvaluation(result.toObject() as unknown as IEvaluation);

      }

      

      throw new Error('Failed to create evaluation');

    } catch (error) {

      console.error('Error creating evaluation in MongoDB:', error);

      throw error;

    }

  }



  private transformMongoTeam(doc: ITeam | { id: number; name: string; domain: string; problemStatement: string; lab: string; githubRepo: string; figmaLink: string | null; members: string[]; gitScore: number; createdAt: Date | null }): Team {

    return {

      id: doc.id,

      name: doc.name,

      domain: doc.domain,

      problemStatement: doc.problemStatement,

      lab: doc.lab,

      githubRepo: doc.githubRepo,

      figmaLink: doc.figmaLink ?? null,

      members: Array.from(doc.members),

      gitScore: doc.gitScore,

      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),

    };

  }



  private transformMongoEvaluation(doc: IEvaluation | { id: number; teamId: number; judgeId: string; innovation: number; techComplexity: number; uiUx: number; practicalImpact: number; presentation: number; totalScore: number; createdAt: Date | null }): Evaluation {

    return {

      id: doc.id,

      teamId: doc.teamId,

      judgeId: doc.judgeId,

      innovation: doc.innovation,

      techComplexity: doc.techComplexity,

      uiUx: doc.uiUx,

      practicalImpact: doc.practicalImpact,

      presentation: doc.presentation,

      totalScore: doc.totalScore,

      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),

    };

  }

}



export class MemStorage implements IStorage {

  private teams: Map<number, Team>;

  private evaluations: Map<number, Evaluation>;

  private currentTeamId: number;

  private currentEvaluationId: number;



  constructor() {

    this.teams = new Map();

    this.evaluations = new Map();

    this.currentTeamId = 1;

    this.currentEvaluationId = 1;

  }



  async getTeams(): Promise<Team[]> {

    return Array.from(this.teams.values()).sort((a, b) => 

      (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)

    );

  }



  async getTeam(id: number): Promise<Team | undefined> {

    return this.teams.get(id);

  }



  async createTeam(insertTeam: InsertTeam): Promise<Team> {

    const id = this.currentTeamId++;

    const gitScore = Math.floor(Math.random() * 16) + 5;

    const team: Team = { 

      ...insertTeam, 

      id, 

      gitScore, 

      figmaLink: insertTeam.figmaLink ?? null,

      createdAt: new Date() 

    };

    this.teams.set(id, team);

    return team;

  }



  async getEvaluations(): Promise<Evaluation[]> {

    return Array.from(this.evaluations.values());

  }



  async createEvaluation(insertEvaluation: InsertEvaluation): Promise<Evaluation> {

    const id = this.currentEvaluationId++;

    const totalScore = 

      insertEvaluation.innovation + 

      insertEvaluation.techComplexity + 

      insertEvaluation.uiUx + 

      insertEvaluation.practicalImpact + 

      insertEvaluation.presentation;



    const evaluation: Evaluation = { 

      ...insertEvaluation, 

      id, 

      totalScore, 

      createdAt: new Date() 

    } as Evaluation;

    this.evaluations.set(id, evaluation);

    return evaluation;

  }

}



class ResilientStorage implements IStorage {
  private mongo: MongoStorage | null = null;
  private mem = new MemStorage();
  private useMongo = !!process.env.MONGODB_URI;
  private mongoFailed = false;

  private getMongo(): MongoStorage {
    if (!this.mongo) this.mongo = new MongoStorage();
    return this.mongo;
  }

  private async withFallback<T>(mongoFn: () => Promise<T>, memFn: () => Promise<T>): Promise<T> {
    if (!this.useMongo || this.mongoFailed) return memFn();
    try {
      return await mongoFn();
    } catch (_error) {
      if (!this.mongoFailed) {
        this.mongoFailed = true;
        console.warn("MongoDB unavailable — using in-memory storage. Data will not persist across restarts.");
        // Retry connection after 30s
        setTimeout(() => { this.mongoFailed = false; }, 30000);
      }
      return memFn();
    }
  }

  async getTeams(): Promise<Team[]> {
    return this.withFallback(() => this.getMongo().getTeams(), () => this.mem.getTeams());
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.withFallback(() => this.getMongo().getTeam(id), () => this.mem.getTeam(id));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    return this.withFallback(() => this.getMongo().createTeam(team), () => this.mem.createTeam(team));
  }

  async getEvaluations(): Promise<Evaluation[]> {
    return this.withFallback(() => this.getMongo().getEvaluations(), () => this.mem.getEvaluations());
  }

  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    return this.withFallback(() => this.getMongo().createEvaluation(evaluation), () => this.mem.createEvaluation(evaluation));
  }
}

export const storage = new ResilientStorage();

