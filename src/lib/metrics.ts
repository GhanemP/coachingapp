import {
  calculateTotalScore as calcTotalScore,
  calculateAverage,
  safeDiv,
  roundToDecimals,
} from '@/lib/calculation-utils';

// New percentage-based metrics (only system)
export interface MetricScores {
  scheduleAdherence: number;
  attendanceRate: number;
  punctualityScore: number;
  breakCompliance: number;
  taskCompletionRate: number;
  productivityIndex: number;
  qualityScore: number;
  efficiencyRate: number;
}

export interface MetricWeights {
  scheduleAdherenceWeight: number;
  attendanceRateWeight: number;
  punctualityScoreWeight: number;
  breakComplianceWeight: number;
  taskCompletionRateWeight: number;
  productivityIndexWeight: number;
  qualityScoreWeight: number;
  efficiencyRateWeight: number;
}

export const DEFAULT_WEIGHTS: MetricWeights = {
  scheduleAdherenceWeight: 1.5, // High Impact
  attendanceRateWeight: 1.5, // High Impact
  punctualityScoreWeight: 1.0, // Medium Impact
  breakComplianceWeight: 0.5, // Low Impact
  taskCompletionRateWeight: 1.5, // High Impact
  productivityIndexWeight: 1.5, // High Impact
  qualityScoreWeight: 1.5, // High Impact
  efficiencyRateWeight: 1.0, // Medium Impact
};

// Metric labels
export const METRIC_LABELS = {
  scheduleAdherence: 'Schedule Adherence',
  attendanceRate: 'Attendance Rate',
  punctualityScore: 'Punctuality Score',
  breakCompliance: 'Break Compliance',
  taskCompletionRate: 'Task Completion Rate',
  productivityIndex: 'Productivity Index',
  qualityScore: 'Quality Score',
  efficiencyRate: 'Efficiency Rate',
};

// Metric descriptions
export const METRIC_DESCRIPTIONS = {
  scheduleAdherence: 'Percentage of scheduled time actually worked',
  attendanceRate: 'Percentage of scheduled days attended',
  punctualityScore: 'Percentage of on-time arrivals',
  breakCompliance: 'Percentage of breaks taken within allowed time',
  taskCompletionRate: 'Percentage of assigned tasks completed on time',
  productivityIndex: 'Ratio of actual output to expected output',
  qualityScore: 'Percentage of work meeting quality standards',
  efficiencyRate: 'Ratio of productive time to total time',
};

// Metric categories for organized display
export const METRIC_CATEGORIES = {
  'Time & Attendance': [
    'scheduleAdherence',
    'attendanceRate',
    'punctualityScore',
    'breakCompliance',
  ],
  'Performance & Productivity': [
    'taskCompletionRate',
    'productivityIndex',
    'qualityScore',
    'efficiencyRate',
  ],
};

// Impact levels for weighting
export const METRIC_IMPACT_LEVELS = {
  scheduleAdherence: 'High',
  attendanceRate: 'High',
  punctualityScore: 'Medium',
  breakCompliance: 'Low',
  taskCompletionRate: 'High',
  productivityIndex: 'High',
  qualityScore: 'High',
  efficiencyRate: 'Medium',
};

// Calculate total score for percentage-based metrics
export function calculateTotalScore(scores: MetricScores, weights: MetricWeights): number {
  // Convert percentage-based metrics to array format
  const metricsArray = [
    { score: scores.scheduleAdherence, weight: weights.scheduleAdherenceWeight },
    { score: scores.attendanceRate, weight: weights.attendanceRateWeight },
    { score: scores.punctualityScore, weight: weights.punctualityScoreWeight },
    { score: scores.breakCompliance, weight: weights.breakComplianceWeight },
    { score: scores.taskCompletionRate, weight: weights.taskCompletionRateWeight },
    { score: scores.productivityIndex, weight: weights.productivityIndexWeight },
    { score: scores.qualityScore, weight: weights.qualityScoreWeight },
    { score: scores.efficiencyRate, weight: weights.efficiencyRateWeight },
  ];

  const { totalScore } = calcTotalScore(metricsArray);
  return totalScore;
}

export function calculateMaxScore(weights: MetricWeights): number {
  const totalWeight =
    weights.scheduleAdherenceWeight +
    weights.attendanceRateWeight +
    weights.punctualityScoreWeight +
    weights.breakComplianceWeight +
    weights.taskCompletionRateWeight +
    weights.productivityIndexWeight +
    weights.qualityScoreWeight +
    weights.efficiencyRateWeight;

  // For percentage-based metrics, max score is 100 * total weight
  return 100 * totalWeight;
}

export function calculatePercentage(totalScore: number, maxScore: number): number {
  return safeDiv(totalScore, maxScore, 0) * 100;
}

export function getPercentageColor(percentage: number): string {
  if (percentage >= 90) {
    return 'text-green-600';
  }
  if (percentage >= 70) {
    return 'text-blue-600';
  }
  if (percentage >= 50) {
    return 'text-yellow-600';
  }
  if (percentage >= 30) {
    return 'text-orange-600';
  }
  return 'text-red-600';
}

export function getTrendIcon(trend: number): string {
  if (trend > 0) {
    return '↑';
  }
  if (trend < 0) {
    return '↓';
  }
  return '→';
}

export function getTrendColor(trend: number): string {
  if (trend > 0) {
    return 'text-green-600';
  }
  if (trend < 0) {
    return 'text-red-600';
  }
  return 'text-gray-600';
}

export function formatMonth(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1] || '';
}

export function calculateOverallScore(metrics: Record<string, number>): number {
  const scores = Object.values(metrics);
  if (scores.length === 0) {
    return 0;
  }

  return roundToDecimals(calculateAverage(scores), 0);
}

export function getMonthOptions() {
  return [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
}

export function getYearOptions(startYear: number = 2025) {
  const currentYear = new Date().getFullYear();
  const endYear = Math.max(currentYear + 5, 2030); // Ensure we go up to at least 2030
  const years = [];
  for (let year = endYear; year >= startYear; year--) {
    years.push({ value: year, label: year.toString() });
  }
  return years;
}
