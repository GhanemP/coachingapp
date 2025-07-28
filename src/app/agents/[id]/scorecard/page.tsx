'use client';
import { format } from 'date-fns';
import { ArrowLeft, Download, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PerformanceCharts } from '@/components/ui/performance-charts';
import { Scorecard } from '@/components/ui/scorecard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import logger from '@/lib/logger-client';
import { getMonthOptions, getYearOptions, formatMonth, DEFAULT_WEIGHTS } from '@/lib/metrics';

interface AgentData {
  id: string;
  name: string;
  email: string;
  agentProfile?: {
    employeeId: string;
  };
}

interface MetricData {
  id: string;
  month: number;
  year: number;
  // Legacy metrics (1-5 scale)
  service: number;
  productivity: number;
  quality: number;
  assiduity: number;
  performance: number;
  adherence: number;
  lateness: number;
  breakExceeds: number;
  serviceWeight: number;
  productivityWeight: number;
  qualityWeight: number;
  assiduityWeight: number;
  performanceWeight: number;
  adherenceWeight: number;
  latenessWeight: number;
  breakExceedsWeight: number;
  // New percentage-based metrics
  scheduleAdherence?: number;
  attendanceRate?: number;
  punctualityScore?: number;
  breakCompliance?: number;
  taskCompletionRate?: number;
  productivityIndex?: number;
  qualityScore?: number;
  efficiencyRate?: number;
  scheduleAdherenceWeight?: number;
  attendanceRateWeight?: number;
  punctualityScoreWeight?: number;
  breakComplianceWeight?: number;
  taskCompletionRateWeight?: number;
  productivityIndexWeight?: number;
  qualityScoreWeight?: number;
  efficiencyRateWeight?: number;
  totalScore: number;
  percentage: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ScorecardData {
  agent: AgentData;
  metrics: MetricData[];
  trends: Record<string, number>;
  yearlyAverage: {
    // Legacy metrics
    service: number;
    productivity: number;
    quality: number;
    assiduity: number;
    performance: number;
    adherence: number;
    lateness: number;
    breakExceeds: number;
    // New metrics
    scheduleAdherence?: number;
    attendanceRate?: number;
    punctualityScore?: number;
    breakCompliance?: number;
    taskCompletionRate?: number;
    productivityIndex?: number;
    qualityScore?: number;
    efficiencyRate?: number;
    totalScore: number;
    percentage: number;
  } | null;
  year: number;
  month: number | null;
}

export default function AgentScorecardPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scorecardData, setScorecardData] = useState<ScorecardData | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [showCharts, setShowCharts] = useState(true);

  const agentId = params.id as string;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchScorecard = async () => {
      try {
        setLoading(true);
        const url = new URL(`/api/agents/${agentId}/scorecard`, window.location.origin);
        url.searchParams.set('year', selectedYear.toString());
        if (viewMode === 'monthly' && selectedMonth) {
          url.searchParams.set('month', selectedMonth.toString());
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error("You do not have permission to view this agent's scorecard");
          } else if (response.status === 404) {
            throw new Error('Agent not found');
          } else {
            throw new Error(`Failed to fetch scorecard data (${response.status})`);
          }
        }

        const data = await response.json();
        setScorecardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchScorecard();
    }
  }, [agentId, selectedYear, selectedMonth, viewMode, status]);

  const handleExport = () => {
    // TODO: Implement CSV export functionality
    logger.info('Export functionality to be implemented');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scorecard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!scorecardData) {
    return null;
  }

  const currentMetric = scorecardData.metrics[0];
  const displayMetrics =
    viewMode === 'yearly' && scorecardData.yearlyAverage
      ? scorecardData.yearlyAverage
      : currentMetric || {
          service: 0,
          productivity: 0,
          quality: 0,
          assiduity: 0,
          performance: 0,
          adherence: 0,
          lateness: 0,
          breakExceeds: 0,
          scheduleAdherence: 0,
          attendanceRate: 0,
          punctualityScore: 0,
          breakCompliance: 0,
          taskCompletionRate: 0,
          productivityIndex: 0,
          qualityScore: 0,
          efficiencyRate: 0,
          totalScore: 0,
          percentage: 0,
        };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.push(`/agents/${agentId}`)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Agent Profile
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Scorecard</h1>
            <p className="text-gray-600 mt-2">
              {scorecardData.agent?.name || 'Unknown Agent'} -{' '}
              {scorecardData.agent?.email || 'No email'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCharts(!showCharts)} variant="outline">
              {showCharts ? (
                <BarChart3 className="mr-2 h-4 w-4" />
              ) : (
                <TrendingUp className="mr-2 h-4 w-4" />
              )}
              {showCharts ? 'Hide Charts' : 'Show Charts'}
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">View Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">View Mode</label>
              <Select
                value={viewMode}
                onValueChange={(value: 'monthly' | 'yearly') => {
                  setViewMode(value);
                  if (value === 'yearly') {
                    setSelectedMonth(null);
                  } else {
                    setSelectedMonth(new Date().getMonth() + 1);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly Average</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Year</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={value => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {viewMode === 'monthly' && (
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Month</label>
                <Select
                  value={selectedMonth?.toString() || ''}
                  onValueChange={value => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getMonthOptions().map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Charts */}
      {showCharts && scorecardData.metrics.length > 0 && (
        <div className="mb-8">
          <PerformanceCharts metrics={scorecardData.metrics} currentYear={selectedYear} />
        </div>
      )}

      {/* Main Scorecard */}
      {scorecardData.metrics.length > 0 || scorecardData.yearlyAverage ? (
        <>
          <Scorecard
            metrics={{
              scheduleAdherence: displayMetrics.scheduleAdherence || 0,
              attendanceRate: displayMetrics.attendanceRate || 0,
              punctualityScore: displayMetrics.punctualityScore || 0,
              breakCompliance: displayMetrics.breakCompliance || 0,
              taskCompletionRate: displayMetrics.taskCompletionRate || 0,
              productivityIndex: displayMetrics.productivityIndex || 0,
              qualityScore: displayMetrics.qualityScore || 0,
              efficiencyRate: displayMetrics.efficiencyRate || 0,
            }}
            weights={
              currentMetric
                ? {
                    scheduleAdherenceWeight: currentMetric.scheduleAdherenceWeight || 1.5,
                    attendanceRateWeight: currentMetric.attendanceRateWeight || 1.5,
                    punctualityScoreWeight: currentMetric.punctualityScoreWeight || 1.0,
                    breakComplianceWeight: currentMetric.breakComplianceWeight || 0.5,
                    taskCompletionRateWeight: currentMetric.taskCompletionRateWeight || 1.5,
                    productivityIndexWeight: currentMetric.productivityIndexWeight || 1.5,
                    qualityScoreWeight: currentMetric.qualityScoreWeight || 1.5,
                    efficiencyRateWeight: currentMetric.efficiencyRateWeight || 1.0,
                  }
                : DEFAULT_WEIGHTS
            }
            trends={viewMode === 'monthly' ? scorecardData.trends : {}}
            totalScore={displayMetrics.totalScore}
            percentage={displayMetrics.percentage}
            month={viewMode === 'monthly' ? selectedMonth || undefined : undefined}
            year={selectedYear}
            showWeights={true}
          />

          {/* Historical Data */}
          {viewMode === 'monthly' && scorecardData.metrics.length > 1 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Historical Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scorecardData.metrics.slice(1).map(metric => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {formatMonth(metric.month)} {metric.year}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">Score: {metric.totalScore.toFixed(1)}</Badge>
                        <Badge variant={metric.percentage >= 70 ? 'default' : 'destructive'}>
                          {metric.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {currentMetric?.notes && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{currentMetric.notes}</p>
                <p className="text-sm text-gray-500 mt-4">
                  Last updated: {format(new Date(currentMetric.updatedAt), 'PPP')}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">
              No scorecard data available for {formatMonth(selectedMonth || 1)} {selectedYear}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
