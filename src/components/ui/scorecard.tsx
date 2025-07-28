import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  METRIC_LABELS,
  METRIC_DESCRIPTIONS,
  METRIC_CATEGORIES,
  METRIC_IMPACT_LEVELS,
  getPercentageColor,
  getTrendIcon,
  getTrendColor
} from '@/lib/metrics';

interface ScorecardProps {
  metrics: {
    scheduleAdherence: number;
    attendanceRate: number;
    punctualityScore: number;
    breakCompliance: number;
    taskCompletionRate: number;
    productivityIndex: number;
    qualityScore: number;
    efficiencyRate: number;
  };
  weights?: {
    scheduleAdherenceWeight: number;
    attendanceRateWeight: number;
    punctualityScoreWeight: number;
    breakComplianceWeight: number;
    taskCompletionRateWeight: number;
    productivityIndexWeight: number;
    qualityScoreWeight: number;
    efficiencyRateWeight: number;
  };
  trends?: Record<string, number>;
  totalScore?: number;
  percentage?: number;
  month?: number;
  year?: number;
  showWeights?: boolean;
}

export function Scorecard({
  metrics,
  weights,
  trends = {},
  totalScore,
  percentage,
  month,
  year,
  showWeights = false,
}: ScorecardProps) {
  const getScoreBarColor = (score: number) => {
    if (score >= 90) {return 'bg-green-500';}
    if (score >= 70) {return 'bg-blue-500';}
    if (score >= 50) {return 'bg-yellow-500';}
    return 'bg-red-500';
  };

  const getImpactBadgeColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderMetricsByCategory = () => {
    return Object.entries(METRIC_CATEGORIES).map(([category, metricKeys]) => (
      <div key={category} className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
          {category}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metricKeys.map((key) => {
            const score = metrics[key as keyof typeof metrics];
            const weight = weights?.[`${key}Weight` as keyof typeof weights] || 1;
            const trend = trends[key] || 0;
            const impact = METRIC_IMPACT_LEVELS[key as keyof typeof METRIC_IMPACT_LEVELS];

            return (
              <div
                key={key}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {METRIC_LABELS[key as keyof typeof METRIC_LABELS]}
                      </h4>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getImpactBadgeColor(impact)}`}
                      >
                        {impact}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {METRIC_DESCRIPTIONS[key as keyof typeof METRIC_DESCRIPTIONS]}
                    </p>
                  </div>
                  {trend !== 0 && (
                    <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
                      {getTrendIcon(trend)} {Math.abs(trend).toFixed(1)}%
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${getPercentageColor(score)}`}>
                      {Number(score).toFixed(1)}%
                    </span>
                  </div>
                  {showWeights && (
                    <Badge variant="secondary" className="text-xs">
                      Weight: {weight}x
                    </Badge>
                  )}
                </div>

                {/* Score Bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getScoreBarColor(score)}`}
                    style={{ width: `${Math.min(score, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Scorecard - New System</CardTitle>
          {month && year && (
            <Badge variant="outline">
              {new Date(year, month - 1).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall Score */}
        {totalScore !== undefined && percentage !== undefined && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Weighted Total Score</p>
                <p className="text-2xl font-bold">{totalScore.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Overall Percentage</p>
                <p className={`text-2xl font-bold ${getPercentageColor(percentage)}`}>
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metrics by Category */}
        {renderMetricsByCategory()}

        {/* Legend */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Impact Level Legend</h4>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-red-100 text-red-800">High Impact (1.5x weight)</Badge>
            <Badge className="bg-yellow-100 text-yellow-800">Medium Impact (1.0x weight)</Badge>
            <Badge className="bg-green-100 text-green-800">Low Impact (0.5x weight)</Badge>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            All metrics are percentage-based (0-100%) and calculated from actual performance data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}