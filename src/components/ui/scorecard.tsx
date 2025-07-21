import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  METRIC_LABELS, 
  METRIC_DESCRIPTIONS, 
  getScoreColor, 
  getPercentageColor,
  getTrendIcon,
  getTrendColor 
} from '@/lib/metrics';

interface ScorecardProps {
  metrics: {
    service: number;
    productivity: number;
    quality: number;
    assiduity: number;
    performance: number;
    adherence: number;
    lateness: number;
    breakExceeds: number;
  };
  weights?: {
    serviceWeight: number;
    productivityWeight: number;
    qualityWeight: number;
    assiduityWeight: number;
    performanceWeight: number;
    adherenceWeight: number;
    latenessWeight: number;
    breakExceedsWeight: number;
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
  const metricKeys = Object.keys(METRIC_LABELS) as Array<keyof typeof METRIC_LABELS>;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Scorecard</CardTitle>
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
                <p className="text-sm text-gray-600">Total Score</p>
                <p className="text-2xl font-bold">{totalScore.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Percentage</p>
                <p className={`text-2xl font-bold ${getPercentageColor(percentage)}`}>
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metricKeys.map((key) => {
            const score = metrics[key];
            const weight = weights?.[`${key}Weight` as keyof typeof weights] || 1;
            const trend = trends[key] || 0;

            return (
              <div
                key={key}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {METRIC_LABELS[key]}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {METRIC_DESCRIPTIONS[key]}
                    </p>
                  </div>
                  {trend !== 0 && (
                    <span className={`text-sm font-medium ${getTrendColor(trend)}`}>
                      {getTrendIcon(trend)} {Math.abs(trend)}
                    </span>
                  )}
                </div>

                <div className="flex items-end justify-between mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {score}
                    </span>
                    <span className="text-sm text-gray-500">/ 5</span>
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
                    className={`h-2 rounded-full transition-all ${
                      score >= 4 ? 'bg-green-500' :
                      score >= 3 ? 'bg-blue-500' :
                      score >= 2 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${(score / 5) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}