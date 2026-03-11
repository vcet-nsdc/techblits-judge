import { connectDB } from './mongodb';
import { Lab } from '@/models/Lab';
import { Domain } from '@/models/Domain';
import { Team } from '@/models/Team';
import { Judge } from '@/models/Judge';
import { Score } from '@/models/Score';
import { Competition } from '@/models/Competition';
import bcrypt from 'bcryptjs';

export async function testMongoDBConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    
    // Test database connection
    await connectDB();
    console.log('✅ MongoDB connected successfully');
    
    // Test model access
    const labCount = await Lab.countDocuments();
    const domainCount = await Domain.countDocuments();
    const teamCount = await Team.countDocuments();
    const judgeCount = await Judge.countDocuments();
    const scoreCount = await Score.countDocuments();
    const competitionCount = await Competition.countDocuments();
    
    console.log('📊 Database statistics:');
    console.log(`   Labs: ${labCount}`);
    console.log(`   Domains: ${domainCount}`);
    console.log(`   Teams: ${teamCount}`);
    console.log(`   Judges: ${judgeCount}`);
    console.log(`   Scores: ${scoreCount}`);
    console.log(`   Competitions: ${competitionCount}`);
    
    // Test basic operations
    const testLab = await Lab.findOne({ name: '308A' });
    if (testLab) {
      console.log('✅ Lab model working correctly');
    } else {
      console.log('⚠️  Lab "308A" not found (might need to be created)');
    }
    
    return {
      success: true,
      stats: {
        labs: labCount,
        domains: domainCount,
        teams: teamCount,
        judges: judgeCount,
        scores: scoreCount,
        competitions: competitionCount
      }
    };
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function initializeSampleData() {
  try {
    console.log('🔧 Initializing sample data...');
    
    await connectDB();
    
    // Create labs if they don't exist
    const labConfigs = [
      { name: '114A', location: 'Room 114A', assignedDomain: 'Agentic AI' },
      { name: '114B', location: 'Room 114B', assignedDomain: 'Agentic AI' },
      { name: '308A', location: 'Room 308A', assignedDomain: 'UI/UX Challenge' },
      { name: '308B', location: 'Room 308B', assignedDomain: 'UI/UX Challenge' },
      { name: '220',  location: 'Room 220',  assignedDomain: 'Vibecoding' },
      { name: '221',  location: 'Room 221',  assignedDomain: 'Vibecoding' },
      { name: '222',  location: 'Room 222',  assignedDomain: 'Vibecoding' },
    ];
    for (const labConfig of labConfigs) {
      const existingLab = await Lab.findOne({ name: labConfig.name });
      if (!existingLab) {
        await Lab.create(labConfig);
        console.log(`✅ Created lab: ${labConfig.name} → ${labConfig.assignedDomain}`);
      }
    }
    
    // Create sample domains if they don't exist
    const domains = [
      { name: 'Agentic AI',      description: 'Autonomous AI Agents and Intelligent Systems',    scoringCriteria: ['Algorithm Design', 'Accuracy', 'Efficiency'] },
      { name: 'Vibecoding',      description: 'Creative Vibe Coding and Rapid Prototyping',      scoringCriteria: ['Creativity', 'Functionality', 'Performance'] },
      { name: 'UI/UX Challenge', description: 'User Interface and User Experience Design',       scoringCriteria: ['Design', 'Usability', 'Accessibility'] },
    ];
    
    for (const domainData of domains) {
      const existingDomain = await Domain.findOne({ name: domainData.name });
      if (!existingDomain) {
        await Domain.create(domainData);
        console.log(`✅ Created domain: ${domainData.name}`);
      }
    }
    
    // Create default judge if none exists
    const existingJudge = await Judge.findOne({ email: 'JUDGETECHBILTZ' });
    if (!existingJudge) {
      // Get the first lab for assignment
      const firstLab = await Lab.findOne();
      if (!firstLab) {
        throw new Error('No labs found to assign judge');
      }
      
      // Get all domains for assignment
      const domains = await Domain.find();
      if (domains.length === 0) {
        throw new Error('No domains found to assign judge');
      }
      
      // Hash the password
      const passwordHash = await bcrypt.hash('NSDC@JUDGE', 12);
      
      // Create default judge
      await Judge.create({
        name: 'Default Judge',
        email: 'JUDGETECHBILTZ',
        passwordHash,
        assignedLabId: firstLab._id,
        assignedDomains: domains.map(d => d._id),
        role: 'lab_round',
        isActive: true
      });
      console.log('✅ Created default judge: JUDGETECHBILTZ');
    }
    
    // Create sample competition if none exists
    const existingCompetition = await Competition.findOne({ isActive: true });
    if (!existingCompetition) {
      await Competition.create({
        name: 'Multi-Lab Competition 2024',
        currentRound: 'lab_round',
        labRoundStartTime: new Date(),
        isActive: true
      });
      console.log('✅ Created sample competition');
    }
    
    console.log('🎉 Sample data initialization complete');
    return { success: true };
  } catch (error) {
    console.error('❌ Sample data initialization failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
