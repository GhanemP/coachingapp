# Business Logic Documentation

## Overview
Core business rules and logic for the Coaching Performance Management System. This document defines the rules that govern system behavior and ensure data integrity.

## Performance Scoring Rules

### Composite Score Calculation
```typescript
// AI Context: Weighted average calculation for overall performance
interface ScoreWeights {
  service: 0.25;      // 25% - Customer satisfaction and service quality
  productivity: 0.20; // 20% - Efficiency and output
  quality: 0.20;      // 20% - Accuracy and compliance
  attendance: 0.20;   // 20% - Reliability and presence
  adherence: 0.15;    // 15% - Following schedules and procedures
}

function calculateCompositeScore(metrics: AgentMetrics): number {
  const weights = getScoreWeights();
  
  // Ensure all scores are between 0-100
  const validatedScores = validateScores(metrics);
  
  // Calculate weighted average
  const composite = 
    validatedScores.service * weights.service +
    validatedScores.productivity * weights.productivity +
    validatedScores.quality * weights.quality +
    validatedScores.attendance * weights.attendance +
    validatedScores.adherence * weights.adherence;
  
  return Math.round(composite * 100) / 100; // Round to 2 decimals
}
```

### Performance Thresholds
```typescript
enum PerformanceLevel {
  EXCELLENT = 90,   // 90-100: Top performer
  GOOD = 80,        // 80-89: Meeting expectations
  FAIR = 70,        // 70-79: Needs improvement
  POOR = 60,        // 60-69: Significant concerns
  CRITICAL = 0      // Below 60: Immediate action required
}

interface PerformanceActions {
  EXCELLENT: {
    coaching_frequency: 'MONTHLY',
    recognition: true,
    development_focus: 'LEADERSHIP'
  },
  GOOD: {
    coaching_frequency: 'BIWEEKLY',
    recognition: false,
    development_focus: 'SKILL_ENHANCEMENT'
  },
  FAIR: {
    coaching_frequency: 'WEEKLY',
    recognition: false,
    development_focus: 'PERFORMANCE_IMPROVEMENT'
  },
  POOR: {
    coaching_frequency: 'TWICE_WEEKLY',
    recognition: false,
    development_focus: 'INTENSIVE_SUPPORT',
    action_plan_consideration: true
  },
  CRITICAL: {
    coaching_frequency: 'DAILY_CHECKIN',
    recognition: false,
    development_focus: 'IMMEDIATE_INTERVENTION',
    action_plan_required: true
  }
}
```

## Coaching Session Rules

### Session Scheduling Rules
```typescript
interface SchedulingRules {
  // Minimum time between sessions (except urgent)
  minimum_gap_days: 2,
  
  // Maximum time without coaching
  maximum_gap_by_performance: {
    EXCELLENT: 30,  // Monthly
    GOOD: 14,       // Biweekly
    FAIR: 7,        // Weekly
    POOR: 3,        // Twice weekly
    CRITICAL: 1     // Daily
  },
  
  // Session duration guidelines
  standard_duration_minutes: 45,
  minimum_duration_minutes: 15,
  maximum_duration_minutes: 90,
  
  // Scheduling constraints
  business_hours_only: true,
  avoid_peak_hours: true,
  respect_agent_schedule: true,
  
  // Cancellation rules
  cancellation_notice_hours: 24,
  no_show_threshold: 2, // Escalate after 2 no-shows
  
  // Auto-scheduling triggers
  auto_schedule_triggers: [
    'METRIC_DROP_15_PERCENT',
    'ACTION_PLAN_ACTIVATED',
    'URGENT_NOTE_CREATED',
    'MANAGER_REQUEST'
  ]
}
```

### Session Effectiveness Scoring
```typescript
// AI Context: Determine if coaching is working
interface EffectivenessCalculation {
  // Minimum measurement period
  measurement_days: 14,
  
  // Success criteria
  success_thresholds: {
    metric_improvement: 5,      // 5% improvement
    sustained_days: 7,          // Maintained for a week
    action_completion_rate: 80  // 80% of actions done
  },
  
  // Effectiveness levels
  effectiveness_scores: {
    5: 'HIGHLY_EFFECTIVE',    // >15% improvement
    4: 'EFFECTIVE',           // 10-15% improvement
    3: 'MODERATELY_EFFECTIVE', // 5-10% improvement
    2: 'MINIMALLY_EFFECTIVE', // 0-5% improvement
    1: 'INEFFECTIVE'          // No improvement or decline
  }
}

function calculateSessionEffectiveness(
  preMetrics: Metrics,
  postMetrics: Metrics,
  actionCompletionRate: number
): number {
  const improvement = calculateImprovement(preMetrics, postMetrics);
  const sustained = checkSustainedImprovement(postMetrics);
  
  if (improvement > 15 && actionCompletionRate > 90 && sustained) {
    return 5; // Highly effective
  } else if (improvement > 10 && actionCompletionRate > 80) {
    return 4; // Effective
  } else if (improvement > 5 && actionCompletionRate > 70) {
    return 3; // Moderately effective
  } else if (improvement > 0) {
    return 2; // Minimally effective
  } else {
    return 1; // Ineffective
  }
}
```

## Quick Notes Rules

### Note Categorization Logic
```typescript
interface NoteCategorization {
  // Auto-categorization keywords
  keywords: {
    POSITIVE: ['excellent', 'great', 'outstanding', 'improved', 'helped'],
    COACHING: ['struggled', 'difficulty', 'needs help', 'confusion'],
    URGENT: ['violation', 'refused', 'escalated', 'complaint', 'walked off'],
    COMPLIANCE: ['did not follow', 'skipped', 'ignored procedure', 'breach']
  },
  
  // Priority assignment
  priority_rules: {
    URGENT_TYPE: 'HIGH',          // All urgent notes are high priority
    COMPLIANCE_TYPE: 'HIGH',      // Compliance issues are high priority
    KEYWORD_CRITICAL: 'HIGH',     // Contains critical keywords
    REPEATED_ISSUE: 'MEDIUM',     // Same issue noted before
    FIRST_OCCURRENCE: 'LOW'       // New, non-critical observation
  },
  
  // Auto-linking rules
  auto_link_to_session: {
    URGENT: true,         // Always link urgent notes
    COMPLIANCE: true,     // Always link compliance issues
    COACHING: true,       // Link coaching needs
    POSITIVE: false       // Optional for positive notes
  }
}
```

### Note Addressing Rules
```typescript
interface NoteAddressingRules {
  // Notes must be addressed within
  addressing_timeline: {
    HIGH_PRIORITY: 48,     // 48 hours
    MEDIUM_PRIORITY: 168,  // 1 week
    LOW_PRIORITY: 336      // 2 weeks
  },
  
  // Escalation if not addressed
  escalation_path: [
    'TEAM_LEADER_REMINDER',
    'MANAGER_NOTIFICATION',
    'DIRECTOR_ALERT'
  ],
  
  // Bulk addressing allowed for
  bulk_addressable_types: ['POSITIVE', 'GENERAL'],
  
  // Required fields when addressing
  addressing_requirements: {
    action_taken: 'REQUIRED',
    outcome: 'REQUIRED',
    follow_up_needed: 'REQUIRED'
  }
}
```

## Action Plan (PIP) Rules

### PIP Initiation Triggers
```typescript
interface PIPTriggers {
  automatic_triggers: {
    CONSECUTIVE_POOR_SCORES: {
      threshold: 70,
      consecutive_periods: 3,
      action: 'MANDATORY_PIP'
    },
    CRITICAL_SCORE: {
      threshold: 60,
      consecutive_periods: 1,
      action: 'IMMEDIATE_PIP'
    },
    ATTENDANCE_VIOLATION: {
      unexcused_absences: 3,
      period_days: 30,
      action: 'ATTENDANCE_PIP'
    },
    COMPLIANCE_BREACH: {
      severity: 'MAJOR',
      occurrences: 1,
      action: 'COMPLIANCE_PIP'
    }
  },
  
  manager_discretion_triggers: [
    'CUSTOMER_COMPLAINTS',
    'BEHAVIORAL_CONCERNS',
    'SKILL_GAPS',
    'PERFORMANCE_INCONSISTENCY'
  ]
}
```

### PIP Success Criteria
```typescript
interface PIPSuccessCriteria {
  // Minimum requirements for all PIPs
  mandatory_criteria: {
    target_metrics_achieved: true,
    no_new_violations: true,
    attendance_maintained: true,
    all_training_completed: true
  },
  
  // Evaluation timeline
  evaluation_periods: {
    initial_review: 7,      // Days
    mid_point_review: 15,   // Days
    final_review: 30        // Days
  },
  
  // Extension rules
  extension_eligibility: {
    showing_improvement: true,
    completion_percentage: 70,
    manager_recommendation: true,
    maximum_extensions: 1,
    extension_duration_days: 15
  },
  
  // Exit criteria
  successful_exit: {
    all_targets_met: true,
    sustained_for_days: 14,
    manager_approval: true,
    no_regression_days: 30
  },
  
  unsuccessful_exit: {
    targets_not_met: true,
    no_improvement_shown: true,
    additional_violations: true,
    action: 'ESCALATE_TO_HR'
  }
}
```

### PIP Monitoring Rules
```typescript
interface PIPMonitoring {
  // Check-in frequency based on progress
  dynamic_check_ins: {
    ON_TRACK: 'WEEKLY',
    STRUGGLING: 'EVERY_OTHER_DAY',
    CRITICAL: 'DAILY'
  },
  
  // Progress calculation
  progress_formula: {
    metric_weight: 0.60,      // 60% based on metrics
    behavior_weight: 0.25,    // 25% based on behaviors
    engagement_weight: 0.15   // 15% based on engagement
  },
  
  // Automated alerts
  alert_thresholds: {
    FALLING_BEHIND: {
      progress_below: 50,
      days_remaining: 15,
      alert_to: ['TEAM_LEADER', 'MANAGER']
    },
    CRITICAL_RISK: {
      progress_below: 30,
      days_remaining: 7,
      alert_to: ['TEAM_LEADER', 'MANAGER', 'HR']
    }
  }
}
```

## Data Import Rules

### Excel Import Validation
```typescript
interface ImportValidationRules {
  // File requirements
  file_requirements: {
    max_size_mb: 50,
    allowed_formats: ['.xlsx', '.xls'],
    required_sheets: ['Performance_Data', 'Team_Mapping'],
    optional_sheets: ['Historical_Performance', 'Agent_Profiles']
  },
  
  // Data validation rules
  field_validations: {
    agent_id: {
      pattern: /^[A-Z]\d{3}$/,
      required: true,
      unique: true
    },
    percentages: {
      min: 0,
      max: 100,
      decimal_places: 2
    },
    dates: {
      format: 'MM/DD/YYYY',
      not_future: true,
      within_days: 365
    },
    scores: {
      required_if_active: true,
      null_if_on_leave: true
    }
  },
  
  // Duplicate handling
  duplicate_rules: {
    same_agent_same_date: 'REJECT',
    update_strategy: 'NEWER_WINS',
    archive_old: true
  },
  
  // Batch processing
  batch_rules: {
    chunk_size: 100,
    transaction_scope: 'PER_CHUNK',
    rollback_on_error: true,
    partial_success_allowed: false
  }
}
```

### Data Import Conflict Resolution
```typescript
interface ConflictResolution {
  // When importing user already exists
  existing_user_rules: {
    email_match: 'UPDATE_FIELDS',
    employee_id_match: 'UPDATE_FIELDS',
    name_mismatch: 'FLAG_FOR_REVIEW',
    role_change: 'REQUIRE_APPROVAL'
  },
  
  // When metrics already exist
  existing_metrics_rules: {
    same_date_same_agent: {
      action: 'PROMPT_USER',
      options: ['OVERWRITE', 'SKIP', 'MERGE']
    },
    historical_data: {
      action: 'ARCHIVE_AND_REPLACE',
      archive_table: 'performance_metrics_archive'
    }
  },
  
  // Team structure conflicts
  team_conflicts: {
    agent_multiple_leaders: 'USE_LATEST',
    leader_not_found: 'CREATE_PLACEHOLDER',
    circular_reference: 'REJECT_WITH_ERROR'
  }
}
```

## Notification Rules

### Automated Notifications
```typescript
interface NotificationTriggers {
  // Agent notifications
  agent_notifications: {
    SESSION_SCHEDULED: {
      timing: 'IMMEDIATE',
      reminder: '1_DAY_BEFORE'
    },
    SESSION_COMPLETED: {
      timing: 'WITHIN_1_HOUR',
      include: ['SUMMARY', 'ACTION_ITEMS']
    },
    ACTION_DUE: {
      timing: '2_DAYS_BEFORE',
      reminder: 'DAY_OF'
    },
    PIP_ACTIVATED: {
      timing: 'IMMEDIATE',
      cc: ['HR']
    }
  },
  
  // Team Leader notifications
  team_leader_notifications: {
    AGENT_BELOW_THRESHOLD: {
      timing: 'DAILY_SUMMARY',
      threshold: 70
    },
    UNADDRESSED_NOTES: {
      timing: 'EVERY_2_DAYS',
      priority: 'HIGH_ONLY'
    },
    SESSION_NO_SHOW: {
      timing: 'IMMEDIATE'
    },
    PIP_UPDATE_DUE: {
      timing: '1_DAY_BEFORE'
    }
  },
  
  // Manager notifications
  manager_notifications: {
    TEAM_PERFORMANCE_REPORT: {
      timing: 'WEEKLY_MONDAY_9AM'
    },
    ESCALATED_ISSUES: {
      timing: 'IMMEDIATE'
    },
    PIP_STATUS_CHANGES: {
      timing: 'IMMEDIATE'
    }
  }
}
```

### Notification Delivery Rules
```typescript
interface DeliveryRules {
  // Channel selection
  channel_priority: {
    URGENT: ['EMAIL', 'SMS', 'IN_APP'],
    HIGH: ['EMAIL', 'IN_APP'],
    NORMAL: ['IN_APP', 'EMAIL_DIGEST'],
    LOW: ['IN_APP']
  },
  
  // Batching rules
  digest_rules: {
    max_items_per_digest: 10,
    digest_frequency: 'DAILY',
    digest_time: '09:00',
    urgent_bypass_digest: true
  },
  
  // Quiet hours
  quiet_hours: {
    enabled: true,
    start: '20:00',
    end: '08:00',
    queue_during_quiet: true,
    urgent_override: true
  }
}
```

## Security & Access Control Rules

### Role-Based Permissions
```typescript
interface RBACRules {
  ADMIN: {
    users: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    metrics: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    sessions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    reports: ['CREATE', 'READ', 'EXPORT'],
    system: ['CONFIGURE', 'AUDIT', 'BACKUP']
  },
  
  MANAGER: {
    users: ['READ', 'UPDATE_TEAM_ONLY'],
    metrics: ['READ', 'UPDATE_TEAM_ONLY'],
    sessions: ['READ_ALL', 'APPROVE'],
    reports: ['CREATE', 'READ', 'EXPORT'],
    system: ['READ_CONFIG']
  },
  
  TEAM_LEADER: {
    users: ['READ_TEAM_ONLY'],
    metrics: ['READ_TEAM_ONLY', 'UPDATE_TEAM_ONLY'],
    sessions: ['CREATE_OWN', 'READ_OWN', 'UPDATE_OWN'],
    reports: ['READ_TEAM_ONLY'],
    system: []
  },
  
  AGENT: {
    users: ['READ_SELF'],
    metrics: ['READ_SELF'],
    sessions: ['READ_SELF', 'JOIN'],
    reports: ['READ_SELF'],
    system: []
  }
}
```

### Data Access Rules
```typescript
interface DataAccessRules {
  // Hierarchical access
  hierarchical_access: {
    MANAGER_SEES: ['ALL_TEAM_LEADERS', 'ALL_AGENTS'],
    TEAM_LEADER_SEES: ['ASSIGNED_AGENTS_ONLY'],
    AGENT_SEES: ['SELF_ONLY']
  },
  
  // Time-based restrictions
  historical_data_access: {
    ADMIN: 'UNLIMITED',
    MANAGER: 'LAST_2_YEARS',
    TEAM_LEADER: 'LAST_1_YEAR',
    AGENT: 'LAST_6_MONTHS'
  },
  
  // Sensitive data masking
  data_masking: {
    SSN: 'LAST_4_ONLY',
    PHONE: 'PARTIAL_MASK',
    EMAIL: 'NO_MASK',
    SALARY: 'ROLE_BASED'
  },
  
  // Export restrictions
  export_limits: {
    ADMIN: 'UNLIMITED',
    MANAGER: 10000,        // Records per export
    TEAM_LEADER: 1000,
    AGENT: 100
  }
}
```

## Business Calculation Rules

### Trend Calculations
```typescript
interface TrendCalculations {
  // Minimum data points for trends
  minimum_data_points: 3,
  
  // Trend determination
  trend_thresholds: {
    IMPROVING: '+5%',      // 5% or more improvement
    STABLE: '-5% to +5%',  // Within 5% change
    DECLINING: '-5%'       // 5% or more decline
  },
  
  // Smoothing for volatility
  smoothing_algorithm: 'MOVING_AVERAGE',
  smoothing_period: 3,    // 3-period moving average
  
  // Anomaly detection
  anomaly_detection: {
    enabled: true,
    method: 'STANDARD_DEVIATION',
    threshold: 2.5,       // 2.5 standard deviations
    action: 'FLAG_FOR_REVIEW'
  }
}
```

### Predictive Analytics Rules
```typescript
interface PredictiveRules {
  // Performance prediction
  performance_prediction: {
    algorithm: 'LINEAR_REGRESSION',
    features: [
      'historical_scores',
      'coaching_frequency',
      'action_completion_rate',
      'attendance_pattern'
    ],
    confidence_threshold: 0.70,
    prediction_horizon_days: 30
  },
  
  // Attrition risk
  attrition_risk_factors: {
    declining_performance: 0.25,
    attendance_issues: 0.20,
    low_engagement: 0.20,
    no_improvement: 0.15,
    tenure_factor: 0.10,
    peer_comparison: 0.10
  },
  
  // Success probability
  success_prediction: {
    historical_success_rate: 0.40,
    current_trajectory: 0.30,
    engagement_level: 0.20,
    support_received: 0.10
  }
}
```

## Compliance Rules

### Audit Trail Requirements
```typescript
interface AuditRules {
  // What to audit
  auditable_actions: [
    'USER_LOGIN',
    'DATA_EXPORT',
    'METRIC_UPDATE',
    'SESSION_COMPLETE',
    'PIP_ACTIVATE',
    'PERMISSION_CHANGE',
    'DATA_DELETE'
  ],
  
  // Audit retention
  retention_period: {
    security_events: '7_YEARS',
    data_changes: '3_YEARS',
    access_logs: '1_YEAR'
  },
  
  // Audit fields
  required_fields: {
    user_id: 'REQUIRED',
    action: 'REQUIRED',
    timestamp: 'REQUIRED',
    ip_address: 'REQUIRED',
    user_agent: 'REQUIRED',
    before_value: 'IF_UPDATE',
    after_value: 'IF_UPDATE',
    reason: 'IF_SENSITIVE'
  }
}
```

### Data Retention Rules
```typescript
interface RetentionRules {
  // Active data
  active_retention: {
    performance_metrics: '13_MONTHS',
    coaching_sessions: '24_MONTHS',
    quick_notes: '6_MONTHS',
    action_items: '12_MONTHS'
  },
  
  // Archive strategy
  archive_rules: {
    method: 'MOVE_TO_ARCHIVE_TABLE',
    compression: true,
    indexing: 'MINIMAL',
    access: 'REQUEST_ONLY'
  },
  
  // Deletion rules
  deletion_rules: {
    terminated_employees: {
      delay_days: 90,
      preserve: ['AUDIT_LOGS', 'AGGREGATED_STATS']
    },
    old_archives: {
      retention_years: 7,
      approval_required: true
    }
  }
}
```

## Integration Rules

### API Rate Limiting
```typescript
interface RateLimitRules {
  // Per endpoint limits
  endpoint_limits: {
    '/api/auth/*': {
      requests_per_minute: 10,
      requests_per_hour: 100
    },
    '/api/metrics/*': {
      requests_per_minute: 60,
      requests_per_hour: 1000
    },
    '/api/import/*': {
      requests_per_minute: 5,
      requests_per_hour: 20
    }
  },
  
  // Per user role limits
  role_multipliers: {
    ADMIN: 2.0,         // 2x base limits
    MANAGER: 1.5,       // 1.5x base limits
    TEAM_LEADER: 1.0,   // Base limits
    AGENT: 0.5          // Half base limits
  },
  
  // Burst allowance
  burst_rules: {
    enabled: true,
    burst_multiplier: 2,
    burst_duration_seconds: 60,
    cooldown_minutes: 15
  }
}
```

---

**AI Development Note**: These business rules should be implemented as a separate business logic layer, independent of the UI and database layers. Use a rules engine pattern for complex logic and ensure all rules are testable with unit tests.