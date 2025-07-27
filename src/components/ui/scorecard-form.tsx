"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import logger from '@/lib/logger-client';
import {
  METRIC_LABELS,
  METRIC_DESCRIPTIONS,
  DEFAULT_WEIGHTS,
  calculateTotalScore,
  calculateMaxScore,
  calculatePercentage
} from '@/lib/metrics';
import { Save } from 'lucide-react';

interface ScorecardFormProps {
  agentId: string;
  month: number;
  year: number;
  initialData?: {
    service: number;
    productivity: number;
    quality: number;
    assiduity: number;
    performance: number;
    adherence: number;
    lateness: number;
    breakExceeds: number;
    serviceWeight?: number;
    productivityWeight?: number;
    qualityWeight?: number;
    assiduityWeight?: number;
    performanceWeight?: number;
    adherenceWeight?: number;
    latenessWeight?: number;
    breakExceedsWeight?: number;
    notes?: string;
  };
  onSubmit: (data: {
    month: number;
    year: number;
    metrics: MetricScores;
    weights: MetricWeights;
    notes: string;
  }) => Promise<void>;
  onCancel: () => void;
}

type MetricScores = {
  service: number;
  productivity: number;
  quality: number;
  assiduity: number;
  performance: number;
  adherence: number;
  lateness: number;
  breakExceeds: number;
};

type MetricWeights = {
  serviceWeight: number;
  productivityWeight: number;
  qualityWeight: number;
  assiduityWeight: number;
  performanceWeight: number;
  adherenceWeight: number;
  latenessWeight: number;
  breakExceedsWeight: number;
};

export function ScorecardForm({
  month,
  year,
  initialData,
  onSubmit,
  onCancel,
}: ScorecardFormProps) {
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<MetricScores>({
    service: initialData?.service || 1,
    productivity: initialData?.productivity || 1,
    quality: initialData?.quality || 1,
    assiduity: initialData?.assiduity || 1,
    performance: initialData?.performance || 1,
    adherence: initialData?.adherence || 1,
    lateness: initialData?.lateness || 1,
    breakExceeds: initialData?.breakExceeds || 1,
  });

  const [weights, setWeights] = useState<MetricWeights>({
    serviceWeight: initialData?.serviceWeight || DEFAULT_WEIGHTS.serviceWeight,
    productivityWeight: initialData?.productivityWeight || DEFAULT_WEIGHTS.productivityWeight,
    qualityWeight: initialData?.qualityWeight || DEFAULT_WEIGHTS.qualityWeight,
    assiduityWeight: initialData?.assiduityWeight || DEFAULT_WEIGHTS.assiduityWeight,
    performanceWeight: initialData?.performanceWeight || DEFAULT_WEIGHTS.performanceWeight,
    adherenceWeight: initialData?.adherenceWeight || DEFAULT_WEIGHTS.adherenceWeight,
    latenessWeight: initialData?.latenessWeight || DEFAULT_WEIGHTS.latenessWeight,
    breakExceedsWeight: initialData?.breakExceedsWeight || DEFAULT_WEIGHTS.breakExceedsWeight,
  });

  const [notes, setNotes] = useState(initialData?.notes || '');
  const [showWeights, setShowWeights] = useState(false);

  const totalScore = calculateTotalScore(scores, weights);
  const maxScore = calculateMaxScore(weights);
  const percentage = calculatePercentage(totalScore, maxScore);

  const handleScoreChange = (metric: keyof typeof scores, value: string) => {
    const numValue = parseInt(value) || 1;
    if (numValue >= 1 && numValue <= 5) {
      setScores(prev => ({ ...prev, [metric]: numValue }));
    }
  };

  const handleWeightChange = (metric: keyof typeof weights, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0 && numValue <= 10) {
      setWeights(prev => ({ ...prev, [metric]: numValue }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        month,
        year,
        metrics: scores,
        weights,
        notes,
      });
    } catch (error) {
      logger.error('Error submitting scorecard:', error);
    } finally {
      setLoading(false);
    }
  };

  const metricKeys = Object.keys(METRIC_LABELS) as Array<keyof typeof METRIC_LABELS>;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Enter Performance Scores</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {new Date(year, month - 1).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowWeights(!showWeights)}
              >
                {showWeights ? 'Hide' : 'Show'} Weights
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Score Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Score</p>
                <p className="text-2xl font-bold">{totalScore.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Percentage</p>
                <p className={`text-2xl font-bold ${percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metricKeys.map((key) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    {METRIC_LABELS[key]}
                  </label>
                  <span className={`text-lg font-semibold ${scores[key] >= 4 ? 'text-green-600' : scores[key] >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {scores[key]}/5
                  </span>
                </div>
                <p className="text-xs text-gray-500">{METRIC_DESCRIPTIONS[key]}</p>
                
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={scores[key]}
                    onChange={(e) => handleScoreChange(key, e.target.value)}
                    className="flex-1"
                    aria-label={`${METRIC_LABELS[key]} score slider`}
                  />
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={scores[key]}
                    onChange={(e) => handleScoreChange(key, e.target.value)}
                    className="w-16"
                  />
                </div>

                {showWeights && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">Weight:</span>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={weights[`${key}Weight` as keyof typeof weights]}
                      onChange={(e) => handleWeightChange(`${key}Weight` as keyof typeof weights, e.target.value)}
                      className="w-20"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Notes (Optional)
            </label>
            <Textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Add any relevant notes about this evaluation..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Scorecard'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}