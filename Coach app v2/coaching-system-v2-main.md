# Coaching Performance Management System V2

## 🎯 Project Overview
AI-Assisted development project for a comprehensive coaching and performance management system for call centers.

### Quick Start for AI Development
When using AI assistance (Copilot/Claude), reference these docs in order:
1. `README.md` (this file) - Overall context
2. `/docs/ARCHITECTURE.md` - System design
3. `/docs/DATABASE_SCHEMA.md` - Data model
4. `/docs/API_SPECIFICATION.md` - Endpoints
5. `/docs/UI_COMPONENTS.md` - Frontend structure

### Project Structure
```
coaching-system-v2/
├── README.md                    # Project overview (YOU ARE HERE)
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # System architecture
│   ├── DATABASE_SCHEMA.md       # Complete schema with comments
│   ├── API_SPECIFICATION.md     # API endpoints and contracts
│   ├── UI_COMPONENTS.md         # UI/UX specifications
│   ├── BUSINESS_LOGIC.md        # Core business rules
│   ├── EXCEL_IMPORT_SPEC.md     # Data import specifications
│   └── IMPLEMENTATION_PLAN.md   # Phased development plan
├── src/                         # Source code
│   ├── components/              # React components
│   ├── pages/                   # Next.js pages
│   ├── api/                     # API routes
│   ├── lib/                     # Utilities and helpers
│   ├── hooks/                   # Custom React hooks
│   └── types/                   # TypeScript definitions
├── prisma/                      # Database
│   └── schema.prisma            # Prisma schema
└── templates/                   # Excel templates
    └── import_templates/        # Data import templates

## 🚀 Core Features

### For Team Leaders
- **Smart Dashboard**: AI-prioritized coaching queue
- **Quick Notes**: Capture observations in real-time
- **Coaching Prep**: Auto-generated agendas with historical context
- **Live Sessions**: Integrated note-taking and action tracking

### For Managers
- **Strategic Overview**: Team performance matrices
- **Predictive Analytics**: AI-powered insights
- **Drill-down Navigation**: From team to individual metrics

### For Agents
- **Performance Journey**: Visual progress tracking
- **Learning Paths**: Personalized development resources
- **Action Plan Visibility**: Clear improvement targets

### For Admins
- **Excel Import System**: Bulk data management
- **Role Management**: Comprehensive access control
- **System Monitoring**: Real-time health metrics

## 💻 Tech Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express/Fastify
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Processing**: ExcelJS, Papa Parse
- **State Management**: Zustand
- **UI Components**: Radix UI, Shadcn/ui

## 📊 Key Metrics Goals
- Coaching prep time: 15 min → <5 min
- Action item completion: Unknown → >80%
- Performance improvement rate: Variable → >75%
- User adoption: 0% → >90%

## 🔗 AI Development Tips

### When building with AI assistance:
1. **Reference Context**: Always mention which module you're working on
2. **Use Type Definitions**: Reference types from `/src/types/`
3. **Follow Patterns**: Check existing components in `/src/components/`
4. **Database Context**: Include relevant schema from `/prisma/schema.prisma`
5. **Business Rules**: Verify logic against `/docs/BUSINESS_LOGIC.md`

### AI Prompt Examples:
```
"Based on the TeamLeaderDashboard interface in UI_COMPONENTS.md, 
create the React component with proper TypeScript types"

"Using the coaching_sessions table from DATABASE_SCHEMA.md, 
implement the GET /api/coaching/sessions/:id/prep endpoint"

"Following the Excel import specification in EXCEL_IMPORT_SPEC.md, 
create the validation logic for the performance metrics sheet"
```

## 📅 Development Phases
1. **Foundation** (Weeks 1-2): Core infrastructure
2. **Core Features** (Weeks 3-4): Main functionality
3. **Intelligence** (Weeks 5-6): AI features
4. **Polish** (Weeks 7-8): Testing and launch

See `/docs/IMPLEMENTATION_PLAN.md` for detailed timeline.

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- VS Code with extensions:
  - GitHub Copilot
  - Prisma
  - ESLint
  - Prettier

### Installation
```bash
# Clone repository
git clone [repository-url]

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## 📝 Development Workflow

### Using AI Effectively:
1. **Start with Documentation**: Read relevant .md files
2. **Reference Schemas**: Use database/API specs for accuracy
3. **Test Incrementally**: Build and test small pieces
4. **Maintain Types**: Keep TypeScript definitions updated
5. **Document Changes**: Update relevant .md files

### Commit Convention:
```
feat: Add quick note functionality
fix: Resolve session timer issue
docs: Update API specification
refactor: Optimize dashboard queries
test: Add coaching prep tests
```

## 🤝 Contributing
1. Create feature branch from `main`
2. Follow existing patterns and types
3. Update documentation as needed
4. Test thoroughly
5. Submit PR with clear description

## 📚 Additional Resources
- [Figma Designs](#) - UI/UX mockups
- [API Postman Collection](#) - API testing
- [Sample Data](#) - Test datasets
- [Training Videos](#) - User guides

---

**For AI-assisted development, always provide context by referencing the relevant documentation files. This ensures accurate and consistent code generation.**