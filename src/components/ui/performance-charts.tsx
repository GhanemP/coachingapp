'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { METRIC_LABELS } from '@/lib/metrics';

interface MetricData {
  month: number;
  year: number;
  service: number;
  productivity: number;
  quality: number;
  assiduity: number;
  performance: number;
  adherence: number;
  lateness: number;
  breakExceeds: number;
  totalScore: number;
  percentage: number;
}

interface PerformanceChartsProps {
  metrics: MetricData[];
  currentYear: number;
}

const COLORS = {
  service: '#3B82F6',
  productivity: '#10B981',
  quality: '#8B5CF6',
  assiduity: '#F59E0B',
  performance: '#EF4444',
  adherence: '#06B6D4',
  lateness: '#EC4899',
  breakExceeds: '#6366F1'
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getPerformanceBackgroundColor = (percentage: number) => {
  if (percentage === 0) {return 'bg-gray-100';}
  if (percentage >= 80) {return 'bg-green-500';}
  if (percentage >= 70) {return 'bg-blue-500';}
  if (percentage >= 60) {return 'bg-yellow-500';}
  return 'bg-red-500';
};

export function PerformanceCharts({ metrics, currentYear }: PerformanceChartsProps) {
  // Prepare data for the year trend chart
  const yearData = MONTHS.map((month, index) => {
    const monthData = metrics.find(m => m.month === index + 1 && m.year === currentYear);
    return {
      month,
      percentage: monthData?.percentage || 0,
      totalScore: monthData?.totalScore || 0,
      ...Object.keys(METRIC_LABELS).reduce((acc, key) => ({
        ...acc,
        [key]: monthData?.[key as keyof MetricData] || 0
      }), {})
    };
  });

  // Prepare data for the radar chart (latest month)
  const latestMetric = metrics[0];
  const radarData = latestMetric ? Object.keys(METRIC_LABELS).map(key => ({
    metric: METRIC_LABELS[key as keyof typeof METRIC_LABELS],
    score: latestMetric[key as keyof MetricData] as number,
    fullMark: 5
  })) : [];

  // Prepare data for metric breakdown pie chart
  const pieData = latestMetric ? Object.keys(METRIC_LABELS).map(key => ({
    name: METRIC_LABELS[key as keyof typeof METRIC_LABELS],
    value: latestMetric[key as keyof MetricData] as number,
    color: COLORS[key as keyof typeof COLORS]
  })) : [];

  // Custom tooltip for charts
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      color: string;
      name: string;
      value: number;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Year Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend - {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={yearData}>
              <defs>
                <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 40]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="percentage"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorPercentage)"
                name="Performance %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Metrics Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Current Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis domain={[0, 5]} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Metric Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Metric Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value?.toFixed(1) || '0'}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Individual Metric Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Metric Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={yearData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 5]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {Object.keys(METRIC_LABELS).map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[key as keyof typeof COLORS]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={METRIC_LABELS[key as keyof typeof METRIC_LABELS]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Month-on-Month Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Month-on-Month Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="percentage" fill="#3B82F6" name="Performance %" />
              <Bar dataKey="totalScore" fill="#10B981" name="Total Score" yAxisId="right" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 40]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-1">
            {yearData.map((monthData, index) => {
              const percentage = monthData.percentage;
              const bgColor = getPerformanceBackgroundColor(percentage);
              
              return (
                <div
                  key={index}
                  className={`aspect-square rounded flex items-center justify-center text-xs font-medium ${bgColor} ${percentage > 0 ? 'text-white' : 'text-gray-400'}`}
                  title={`${monthData.month}: ${percentage.toFixed(1)}%`}
                >
                  {monthData.month.substring(0, 1)}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>&lt;60%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>60-70%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>70-80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>&gt;80%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}