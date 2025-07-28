/**
 * Centralized calculation utilities for consistent mathematical operations
 * across the coaching app system.
 * Updated for new percentage-based scorecard structure.
 */

// Constants for score scales
export const METRIC_SCALE = {
  MIN: 1,
  MAX: 5,
  RANGE: 4, // MAX - MIN
} as const;

export const PERCENTAGE_SCALE = {
  MIN: 0,
  MAX: 100,
} as const;

// New scorecard metric weights based on impact levels
export const NEW_SCORECARD_WEIGHTS = {
  // High Impact (1.5x)
  taskCompletionRateWeight: 1.5,
  productivityIndexWeight: 1.5,
  qualityScoreWeight: 1.5,

  // Medium Impact (1.0x)
  scheduleAdherenceWeight: 1.0,
  efficiencyRateWeight: 1.0,

  // Low Impact (0.5x)
  punctualityScoreWeight: 0.5,
  breakComplianceWeight: 0.5,
  attendanceRateWeight: 0.5,
} as const;

/**
 * Safely divides two numbers, returning a default value if denominator is zero
 */
export function safeDiv(numerator: number, denominator: number, defaultValue = 0): number {
  if (denominator === 0 || isNaN(denominator) || isNaN(numerator)) {
    return defaultValue;
  }
  return numerator / denominator;
}

/**
 * Rounds a number to a specified number of decimal places
 */
export function roundToDecimals(value: number, decimals: number): number {
  if (isNaN(value)) {
    return 0;
  }
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Clamps a percentage value between 0 and 100
 */
export function clampPercentage(value: number): number {
  return Math.max(PERCENTAGE_SCALE.MIN, Math.min(PERCENTAGE_SCALE.MAX, value));
}

/**
 * Validates and clamps a metric score between 1 and 5
 */
export function validateMetricScore(score: number): number {
  if (isNaN(score) || score === null || score === undefined) {
    return METRIC_SCALE.MIN;
  }
  return Math.max(METRIC_SCALE.MIN, Math.min(METRIC_SCALE.MAX, score));
}

/**
 * Converts a metric score (1-5 scale) to a percentage (0-100 scale)
 */
export function metricToPercentage(score: number): number {
  const validScore = validateMetricScore(score);
  // Convert 1-5 scale to 0-100 scale
  // (score - 1) / 4 * 100
  const percentage = ((validScore - METRIC_SCALE.MIN) / METRIC_SCALE.RANGE) * PERCENTAGE_SCALE.MAX;
  return clampPercentage(percentage);
}

/**
 * Converts a percentage (0-100 scale) to a metric score (1-5 scale)
 */
export function percentageToMetric(percentage: number): number {
  const validPercentage = clampPercentage(percentage);
  // Convert 0-100 scale to 1-5 scale
  // (percentage / 100 * 4) + 1
  const score = (validPercentage / PERCENTAGE_SCALE.MAX) * METRIC_SCALE.RANGE + METRIC_SCALE.MIN;
  return validateMetricScore(score);
}

/**
 * Calculates the weighted average of metrics
 * @param metrics Array of objects with score and weight properties
 * @returns Weighted average on the same scale as input scores
 */
export function calculateWeightedAverage(
  metrics: Array<{ score: number; weight: number }>
): number {
  if (!metrics || metrics.length === 0) {
    return 0;
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const metric of metrics) {
    const validScore = validateMetricScore(metric.score);
    const weight = Math.max(0, metric.weight || 0);

    totalWeightedScore += validScore * weight;
    totalWeight += weight;
  }

  return safeDiv(totalWeightedScore, totalWeight, 0);
}

/**
 * Calculates the total score and percentage for a set of metrics
 * @param metrics Array of objects with score and weight properties
 * @returns Object with totalScore and percentage
 */
export function calculateTotalScore(metrics: Array<{ score: number; weight: number }>): {
  totalScore: number;
  percentage: number;
  maxPossibleScore: number;
} {
  if (!metrics || metrics.length === 0) {
    return { totalScore: 0, percentage: 0, maxPossibleScore: 0 };
  }

  let totalScore = 0;
  let maxPossibleScore = 0;

  for (const metric of metrics) {
    const validScore = validateMetricScore(metric.score);
    const weight = Math.max(0, metric.weight || 0);

    totalScore += validScore * weight;
    maxPossibleScore += METRIC_SCALE.MAX * weight;
  }

  const percentage = safeDiv(totalScore, maxPossibleScore, 0) * PERCENTAGE_SCALE.MAX;

  return {
    totalScore: roundToDecimals(totalScore, 2),
    percentage: roundToDecimals(clampPercentage(percentage), 2),
    maxPossibleScore: roundToDecimals(maxPossibleScore, 2),
  };
}

/**
 * Calculates the average of an array of numbers
 * @param values Array of numbers
 * @param decimals Number of decimal places to round to
 * @returns Average value or 0 if array is empty
 */
export function calculateAverage(values: number[], decimals = 2): number {
  if (!values || values.length === 0) {
    return 0;
  }

  const validValues = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
  if (validValues.length === 0) {
    return 0;
  }

  const sum = validValues.reduce((acc, val) => acc + val, 0);
  const average = safeDiv(sum, validValues.length, 0);

  return roundToDecimals(average, decimals);
}

/**
 * Validates that all required fields for a metric are present and valid
 */
export function validateMetric(metric: { score?: number; weight?: number; name?: string }): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!metric.name || metric.name.trim() === '') {
    errors.push('Metric name is required');
  }

  if (metric.score === undefined || metric.score === null) {
    errors.push('Metric score is required');
  } else if (metric.score < METRIC_SCALE.MIN || metric.score > METRIC_SCALE.MAX) {
    errors.push(`Metric score must be between ${METRIC_SCALE.MIN} and ${METRIC_SCALE.MAX}`);
  }

  if (metric.weight === undefined || metric.weight === null) {
    errors.push('Metric weight is required');
  } else if (metric.weight < 0) {
    errors.push('Metric weight must be non-negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Formats a number as a percentage string with specified decimals
 */
export function formatPercentage(value: number, decimals = 2): string {
  const percentage = clampPercentage(value);
  return `${roundToDecimals(percentage, decimals)}%`;
}

/**
 * Formats a metric score with specified decimals
 */
export function formatMetricScore(score: number, decimals = 2): string {
  const validScore = validateMetricScore(score);
  return roundToDecimals(validScore, decimals).toString();
}

/**
 * New scorecard calculation functions for percentage-based metrics
 */

// Schedule Adherence: (Actual hours / Scheduled hours) × 100
export function calculateScheduleAdherence(actualHours: number, scheduledHours: number): number {
  if (scheduledHours <= 0) {
    return 0;
  }
  const percentage = (actualHours / scheduledHours) * 100;
  return clampPercentage(percentage);
}

// Attendance Rate: (Days present / Total scheduled days) × 100
export function calculateAttendanceRate(daysPresent: number, scheduledDays: number): number {
  if (scheduledDays <= 0) {
    return 0;
  }
  const percentage = (daysPresent / scheduledDays) * 100;
  return clampPercentage(percentage);
}

// Punctuality Score: (On-time arrivals / Total shifts) × 100
export function calculatePunctualityScore(onTimeArrivals: number, totalShifts: number): number {
  if (totalShifts <= 0) {
    return 0;
  }
  const percentage = (onTimeArrivals / totalShifts) * 100;
  return clampPercentage(percentage);
}

// Break Compliance: (Breaks within limit / Total breaks) × 100
export function calculateBreakCompliance(breaksWithinLimit: number, totalBreaks: number): number {
  if (totalBreaks <= 0) {
    return 100; // If no breaks, assume 100% compliance
  }
  const percentage = (breaksWithinLimit / totalBreaks) * 100;
  return clampPercentage(percentage);
}

// Task Completion Rate: (Tasks completed / Tasks assigned) × 100
export function calculateTaskCompletionRate(tasksCompleted: number, tasksAssigned: number): number {
  if (tasksAssigned <= 0) {
    return 0;
  }
  const percentage = (tasksCompleted / tasksAssigned) * 100;
  return clampPercentage(percentage);
}

// Productivity Index: (Actual output / Expected output) × 100
export function calculateProductivityIndex(actualOutput: number, expectedOutput: number): number {
  if (expectedOutput <= 0) {
    return 0;
  }
  const percentage = (actualOutput / expectedOutput) * 100;
  return clampPercentage(percentage);
}

// Quality Score: (Error-free tasks / Total tasks) × 100
export function calculateQualityScore(errorFreeTasks: number, totalTasks: number): number {
  if (totalTasks <= 0) {
    return 0;
  }
  const percentage = (errorFreeTasks / totalTasks) * 100;
  return clampPercentage(percentage);
}

// Efficiency Rate: (Standard time / Actual time taken) × 100
export function calculateEfficiencyRate(standardTime: number, actualTimeSpent: number): number {
  if (actualTimeSpent <= 0) {
    return 0;
  }
  const percentage = (standardTime / actualTimeSpent) * 100;
  return clampPercentage(percentage);
}

/**
 * Calculate all new scorecard metrics from raw data
 */
export function calculateNewScorecardMetrics(rawData: {
  scheduledHours?: number;
  actualHours?: number;
  scheduledDays?: number;
  daysPresent?: number;
  totalShifts?: number;
  onTimeArrivals?: number;
  totalBreaks?: number;
  breaksWithinLimit?: number;
  tasksAssigned?: number;
  tasksCompleted?: number;
  expectedOutput?: number;
  actualOutput?: number;
  totalTasks?: number;
  errorFreeTasks?: number;
  standardTime?: number;
  actualTimeSpent?: number;
}) {
  return {
    scheduleAdherence: calculateScheduleAdherence(
      rawData.actualHours || 0,
      rawData.scheduledHours || 0
    ),
    attendanceRate: calculateAttendanceRate(rawData.daysPresent || 0, rawData.scheduledDays || 0),
    punctualityScore: calculatePunctualityScore(
      rawData.onTimeArrivals || 0,
      rawData.totalShifts || 0
    ),
    breakCompliance: calculateBreakCompliance(
      rawData.breaksWithinLimit || 0,
      rawData.totalBreaks || 0
    ),
    taskCompletionRate: calculateTaskCompletionRate(
      rawData.tasksCompleted || 0,
      rawData.tasksAssigned || 0
    ),
    productivityIndex: calculateProductivityIndex(
      rawData.actualOutput || 0,
      rawData.expectedOutput || 0
    ),
    qualityScore: calculateQualityScore(rawData.errorFreeTasks || 0, rawData.totalTasks || 0),
    efficiencyRate: calculateEfficiencyRate(
      rawData.standardTime || 0,
      rawData.actualTimeSpent || 0
    ),
  };
}

/**
 * Calculate total score using new scorecard weights
 */
export function calculateNewScorecardTotalScore(
  metrics: {
    scheduleAdherence: number;
    attendanceRate: number;
    punctualityScore: number;
    breakCompliance: number;
    taskCompletionRate: number;
    productivityIndex: number;
    qualityScore: number;
    efficiencyRate: number;
  },
  customWeights?: Partial<typeof NEW_SCORECARD_WEIGHTS>
) {
  const weights = { ...NEW_SCORECARD_WEIGHTS, ...customWeights };

  const weightedMetrics = [
    { score: metrics.scheduleAdherence, weight: weights.scheduleAdherenceWeight },
    { score: metrics.attendanceRate, weight: weights.attendanceRateWeight },
    { score: metrics.punctualityScore, weight: weights.punctualityScoreWeight },
    { score: metrics.breakCompliance, weight: weights.breakComplianceWeight },
    { score: metrics.taskCompletionRate, weight: weights.taskCompletionRateWeight },
    { score: metrics.productivityIndex, weight: weights.productivityIndexWeight },
    { score: metrics.qualityScore, weight: weights.qualityScoreWeight },
    { score: metrics.efficiencyRate, weight: weights.efficiencyRateWeight },
  ];

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const metric of weightedMetrics) {
    const validScore = clampPercentage(metric.score);
    const weight = Math.max(0, metric.weight || 0);

    totalWeightedScore += validScore * weight;
    totalWeight += weight;
  }

  const averageScore = safeDiv(totalWeightedScore, totalWeight, 0);

  return {
    totalScore: roundToDecimals(averageScore, 2),
    percentage: roundToDecimals(averageScore, 2), // Same as total score for percentage-based system
    maxPossibleScore: 100,
  };
}
