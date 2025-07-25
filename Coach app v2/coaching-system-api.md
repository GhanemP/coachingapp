# API Specification

## Overview
RESTful API specification for the Coaching Performance Management System. All endpoints follow REST conventions and return JSON responses.

## Base Configuration

### Base URL
```
Development: http://localhost:3000/api
Staging: https://staging-api.coaching-system.com/api
Production: https://api.coaching-system.com/api
```

### Authentication
```typescript
// AI Context: All requests require JWT token in header
headers: {
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
```

### Standard Response Format
```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-28T10:30:00Z",
    "version": "1.0"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { ... }
  },
  "meta": { ... }
}
```

### Pagination
```typescript
// Request
GET /api/resource?page=1&limit=20&sort=created_at:desc

// Response
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Authentication Endpoints

### POST /api/auth/login
```typescript
// Request
{
  "email": "user@example.com",
  "password": "secure_password"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "TEAM_LEADER"
    },
    "token": "jwt_token",
    "expiresIn": 86400
  }
}
```

### POST /api/auth/refresh
```typescript
// Request
{
  "refreshToken": "refresh_token"
}

// Response
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expiresIn": 86400
  }
}
```

### POST /api/auth/logout
```typescript
// No body required
// Response
{
  "success": true,
  "message": "Logged out successfully"
}
```

## User Management

### GET /api/users
```typescript
// Query Parameters
{
  "role": "AGENT",        // Filter by role
  "status": "ACTIVE",     // Filter by status
  "team_leader_id": "uuid", // Filter by team leader
  "search": "john",       // Search by name/email
  "page": 1,
  "limit": 20
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "agent@example.com",
      "name": "John Agent",
      "role": "AGENT",
      "status": "ACTIVE",
      "team_leader": {
        "id": "uuid",
        "name": "Sarah Leader"
      },
      "department": "Customer Service",
      "hire_date": "2023-01-15",
      "last_login_at": "2025-01-28T09:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### GET /api/users/:id
```typescript
// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "agent@example.com",
    "name": "John Agent",
    "role": "AGENT",
    "status": "ACTIVE",
    "profile": {
      "learning_style": "VISUAL",
      "shift_pattern": "MORNING",
      "strengths": ["Customer empathy", "Technical knowledge"],
      "development_areas": ["Call control", "Time management"]
    },
    "metrics_summary": {
      "current_composite_score": 84.5,
      "trend": "IMPROVING",
      "active_action_plan": false
    }
  }
}
```

### POST /api/users
```typescript
// Request
{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "temporary_password",
  "role": "AGENT",
  "team_leader_id": "uuid",
  "department": "Customer Service",
  "hire_date": "2025-01-28"
}

// Response
{
  "success": true,
  "data": {
    "id": "new_uuid",
    "email": "newuser@example.com",
    // ... full user object
  }
}
```

### PATCH /api/users/:id
```typescript
// Request (partial update)
{
  "status": "PIP",
  "team_leader_id": "new_team_leader_uuid"
}

// Response
{
  "success": true,
  "data": {
    // ... updated user object
  }
}
```

## Performance Metrics

### GET /api/metrics/agent/:agentId
```typescript
// Query Parameters
{
  "date": "2025-01-28",      // Specific date
  "start_date": "2025-01-01", // Date range
  "end_date": "2025-01-28"
}

// Response
{
  "success": true,
  "data": {
    "agent_id": "uuid",
    "metrics": [
      {
        "date": "2025-01-28",
        "service_score": 85.5,
        "productivity_score": 92.0,
        "quality_score": 78.3,
        "attendance_rate": 100.0,
        "adherence_score": 88.0,
        "composite_score": 87.2,
        "details": {
          "csat": 4.2,
          "fcr": 85.0,
          "aht": 325,
          "calls_handled": 78
        }
      }
    ]
  }
}
```

### GET /api/metrics/agent/:agentId/history
```typescript
// Query Parameters
{
  "period": "WEEK|MONTH|QUARTER",
  "periods": 12  // Number of periods to retrieve
}

// Response
{
  "success": true,
  "data": {
    "agent_id": "uuid",
    "period_type": "WEEK",
    "history": [
      {
        "period_ending": "2025-01-26",
        "avg_composite_score": 86.5,
        "trends": {
          "service": +2.3,
          "productivity": -1.5,
          "quality": +5.2
        },
        "annotations": [
          {
            "date": "2025-01-22",
            "type": "TRAINING",
            "description": "Completed advanced troubleshooting course"
          }
        ]
      }
    ]
  }
}
```

### POST /api/metrics/bulk-update
```typescript
// Request
{
  "metrics": [
    {
      "agent_id": "uuid1",
      "date": "2025-01-28",
      "service_score": 85.5,
      "productivity_score": 92.0,
      // ... all metric fields
    },
    // ... more agent metrics
  ]
}

// Response
{
  "success": true,
  "data": {
    "processed": 25,
    "successful": 24,
    "failed": 1,
    "errors": [
      {
        "agent_id": "uuid5",
        "error": "Duplicate entry for date"
      }
    ]
  }
}
```

## Coaching Sessions

### GET /api/coaching/sessions
```typescript
// Query Parameters
{
  "agent_id": "uuid",
  "team_leader_id": "uuid",
  "status": "SCHEDULED|COMPLETED",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "session_type": "REGULAR|PIP_CHECK",
  "page": 1,
  "limit": 20
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "session_uuid",
      "agent": {
        "id": "uuid",
        "name": "John Agent"
      },
      "team_leader": {
        "id": "uuid",
        "name": "Sarah Leader"
      },
      "scheduled_date": "2025-01-29T14:00:00Z",
      "status": "SCHEDULED",
      "session_type": "REGULAR",
      "topics_covered": ["Quality improvement", "Call control"],
      "effectiveness_score": null
    }
  ],
  "pagination": { ... }
}
```

### GET /api/coaching/sessions/:id/prep
```typescript
// AI Context: Get all preparation data for a session
// Response
{
  "success": true,
  "data": {
    "session": {
      "id": "session_uuid",
      "scheduled_date": "2025-01-29T14:00:00Z",
      "agent": { ... }
    },
    "agent_profile": {
      "learning_style": "VISUAL",
      "motivators": ["Recognition", "Growth"],
      "recent_achievements": ["Perfect attendance", "CSAT improvement"]
    },
    "current_metrics": {
      "composite_score": 82.5,
      "weakest_areas": ["Quality", "AHT"],
      "strongest_areas": ["Attendance", "Customer satisfaction"]
    },
    "historical_trends": {
      "3_month_trend": "DECLINING",
      "key_events": [
        {
          "date": "2025-01-05",
          "event": "System training completed"
        }
      ]
    },
    "unaddressed_notes": [
      {
        "id": "note_uuid",
        "date": "2025-01-27",
        "type": "COACHING",
        "content": "Struggled with billing inquiries",
        "category": "Product Knowledge"
      }
    ],
    "previous_sessions": [
      {
        "date": "2025-01-15",
        "effectiveness": 4,
        "topics": ["Time management"],
        "completed_actions": 2,
        "pending_actions": 1
      }
    ],
    "suggested_agenda": [
      {
        "topic": "Review billing process",
        "duration": 15,
        "priority": "HIGH",
        "resources": ["Billing quick reference guide"]
      },
      {
        "topic": "Practice call control techniques",
        "duration": 10,
        "priority": "MEDIUM"
      }
    ],
    "effectiveness_insights": {
      "successful_methods": ["Role-play", "Peer shadowing"],
      "unsuccessful_methods": ["Self-study videos"],
      "recommended_approach": "Interactive demonstration with practice"
    }
  }
}
```

### POST /api/coaching/sessions
```typescript
// Request
{
  "agent_id": "uuid",
  "scheduled_date": "2025-01-29T14:00:00Z",
  "session_type": "REGULAR",
  "prep_notes": "Focus on quality scores and billing knowledge",
  "agenda_items": [
    "Review last session commitments",
    "Discuss billing challenges",
    "Role-play practice"
  ]
}

// Response
{
  "success": true,
  "data": {
    "id": "new_session_uuid",
    "agent_id": "uuid",
    "team_leader_id": "current_user_uuid",
    "scheduled_date": "2025-01-29T14:00:00Z",
    "status": "SCHEDULED",
    // ... full session object
  }
}
```

### POST /api/coaching/sessions/:id/start
```typescript
// AI Context: Begin a live coaching session
// Request
{
  "actual_start_time": "2025-01-29T14:02:00Z"
}

// Response
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "status": "IN_PROGRESS",
    "websocket_room": "session_uuid_room",
    "auto_save_enabled": true
  }
}
```

### PATCH /api/coaching/sessions/:id
```typescript
// AI Context: Update session during or after
// Request
{
  "discussion_notes": "Agent showed good understanding...",
  "topics_covered": ["Billing process", "Call control"],
  "engagement_score": 4,
  "understanding_score": 4,
  "agent_commitments": "Will practice billing scenarios daily"
}

// Response
{
  "success": true,
  "data": {
    // ... updated session object
  }
}
```

### POST /api/coaching/sessions/:id/complete
```typescript
// Request
{
  "actual_end_time": "2025-01-29T14:47:00Z",
  "overall_effectiveness": 4,
  "key_achievements": "Demonstrated improved product knowledge",
  "areas_of_concern": "Still struggling with call duration",
  "follow_up_required": true,
  "follow_up_date": "2025-02-05",
  "follow_up_topics": ["Check billing knowledge retention"]
}

// Response
{
  "success": true,
  "data": {
    "session": { ... },
    "created_action_items": [
      {
        "id": "action_uuid",
        "title": "Practice billing scenarios",
        "due_date": "2025-02-01"
      }
    ],
    "notifications_sent": ["email_to_agent", "calendar_update"]
  }
}
```

## Quick Notes

### GET /api/notes
```typescript
// Query Parameters
{
  "agent_id": "uuid",
  "team_leader_id": "uuid",
  "addressed": false,
  "note_type": "COACHING|POSITIVE|URGENT",
  "priority": "HIGH",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "page": 1,
  "limit": 50
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "note_uuid",
      "agent": {
        "id": "uuid",
        "name": "John Agent"
      },
      "team_leader": {
        "id": "uuid",
        "name": "Sarah Leader"
      },
      "note_type": "COACHING",
      "category": "Call Quality",
      "content": "Struggled with de-escalation on difficult call",
      "priority": "HIGH",
      "created_at": "2025-01-28T10:30:00Z",
      "addressed": false,
      "linked_session_id": null
    }
  ],
  "pagination": { ... }
}
```

### POST /api/notes
```typescript
// Request
{
  "agent_id": "uuid",
  "note_type": "POSITIVE",
  "category": "Customer Service",
  "content": "Excellent handling of upset customer, turned situation around",
  "priority": "LOW",
  "requires_follow_up": false
}

// Response
{
  "success": true,
  "data": {
    "id": "new_note_uuid",
    // ... full note object
  }
}
```

### POST /api/notes/:id/link-session
```typescript
// Request
{
  "session_id": "session_uuid"
}

// Response
{
  "success": true,
  "data": {
    "note_id": "note_uuid",
    "linked_session_id": "session_uuid",
    "addressed": false // Will be marked true when session completes
  }
}
```

## Action Items

### GET /api/actions
```typescript
// Query Parameters
{
  "agent_id": "uuid",
  "session_id": "uuid",
  "status": "PENDING|OVERDUE|COMPLETED",
  "priority": "HIGH",
  "assigned_by": "uuid",
  "due_date_start": "2025-01-01",
  "due_date_end": "2025-01-31"
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "action_uuid",
      "title": "Complete billing training module",
      "description": "Focus on sections 3-5 about complex scenarios",
      "agent": {
        "id": "uuid",
        "name": "John Agent"
      },
      "session": {
        "id": "session_uuid",
        "date": "2025-01-15"
      },
      "due_date": "2025-02-01",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "progress_percentage": 60,
      "progress_notes": "Completed sections 1-3"
    }
  ]
}
```

### POST /api/actions
```typescript
// Request
{
  "session_id": "session_uuid", // Optional if creating standalone
  "agent_id": "uuid",
  "title": "Shadow senior agent for 2 hours",
  "description": "Focus on call control and time management",
  "category": "TRAINING",
  "due_date": "2025-02-05",
  "priority": "MEDIUM"
}

// Response
{
  "success": true,
  "data": {
    "id": "new_action_uuid",
    // ... full action object
  }
}
```

### PATCH /api/actions/:id
```typescript
// Request
{
  "status": "COMPLETED",
  "progress_percentage": 100,
  "completion_notes": "Shadowed Janet for 2.5 hours, learned new techniques",
  "completed_date": "2025-02-04T16:00:00Z"
}

// Response
{
  "success": true,
  "data": {
    // ... updated action object
  }
}
```

## Action Plans (PIPs)

### GET /api/action-plans
```typescript
// Query Parameters
{
  "agent_id": "uuid",
  "status": "ACTIVE|COMPLETED",
  "created_by": "uuid",
  "include_progress": true
}

// Response
{
  "success": true,
  "data": [
    {
      "id": "plan_uuid",
      "agent": {
        "id": "uuid",
        "name": "John Agent"
      },
      "start_date": "2025-01-15",
      "target_end_date": "2025-02-14",
      "status": "ACTIVE",
      "current_progress": 45,
      "target_metrics": {
        "quality_score": {
          "target": 85,
          "current": 78,
          "trend": "IMPROVING"
        },
        "attendance_rate": {
          "target": 95,
          "current": 96,
          "trend": "ACHIEVED"
        }
      },
      "days_remaining": 17,
      "next_check_in": "2025-01-30"
    }
  ]
}
```

### POST /api/action-plans
```typescript
// Request
{
  "agent_id": "uuid",
  "start_date": "2025-01-30",
  "target_end_date": "2025-02-28",
  "reason_for_plan": "Quality scores below 75% for 3 consecutive weeks",
  "target_metrics": {
    "quality_score": {
      "current": 72,
      "target": 85
    },
    "aht": {
      "current": 385,
      "target": 330
    }
  },
  "success_criteria": {
    "mandatory": [
      "quality_score >= 85",
      "aht <= 330",
      "no_compliance_violations"
    ],
    "recommended": [
      "complete_advanced_training",
      "positive_customer_feedback"
    ]
  },
  "check_in_frequency": "WEEKLY"
}

// Response
{
  "success": true,
  "data": {
    "id": "new_plan_uuid",
    "status": "DRAFT",
    // ... full plan object
  }
}
```

### POST /api/action-plans/:id/check-in
```typescript
// Request
{
  "current_metrics": {
    "quality_score": 79,
    "aht": 355
  },
  "progress_notes": "Showing improvement in quality, still working on call efficiency",
  "agent_feedback": "Finding the daily practice helpful",
  "next_steps": "Continue role-play sessions, add time management techniques",
  "extend_plan": false
}

// Response
{
  "success": true,
  "data": {
    "plan": { ... },
    "progress_update": {
      "date": "2025-01-30",
      "overall_progress": 55,
      "metrics_on_track": ["quality_score"],
      "metrics_behind": ["aht"],
      "recommendation": "CONTINUE" // or "EXTEND" or "ESCALATE"
    }
  }
}
```

## Data Import

### POST /api/import/validate
```typescript
// AI Context: Pre-validate Excel file before processing
// Request (multipart/form-data)
{
  "file": File,
  "import_type": "METRICS|USERS|COACHING_HISTORY"
}

// Response
{
  "success": true,
  "data": {
    "validation_id": "validation_uuid",
    "file_info": {
      "name": "metrics_january_2025.xlsx",
      "size_bytes": 156789,
      "sheets": ["Performance_Data", "Detailed_Metrics", "Team_Mapping"]
    },
    "validation_results": {
      "total_rows": 156,
      "valid_rows": 154,
      "errors": [
        {
          "sheet": "Performance_Data",
          "row": 45,
          "column": "service_score",
          "error": "Value 105 exceeds maximum of 100"
        }
      ],
      "warnings": [
        {
          "sheet": "Team_Mapping",
          "row": 23,
          "warning": "Agent A045 not found, will create new"
        }
      ]
    },
    "can_proceed": true
  }
}
```

### POST /api/import/execute
```typescript
// Request
{
  "validation_id": "validation_uuid",
  "options": {
    "update_existing": true,
    "create_missing_users": false,
    "dry_run": false
  }
}

// Response
{
  "success": true,
  "data": {
    "import_id": "import_uuid",
    "status": "PROCESSING",
    "job_url": "/api/import/status/import_uuid"
  }
}
```

### GET /api/import/status/:jobId
```typescript
// Response
{
  "success": true,
  "data": {
    "import_id": "import_uuid",
    "status": "SUCCESS",
    "started_at": "2025-01-28T10:00:00Z",
    "completed_at": "2025-01-28T10:00:45Z",
    "statistics": {
      "total_rows": 156,
      "processed": 156,
      "successful": 154,
      "failed": 2,
      "created": 10,
      "updated": 144
    },
    "errors": [
      {
        "row": 45,
        "error": "Duplicate entry for agent A023 on date 2025-01-27"
      }
    ]
  }
}
```

### GET /api/import/templates/:type
```typescript
// Response: File download
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="metrics_import_template.xlsx"
```

## Analytics & Reporting

### GET /api/reports/dashboard/:role
```typescript
// AI Context: Role-specific dashboard data
// Parameters
{
  "role": "TEAM_LEADER|MANAGER|ADMIN"
}

// Response for TEAM_LEADER
{
  "success": true,
  "data": {
    "summary_stats": {
      "total_agents": 12,
      "agents_needing_coaching": 3,
      "active_action_plans": 2,
      "pending_actions": 15,
      "unaddressed_notes": 8
    },
    "priority_queue": [
      {
        "agent_id": "uuid",
        "name": "John Agent",
        "urgency_score": 92,
        "primary_issue": "Quality decline",
        "days_since_coaching": 14,
        "metrics_trend": "DECLINING"
      }
    ],
    "team_performance": {
      "current_average": 84.5,
      "previous_average": 82.1,
      "trend": "IMPROVING",
      "top_performers": [...],
      "bottom_performers": [...]
    },
    "recent_activity": [
      {
        "type": "NOTE_ADDED",
        "timestamp": "2025-01-28T09:45:00Z",
        "details": "Quality concern noted for Agent Smith"
      }
    ]
  }
}
```

### GET /api/analytics/correlations
```typescript
// AI Context: Find relationships between metrics
// Query Parameters
{
  "metric1": "quality_score",
  "metric2": "aht",
  "period": "30_days",
  "min_correlation": 0.5
}

// Response
{
  "success": true,
  "data": {
    "correlations": [
      {
        "metrics": ["quality_score", "aht"],
        "correlation_coefficient": -0.72,
        "interpretation": "Strong negative correlation",
        "insight": "Agents with lower AHT tend to have higher quality scores"
      },
      {
        "metrics": ["attendance_rate", "quality_score"],
        "correlation_coefficient": 0.65,
        "interpretation": "Moderate positive correlation",
        "insight": "Better attendance correlates with higher quality"
      }
    ],
    "recommendations": [
      "Focus on time management without sacrificing quality",
      "Ensure consistent attendance for quality improvement"
    ]
  }
}
```

### GET /api/analytics/predictions
```typescript
// AI Context: ML-based predictions
// Query Parameters
{
  "agent_id": "uuid",
  "prediction_type": "PERFORMANCE|ATTRITION|ACTION_PLAN_SUCCESS"
}

// Response
{
  "success": true,
  "data": {
    "agent_id": "uuid",
    "predictions": {
      "30_day_performance": {
        "composite_score": 86.5,
        "confidence": 0.78,
        "factors": [
          "Recent improvement trend",
          "Completed training",
          "Positive coaching outcomes"
        ]
      },
      "action_plan_success": {
        "probability": 0.72,
        "estimated_completion": "2025-02-20",
        "risk_factors": ["Historical AHT struggles"],
        "success_factors": ["High engagement", "Good attendance"]
      },
      "attrition_risk": {
        "6_month_risk": 0.15,
        "risk_level": "LOW",
        "factors": ["Stable performance", "Good team fit"]
      }
    }
  }
}
```

## WebSocket Events

### Session Real-time Updates
```typescript
// AI Context: WebSocket events for live coaching
// Connect to: wss://api.coaching-system.com/ws

// Client -> Server
{
  "event": "join_session",
  "data": {
    "session_id": "session_uuid",
    "user_id": "user_uuid"
  }
}

// Server -> Client
{
  "event": "session_update",
  "data": {
    "session_id": "session_uuid",
    "field": "discussion_notes",
    "value": "Updated notes content...",
    "updated_by": "user_uuid",
    "timestamp": "2025-01-28T10:45:00Z"
  }
}

// Auto-save event
{
  "event": "auto_save",
  "data": {
    "session_id": "session_uuid",
    "saved_fields": ["discussion_notes", "topics_covered"],
    "status": "SUCCESS"
  }
}
```

## Error Codes

```typescript
enum ErrorCodes {
  // Authentication
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_003',
  
  // Validation
  VALIDATION_REQUIRED_FIELD = 'VAL_001',
  VALIDATION_INVALID_FORMAT = 'VAL_002',
  VALIDATION_OUT_OF_RANGE = 'VAL_003',
  
  // Business Logic
  BIZ_DUPLICATE_ENTRY = 'BIZ_001',
  BIZ_RESOURCE_NOT_FOUND = 'BIZ_002',
  BIZ_INVALID_STATE_TRANSITION = 'BIZ_003',
  
  // System
  SYS_DATABASE_ERROR = 'SYS_001',
  SYS_FILE_PROCESSING_ERROR = 'SYS_002',
  SYS_EXTERNAL_SERVICE_ERROR = 'SYS_003'
}
```

## Rate Limiting

```typescript
// Headers returned with each response
{
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '95',
  'X-RateLimit-Reset': '1706437200'
}

// Rate limit exceeded response
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retry_after": 60
  }
}
```

## API Versioning

- Version included in URL: `/api/v1/...`
- Version in header: `API-Version: 1.0`
- Deprecation notices in headers: `Sunset: Sat, 31 Dec 2025 23:59:59 GMT`

---

**AI Development Note**: When implementing these endpoints, ensure proper validation, authorization checks, and error handling. Use TypeScript interfaces from `/src/types/api.ts` for request/response types.