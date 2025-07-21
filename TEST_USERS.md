# Test Users for Coaching App

## Login Credentials

All test users use the same password: **password123**

### Admin Account
- **Email:** admin@company.com
- **Name:** System Administrator
- **Role:** ADMIN
- **Access:** Full system access

### Manager Account
- **Email:** manager@company.com
- **Name:** Sarah Johnson
- **Role:** MANAGER
- **Department:** Customer Service
- **Access:** Can manage team leaders, view all reports

### Team Leader Accounts

#### Team Leader 1
- **Email:** teamleader1@company.com
- **Name:** Michael Chen
- **Role:** TEAM_LEADER
- **Team:** Customer Service Team A
- **Access:** Can manage agents, fill scorecards

#### Team Leader 2
- **Email:** teamleader2@company.com
- **Name:** Emily Rodriguez
- **Role:** TEAM_LEADER
- **Team:** Technical Support Team
- **Access:** Can manage agents, fill scorecards

### Agent Accounts

#### Agent 1
- **Email:** agent1@company.com
- **Name:** David Wilson
- **Role:** AGENT
- **Department:** Customer Service
- **Team Leader:** Michael Chen
- **Employee ID:** EMP001

#### Agent 2
- **Email:** agent2@company.com
- **Name:** Jessica Martinez
- **Role:** AGENT
- **Department:** Customer Service
- **Team Leader:** Michael Chen
- **Employee ID:** EMP002

#### Agent 3
- **Email:** agent3@company.com
- **Name:** Ryan Thompson
- **Role:** AGENT
- **Department:** Technical Support
- **Team Leader:** Emily Rodriguez
- **Employee ID:** EMP003

#### Agent 4
- **Email:** agent4@company.com
- **Name:** Sophia Lee
- **Role:** AGENT
- **Department:** Technical Support
- **Team Leader:** Emily Rodriguez
- **Employee ID:** EMP004

## Troubleshooting

### ChunkLoadError Fix
If you encounter a ChunkLoadError:

1. Clear your browser cache and cookies
2. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
3. If the error persists, restart the development server:
   ```bash
   # Stop the server (Ctrl+C)
   # Clear Next.js cache
   rm -rf .next
   # Restart the server
   npm run dev
   ```

### Login URL
Access the login page at: http://localhost:3000/auth/signin