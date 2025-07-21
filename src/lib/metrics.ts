export interface MetricScores {
  service: number;
  productivity: number;
  quality: number;
  assiduity: number;
  performance: number;
  adherence: number;
  lateness: number;
  breakExceeds: number;
}

export interface MetricWeights {
  serviceWeight: number;
  productivityWeight: number;
  qualityWeight: number;
  assiduityWeight: number;
  performanceWeight: number;
  adherenceWeight: number;
  latenessWeight: number;
  breakExceedsWeight: number;
}

export const DEFAULT_WEIGHTS: MetricWeights = {
  serviceWeight: 1.0,
  productivityWeight: 1.0,
  qualityWeight: 1.0,
  assiduityWeight: 1.0,
  performanceWeight: 1.0,
  adherenceWeight: 1.0,
  latenessWeight: 1.0,
  breakExceedsWeight: 1.0,
};

export const METRIC_LABELS = {
  service: 'Service',
  productivity: 'Productivity',
  quality: 'Quality',
  assiduity: 'Assiduity',
  performance: 'Performance',
  adherence: 'Adherence',
  lateness: 'Lateness',
  breakExceeds: 'Break Exceeds',
};

export const METRIC_DESCRIPTIONS = {
  service: 'Customer service quality and satisfaction',
  productivity: 'Work output and efficiency',
  quality: 'Quality of work and accuracy',
  assiduity: 'Attendance and punctuality',
  performance: 'Overall performance and goal achievement',
  adherence: 'Following procedures and guidelines',
  lateness: 'Punctuality and time management',
  breakExceeds: 'Break time compliance',
};

export function calculateTotalScore(scores: MetricScores, weights: MetricWeights): number {
  return (
    scores.service * weights.serviceWeight +
    scores.productivity * weights.productivityWeight +
    scores.quality * weights.qualityWeight +
    scores.assiduity * weights.assiduityWeight +
    scores.performance * weights.performanceWeight +
    scores.adherence * weights.adherenceWeight +
    scores.lateness * weights.latenessWeight +
    scores.breakExceeds * weights.breakExceedsWeight
  );
}

export function calculateMaxScore(weights: MetricWeights): number {
  return (
    5 * (weights.serviceWeight +
         weights.productivityWeight +
         weights.qualityWeight +
         weights.assiduityWeight +
         weights.performanceWeight +
         weights.adherenceWeight +
         weights.latenessWeight +
         weights.breakExceedsWeight)
  );
}

export function calculatePercentage(totalScore: number, maxScore: number): number {
  return (totalScore / maxScore) * 100;
}

export function getScoreColor(score: number): string {
  if (score >= 4.5) return 'text-green-600';
  if (score >= 3.5) return 'text-blue-600';
  if (score >= 2.5) return 'text-yellow-600';
  if (score >= 1.5) return 'text-orange-600';
  return 'text-red-600';
}

export function getPercentageColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 70) return 'text-blue-600';
  if (percentage >= 50) return 'text-yellow-600';
  if (percentage >= 30) return 'text-orange-600';
  return 'text-red-600';
}

export function getTrendIcon(trend: number): string {
  if (trend > 0) return '↑';
  if (trend < 0) return '↓';
  return '→';
}

export function getTrendColor(trend: number): string {
  if (trend > 0) return 'text-green-600';
  if (trend < 0) return 'text-red-600';
  return 'text-gray-600';
}

export function formatMonth(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

// Legacy support for existing code
export const METRICS = [
  {
    id: 'calls_handled',
    name: 'Calls Handled',
    description: 'Number of calls handled per day',
    unit: 'calls',
    target: 50,
  },
  {
    id: 'customer_satisfaction',
    name: 'Customer Satisfaction',
    description: 'Average customer satisfaction score',
    unit: '%',
    target: 90,
  },
  {
    id: 'resolution_rate',
    name: 'Resolution Rate',
    description: 'First call resolution rate',
    unit: '%',
    target: 80,
  },
  {
    id: 'average_handle_time',
    name: 'Average Handle Time',
    description: 'Average time spent per call',
    unit: 'minutes',
    target: 5,
  },
];

export function getMetricById(id: string) {
  return METRICS.find(metric => metric.id === id);
}

export function calculateOverallScore(metrics: Record<string, number>): number {
  const scores = Object.values(metrics);
  if (scores.length === 0) return 0;
  
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / scores.length);
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

export function getYearOptions(startYear: number = 2020) {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear + 1; year >= startYear; year--) {
    years.push({ value: year, label: year.toString() });
  }
  return years;
}