import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Judge } from '@/models/Judge';
import '@/models/Domain';
import '@/models/Lab';
import { JudgeRole, VenueType, JWTPayload } from '@/types/competition';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRE = '1h';
const REFRESH_TOKEN_EXPIRE = '7d';

export interface AuthResult {
  success: boolean;
  judge?: {
    id: string;
    name: string;
    email: string;
    role: string;
    assignedLabId?: string;
    assignedDomains?: string[];
  };
  token?: string;
  refreshToken?: string;
  error?: string;
}

export class AuthService {
  static async authenticateJudge(email: string, password: string): Promise<AuthResult> {
    try {
      const judge = await Judge.findOne({ email, isActive: true }).populate('assignedLabId assignedDomains');
      
      if (!judge) {
        return { success: false, error: 'Invalid credentials' };
      }

      const isValidPassword = await bcrypt.compare(password, judge.passwordHash);
      
      if (!isValidPassword) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Update last login
      await Judge.findByIdAndUpdate(judge._id, { lastLoginAt: new Date() });

      // Extract raw ObjectId values for token (populated fields are full docs)
      const rawLabId = judge.assignedLabId?._id ?? judge.assignedLabId;
      const rawDomainIds = judge.assignedDomains?.map((d: mongoose.Types.ObjectId | { _id: mongoose.Types.ObjectId }) => 
        typeof d === 'object' && '_id' in d ? d._id : d
      );

      const token = this.generateToken({
        _id: judge._id,
        role: judge.role,
        assignedLabId: rawLabId as mongoose.Types.ObjectId | undefined,
        assignedDomains: rawDomainIds as mongoose.Types.ObjectId[] | undefined,
      });
      const refreshToken = this.generateRefreshToken(judge);

      return {
        success: true,
        judge: {
          id: judge._id.toString(),
          name: judge.name,
          email: judge.email,
          role: judge.role,
          assignedLabId: rawLabId?.toString(),
          assignedDomains: rawDomainIds?.map((id: mongoose.Types.ObjectId) => id.toString())
        },
        token,
        refreshToken
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  static generateToken(judge: {
    _id: mongoose.Types.ObjectId;
    role: string;
    assignedLabId?: mongoose.Types.ObjectId;
    assignedDomains?: mongoose.Types.ObjectId[];
  }): string {
    const payload: JWTPayload = {
      userId: judge._id.toString(),
      role: judge.role === JudgeRole.ADMIN ? 'admin' : 'judge',
      labId: judge.assignedLabId?.toString(),
      assignedDomains: judge.assignedDomains?.map((id: mongoose.Types.ObjectId) => id.toString()),
      judgeRole: judge.role,
      isSeminarHallJudge: judge.role === JudgeRole.SEMINAR_HALL,
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
  }

  static generateRefreshToken(judge: { _id: mongoose.Types.ObjectId }): string {
    const payload = {
      userId: judge._id.toString(),
      type: 'refresh'
    };

    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static verifyRefreshToken(token: string): { userId: string; type: string } | null {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; type: string };
    } catch (error) {
      return null;
    }
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async createJudge(judgeData: {
    name: string;
    email: string;
    password: string;
    assignedLabId: string;
    assignedDomains: string[];
    role?: JudgeRole;
  }) {
    const passwordHash = await this.hashPassword(judgeData.password);
    
    const judge = new Judge({
      ...judgeData,
      passwordHash,
      role: judgeData.role || JudgeRole.LAB_ROUND
    });

    return await judge.save();
  }

  static async refreshAccessToken(refreshToken: string): Promise<{ token?: string; error?: string }> {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      
      if (!decoded || decoded.type !== 'refresh') {
        return { error: 'Invalid refresh token' };
      }

      const judge = await Judge.findById(decoded.userId).populate('assignedLabId assignedDomains');
      
      if (!judge || !judge.isActive) {
        return { error: 'Judge not found or inactive' };
      }

      const token = this.generateToken(judge);
      return { token };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { error: 'Token refresh failed' };
    }
  }
}
