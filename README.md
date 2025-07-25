# Coaching App

A comprehensive coaching and performance management application built with modern web technologies.

## 🚀 Features

### 🔐 Authentication & Authorization
- **Multi-role system**: Admin, Manager, Team Leader, Agent
- **NextAuth.js** integration with secure credential-based authentication
- **Role-based access control** (RBAC) with permission management
- **Session management** with automatic redirects based on user roles

### 👥 User Management
- **Admin dashboard** with full user CRUD operations
- **Role management** with granular permission controls
- **User creation, editing, and deactivation**
- **Password management** with secure hashing (bcrypt)

### 📊 Performance Tracking
- **Agent scorecards** with 8 KPI metrics:
  - Service Quality
  - Productivity
  - Quality Assurance
  - Assiduity
  - Performance
  - Adherence
  - Lateness
  - Break Exceeds
- **Monthly/yearly performance analytics**
- **Trend analysis** and performance insights
- **Customizable metric weights**

### 🎯 Coaching Sessions
- **Session scheduling** and management
- **Performance notes** and action items
- **Progress tracking** over time
- **Team leader oversight** and reporting
- **Real-time session updates** via WebSocket

### 📈 Dashboards
- **Role-specific dashboards** for each user type
- **Real-time metrics** and performance indicators
- **Agent listings** with quick access to profiles and scorecards
- **Team overview** for team leaders and managers

### ✨ v2 Features
- **Quick Notes**: Capture coaching moments instantly with real-time sync
- **Action Items**: Track and manage action items from coaching sessions
- **Action Plans (PIPs)**: Comprehensive performance improvement plans
- **WebSocket Integration**: Real-time updates for sessions, notes, and notifications
- **AI-Powered Insights**:
  - Coaching recommendations based on performance data
  - Session insights and preparation assistance
  - Automated action item generation
  - Performance trend predictions
- **PostgreSQL Database**: Scalable database with advanced querying
- **Redis Caching**: Optional Redis integration for performance

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - Latest React with concurrent features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives

### Backend
- **[Prisma ORM](https://www.prisma.io/)** - Type-safe database access
- **[PostgreSQL](https://www.postgresql.org/)** - Production-ready database
- **[NextAuth.js](https://next-auth.js.org/)** - Authentication solution
- **[Socket.io](https://socket.io/)** - Real-time WebSocket communication
- **[Redis](https://redis.io/)** - Optional caching and pub/sub
- **[OpenAI API](https://openai.com/)** - AI-powered coaching insights
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** - Password hashing

### Development
- **[ESLint](https://eslint.org/)** - Code linting
- **[Prettier](https://prettier.io/)** - Code formatting
- **[tsx](https://github.com/esbuild-kit/tsx)** - TypeScript execution

## 🚦 Getting Started

### Prerequisites
- **Node.js** 18.x or later
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/GhanemP/coachingapp.git
   cd coachingapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Update the `.env.local` file with your configuration:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/coaching_app"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   REDIS_URL="redis://localhost:6379" # Optional
   OPENAI_API_KEY="your-openai-api-key" # For AI features
   ```

4. **Initialize the database**
   ```bash
   npx prisma db push
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   
   For WebSocket support, use:
   ```bash
   npm run dev:server
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 👤 Test Users

The application comes with pre-seeded test users:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | admin@company.com | password123 | Full system access |
| **Manager** | manager@company.com | password123 | Team management |
| **Team Leader** | teamleader1@company.com | password123 | Agent supervision |
| **Team Leader** | teamleader2@company.com | password123 | Agent supervision |
| **Agent** | agent1@company.com | password123 | Customer service |
| **Agent** | agent2@company.com | password123 | Customer service |
| **Agent** | agent3@company.com | password123 | Technical support |
| **Agent** | agent4@company.com | password123 | Technical support |

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin-only pages
│   ├── agent/             # Agent-specific pages
│   ├── agents/            # Agent management
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Role-based dashboards
│   ├── manager/           # Manager-specific pages
│   ├── sessions/          # Coaching sessions
│   └── team-leader/       # Team leader pages
├── components/            # Reusable UI components
│   └── ui/               # Base UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
├── types/                # TypeScript type definitions
└── utils/                # Helper functions

prisma/
├── schema.prisma         # Database schema
├── seed.ts              # Database seeding
└── migrations/          # Database migrations
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints
- `GET /api/auth/session` - Get current session

### Users
- `GET /api/users` - List all users with filtering
- `POST /api/users` - Create new user
- `GET /api/users/[id]` - Get user details
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/[id]` - Get agent details
- `GET /api/agents/[id]/metrics` - Get agent metrics
- `GET /api/agents/[id]/scorecard` - Get agent scorecard

### Coaching Sessions
- `GET /api/coaching/sessions` - List sessions
- `POST /api/coaching/sessions` - Create session
- `PATCH /api/coaching/sessions/[id]` - Update session
- `POST /api/coaching/sessions/[id]/complete` - Complete session

### Quick Notes
- `GET /api/quick-notes` - List quick notes
- `POST /api/quick-notes` - Create quick note
- `PATCH /api/quick-notes/[id]` - Update quick note

### Action Items
- `GET /api/action-items` - List action items
- `POST /api/action-items` - Create action item
- `PATCH /api/action-items/[id]` - Update action item

### AI-Powered Features
- `POST /api/ai/recommendations` - Get AI coaching recommendations
- `POST /api/ai/session-insights` - Get session insights
- `POST /api/ai/action-items` - Generate AI action items
- `GET /api/ai/performance/[agentId]/summary` - Get performance summary

### WebSocket Events
- Real-time quick notes
- Real-time action items
- Live session updates
- Instant notifications

See [API Documentation](API_DOCUMENTATION.md) for complete details.

## 🎨 UI Components

The application uses a custom component library built on **Radix UI** primitives:

- **Alert** - Contextual feedback messages
- **Avatar** - User profile images
- **Badge** - Status indicators
- **Button** - Interactive elements
- **Card** - Content containers
- **Dropdown Menu** - Action menus
- **Input** - Form inputs
- **Select** - Dropdown selections
- **Toast** - Notification system

## 📊 Database Schema

### Core Models
- **User** - Base user entity with role-based access
- **Agent** - Extended agent profile with employee details
- **Manager** - Manager-specific data
- **TeamLeader** - Team leader information
- **AgentMetric** - Performance metrics and scorecards
- **CoachingSession** - Coaching session records
- **Performance** - Historical performance data
- **QuickNote** - Quick coaching notes
- **ActionItem** - Action items from sessions
- **ActionPlan** - Performance improvement plans
- **ActionPlanItem** - Individual plan items

## 🔒 Security Features

- **Password hashing** with bcrypt
- **Session-based authentication** 
- **Role-based authorization**
- **CSRF protection**
- **SQL injection prevention** (Prisma ORM)
- **XSS protection** (React's built-in escaping)

## 📚 Documentation

- [API Documentation](API_DOCUMENTATION.md) - Complete REST API and WebSocket reference
- [WebSocket Implementation Guide](WEBSOCKET_IMPLEMENTATION_GUIDE.md) - Real-time features guide
- [Implementation Guide](IMPLEMENTATION_GUIDE.md) - Technical implementation details
- [Executive Summary](EXECUTIVE_SUMMARY.md) - Project overview and status
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues and solutions
- [Test Users](TEST_USERS.md) - Test account credentials

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start:prod
```

### Environment Variables (Production)
```env
DATABASE_URL="postgresql://user:password@host:5432/coaching_app"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret"
REDIS_URL="redis://your-redis-host:6379"
OPENAI_API_KEY="your-openai-api-key"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Support

For support and questions, please contact:
- **GitHub Issues**: [https://github.com/GhanemP/coachingapp/issues](https://github.com/GhanemP/coachingapp/issues)

---

Built with ❤️ using Next.js, React, and TypeScript.
