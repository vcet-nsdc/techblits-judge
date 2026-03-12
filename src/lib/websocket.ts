import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import { LeaderboardService } from './leaderboard';
import { competitionCacheService } from './competition-cache';
import { CompetitionRound } from '@/types/competition';

export interface SocketServer {
  io: SocketIOServer | null;
  init: () => SocketIOServer;
}

class SocketServerImpl implements SocketServer {
  public io: SocketIOServer | null = null;

  public init(): SocketIOServer {
    if (this.io) {
      return this.io;
    }

    // This would typically be initialized in the server setup
    // For Next.js, we'll use a different approach
    throw new Error('Socket.IO server not initialized');
  }
}

export const socketServer = new SocketServerImpl();

// WebSocket event handlers
export class WebSocketHandler {
  static handleLeaderboardUpdates(socket: {
    join: (room: string) => void;
    emit: (event: string, data: unknown) => void;
  }, domainId: string, round: CompetitionRound): void {
    const room = `leaderboard:${domainId}:${round}`;
    socket.join(room);
    
    // Send current leaderboard immediately
    const leaderboardPromise = round === CompetitionRound.FINALS
      ? LeaderboardService.getFinalsLeaderboard(domainId)
      : LeaderboardService.getLeaderboard(domainId, round);

    leaderboardPromise.then(leaderboard => {
      socket.emit('leaderboard_update', { domainId, round, leaderboard });
    });
  }

  static handleScoreSubmission(socket: {
    to: (room: string) => {
      emit: (event: string, data: unknown) => void;
    };
  }, data: {
    domainId: string;
    round: CompetitionRound;
    score: unknown;
  }): void {
    const room = `leaderboard:${data.domainId}:${data.round}`;
    socket.to(room).emit('score_submitted', {
      domainId: data.domainId,
      round: data.round,
      score: data.score,
      timestamp: new Date().toISOString()
    });
  }

  static handleRoundTransition(socket: {
    broadcast: {
      emit: (event: string, data: unknown) => void;
    };
  }, newRound: CompetitionRound): void {
    socket.broadcast.emit('round_transition', {
      round: newRound,
      timestamp: new Date().toISOString()
    });
  }

  static async processScoreUpdates(): Promise<void> {
    try {
      // Get all domains from database
      const domains = await mongoose.connection.db?.collection('domains').find({ isActive: true }).toArray();
      
      if (!domains) return;

      for (const domain of domains) {
        for (const round of [CompetitionRound.LAB_ROUND, CompetitionRound.FINALS]) {
          const updates = await competitionCacheService.getQueuedUpdates(domain._id.toString(), round);
          
          for (const update of updates) {
            try {
              // Process the score update
              const leaderboard = round === CompetitionRound.FINALS
                ? await LeaderboardService.getFinalsLeaderboard(domain._id.toString())
                : await LeaderboardService.getLeaderboard(domain._id.toString(), round);
              
              // Broadcast to all connected clients
              if (socketServer.io) {
                socketServer.io.to(`leaderboard:${domain._id.toString()}:${round}`).emit('leaderboard_update', {
                  domainId: domain._id.toString(),
                  round,
                  leaderboard,
                  timestamp: new Date().toISOString()
                });
              }

              // Mark update as processed
              await competitionCacheService.markUpdateProcessed(
                domain._id.toString(),
                round,
                update.timestamp,
                update.teamId,
                update.judgeId
              );
            } catch (error) {
              console.error('Error processing score update:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing score updates:', error);
    }
  }
}

// Interval for processing queued updates
setInterval(() => {
  WebSocketHandler.processScoreUpdates();
}, 5000); // Process every 5 seconds
