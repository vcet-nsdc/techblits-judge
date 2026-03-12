import mongoose from 'mongoose';
import { Score } from '@/models/Score';
import { Team, type ITeam } from '@/models/Team';
import { Lab } from '@/models/Lab';
import { Competition } from '@/models/Competition';
import { CompetitionRound, LeaderboardEntry, VenueType } from '@/types/competition';
import { competitionCacheService } from './competition-cache';

export class LeaderboardService {
  static async syncTopTeamsToSeminarHall(limit = 5): Promise<{
    seminarHallId: string;
    qualifiedTeamIds: string[];
  }> {
    let seminarHall = await Lab.findOne({ type: VenueType.SEMINAR_HALL });
    if (!seminarHall) {
      seminarHall = await new Lab({
        name: 'Seminar Hall',
        location: 'Main Seminar Hall',
        type: VenueType.SEMINAR_HALL,
        capacity: 200,
        isActive: true
      }).save();
    }

    const topTeams = await this.getTopTeamsPerDomain(limit);
    const qualifiedTeamIds = topTeams.map((team) => team._id.toString());

    // Keep finals qualifiers in sync with the latest lab round leaderboard.
    await Team.updateMany(
      { isActive: true },
      { $set: { qualifiedForFinals: false, finalVenueId: null } }
    );

    if (qualifiedTeamIds.length > 0) {
      await Team.updateMany(
        { _id: { $in: qualifiedTeamIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { $set: { qualifiedForFinals: true, finalVenueId: seminarHall._id } }
      );
    }

    return {
      seminarHallId: seminarHall._id.toString(),
      qualifiedTeamIds
    };
  }

  /**
   * Calculate the Seminar Hall finals leaderboard for a specific domain.
   * Only includes qualifying teams (qualifiedForFinals=true) scored in the finals round.
   */
  static async calculateFinalsLeaderboard(domainId: string): Promise<LeaderboardEntry[]> {
    try {
      const seminarHall = await Lab.findOne({ type: VenueType.SEMINAR_HALL });
      if (!seminarHall) {
        // No Seminar Hall configured yet — return empty
        return [];
      }

      const competition = await Competition.findOne({ isActive: true });
      const finalsStartTime = competition?.finalsStartTime || new Date(0);

      const scores = await Score.aggregate([
        {
          $match: {
            domainId: new mongoose.Types.ObjectId(domainId),
            round: 'finals',
            venueId: seminarHall._id,
            submittedAt: { $gte: finalsStartTime }
          }
        },
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
        { $sort: { totalScore: -1 } }
      ]);

      return scores.map((score, index) => ({
        teamId: score._id.toString(),
        teamName: score.teamName,
        labId: score.labId.toString(),
        domainId: score.domainId.toString(),
        totalScore: score.totalScore,
        rank: index + 1,
        judgeCount: score.judgeCount,
        lastUpdated: score.lastUpdated
      }));
    } catch (error) {
      console.error('Error calculating finals leaderboard:', error);
      throw new Error('Failed to calculate finals leaderboard');
    }
  }

  /**
   * Get the finals leaderboard (cache-first) for a domain.
   */
  static async getFinalsLeaderboard(domainId: string): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:${domainId}:finals:seminar_hall`;
    const cached = await competitionCacheService.getLeaderboard(domainId, 'finals:seminar_hall');
    if (cached) return cached;

    const leaderboard = await this.calculateFinalsLeaderboard(domainId);
    await competitionCacheService.setLeaderboard(domainId, 'finals:seminar_hall', leaderboard);
    return leaderboard;
  }

  /**
   * Invalidate the finals leaderboard cache for a domain.
   */
  static async invalidateFinalsLeaderboard(domainId: string): Promise<void> {
    await competitionCacheService.invalidateLeaderboard(domainId, 'finals:seminar_hall');
  }

  static async calculateLeaderboard(domainId: string, round: CompetitionRound): Promise<LeaderboardEntry[]> {
    try {
      // Get current competition to determine start time
      const competition = await Competition.findOne({ isActive: true });
      const competitionStartTime = competition?.labRoundStartTime || new Date(0);

      // Use MongoDB aggregation for efficient leaderboard calculation
      const scores = await Score.aggregate([
        {
          $match: {
            domainId: new mongoose.Types.ObjectId(domainId),
            round,
            submittedAt: { $gte: competitionStartTime }
          }
        },
        {
          $lookup: {
            from: 'teams',
            localField: 'teamId',
            foreignField: '_id',
            as: 'team'
          }
        },
        {
          $unwind: '$team'
        },
        {
          $group: {
            _id: '$teamId',
            teamName: { $first: '$team.name' },
            labId: { $first: '$team.labId' },
            domainId: { $first: '$team.domainId' },
            totalScore: { $sum: '$marks' },
            lastUpdated: { $max: '$submittedAt' },
            scoreCount: { $sum: 1 }
          }
        },
        {
          $sort: { totalScore: -1 }
        }
      ]);

      // Assign ranks and format results
      return scores.map((score, index) => ({
        teamId: score._id.toString(),
        teamName: score.teamName,
        labId: score.labId.toString(),
        domainId: score.domainId.toString(),
        totalScore: score.totalScore,
        rank: index + 1,
        lastUpdated: score.lastUpdated
      }));
    } catch (error) {
      console.error('Error calculating leaderboard:', error);
      throw new Error('Failed to calculate leaderboard');
    }
  }

  static async getLeaderboard(domainId: string, round: CompetitionRound): Promise<LeaderboardEntry[]> {
    // Try to get from cache first
    const cachedLeaderboard = await competitionCacheService.getLeaderboard(domainId, round);
    
    if (cachedLeaderboard) {
      return cachedLeaderboard;
    }

    // Calculate fresh leaderboard
    const leaderboard = await this.calculateLeaderboard(domainId, round);
    
    // Cache the result
    await competitionCacheService.setLeaderboard(domainId, round, leaderboard);
    
    return leaderboard;
  }

  static async getTopTeamsPerDomain(limit: number): Promise<ITeam[]> {
    const domains = await mongoose.connection.db?.collection('domains').find({ isActive: true }).toArray() || [];
    const topTeams: ITeam[] = [];
    
    for (const domain of domains) {
      const leaderboard = await this.getLeaderboard(domain._id.toString(), CompetitionRound.LAB_ROUND);
      const topDomainTeams = leaderboard.slice(0, limit);
      
      const teams = await Team.find({
        _id: { $in: topDomainTeams.map(entry => new mongoose.Types.ObjectId(entry.teamId)) }
      });
      
      topTeams.push(...teams);
    }
    
    return topTeams;
  }

  static async invalidateLeaderboard(domainId: string, round: CompetitionRound): Promise<void> {
    await competitionCacheService.invalidateLeaderboard(domainId, round);
  }

  static async getAllLeaderboards(round: CompetitionRound): Promise<Record<string, LeaderboardEntry[]>> {
    const domains = await mongoose.connection.db?.collection('domains').find({ isActive: true }).toArray() || [];
    const leaderboards: Record<string, LeaderboardEntry[]> = {};
    
    for (const domain of domains) {
      leaderboards[domain._id.toString()] = await this.getLeaderboard(domain._id.toString(), round);
    }
    
    return leaderboards;
  }
}
