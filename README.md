# Multi-Lab Competition Platform

A comprehensive platform for managing multi-lab, multi-domain competitions with judge workflows, team management, and dynamic real-time leaderboards.

## Features

- **7 Physical Labs**: 114A, 114B, 308A, 308B, 220, 221, and 222
- **3 Competition Domains**: Each with independent leaderboards
- **Two-Round Structure**: Lab Round (all teams) → Final Round (top 5 per domain)
- **Judge Workflow**: Secure, lab-specific access with real-time scoring
- **Real-time Leaderboards**: Dynamic updates as judges submit marks
- **MongoDB + DynamoDB**: Scalable data storage and caching
- **WebSocket Integration**: Real-time updates for live competitions

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, Socket.io
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis for high-performance caching
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.io with Redis pub/sub

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB instance (local or MongoDB Atlas)
- Redis instance (local or Redis Cloud)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/competition-platform
MONGODB_DB=competition-platform

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application Configuration
NODE_ENV=development
PORT=3000
```

### Database Setup

1. **MongoDB**: Ensure your MongoDB instance is running and accessible via the `MONGODB_URI`

2. **Redis**: Ensure your Redis instance is running and accessible via the `REDIS_URL`

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) with your browser

3. Test the system:
```bash
# Test database connections and API routes
curl http://localhost:3000/api/test

# Initialize sample data
curl -X POST http://localhost:3000/api/test -H "Content-Type: application/json" -d '{"action":"initialize"}'
```

## API Routes

### Public Routes
- `GET /api/competition/status` - Get current competition state
- `GET /api/domains` - List all active domains
- `GET /api/labs` - List all active labs
- `GET /api/leaderboards/[domainId]/[round] - Get domain-specific leaderboard
- `GET /api/test` - System health check

### Judge Routes (Authentication Required)
- `POST /api/judge/login` - Judge authentication
- `GET /api/judge/teams` - Get teams for judge's lab/domain
- `POST /api/judge/scores` - Submit scores for teams
- `GET /api/judge/scores?domainId=X&round=Y` - Get leaderboard

## Architecture Overview

### Data Models
- **Lab**: Physical competition locations (114A, 114B, 308A, 308B, 220, 221, 222)
- **Domain**: Competition categories with independent scoring
- **Team**: Groups of participants assigned to labs and domains
- **Judge**: Competition officials with lab/domain assignments
- **Score**: Individual marks submitted by judges
- **Competition**: Overall competition state and round management

### Real-time Updates
1. Judge submits score → MongoDB storage
2. DynamoDB cache is updated and Stream triggered
3. Lambda function processes Stream event
4. WebSocket server broadcasts to connected clients
5. Frontend updates leaderboard in real-time

### Security Features
- Separate judge portal (`/judge`) from public access
- JWT-based authentication with role-based permissions
- Lab assignment enforcement during scoring
- Input validation and MongoDB injection prevention
- Secure cookie handling for refresh tokens

## Development

### Project Structure
```
src/
├── app/api/          # Next.js API routes
├── components/       # React components
├── lib/             # Utility functions and services
├── models/          # MongoDB Mongoose models
├── types/           # TypeScript type definitions
└── hooks/           # Custom React hooks
```

### Environment Variables
See `.env.example` for all required environment variables.

### Database Migrations
The application uses Mongoose models that automatically create collections. Use the `/api/test` endpoint to initialize sample data.

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb)
- [Socket.io Documentation](https://socket.io/docs)

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
