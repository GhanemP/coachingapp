/**
 * Centralized calculation utilities for consistent mathematical operations
 * across the coaching app system.
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
  if (isNaN(value)) return 0;
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
  const score = (validPercentage / PERCENTAGE_SCALE.MAX * METRIC_SCALE.RANGE) + METRIC_SCALE.MIN;
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
export function calculateTotalScore(
  metrics: Array<{ score: number; weight: number }>
): { totalScore: number; percentage: number; maxPossibleScore: number } {
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
export function validateMetric(metric: {
  score?: number;
  weight?: number;
  name?: string;
}): { isValid: boolean; errors: string[] } {
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