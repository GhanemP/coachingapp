import {
  calculateTotalScore,
  validateMetricScore,
  roundToDecimals,
  safeDiv,
  calculateNewScorecardMetrics,
  calculateNewScorecardTotalScore,
  NEW_SCORECARD_WEIGHTS,
} from '@/lib/calculation-utils';

export interface TrendsData {
  scheduleAdherence: number;
  attendanceRate: number;
  punctualityScore: number;
  breakCompliance: number;
  taskCompletionRate: number;
  productivityIndex: number;
  qualityScore: number;
  efficiencyRate: number;
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

export interface YearlyAverageData {
  scheduleAdherence: number;
  attendanceRate: number;
  punctualityScore: number;
  breakCompliance: number;
  taskCompletionRate: number;
  productivityIndex: number;
  qualityScore: number;
  efficiencyRate: number;
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

export interface MetricCalculationResult {
  calculatedMetrics: Record<string, number>;
  finalWeights: Record<string, number>;
  totalScore: number;
  percentage: number;
}

export interface DatabaseData {
  scheduleAdherence: number;
  attendanceRate: number;
  punctualityScore: number;
  breakCompliance: number;
  taskCompletionRate: number;
  productivityIndex: number;
  qualityScore: number;
  efficiencyRate: number;
  scheduleAdherenceWeight: number;
  attendanceRateWeight: number;
  punctualityScoreWeight: number;
  breakComplianceWeight: number;
  taskCompletionRateWeight: number;
  productivityIndexWeight: number;
  qualityScoreWeight: number;
  efficiencyRateWeight: number;
  totalScore: number;
  percentage: number;
  notes?: string;
  [key: string]: unknown;
}

/**
 * Service class for scorecard calculations
 */
export class ScorecardCalculations {
  /**
   * Calculate trends by comparing current and previous metrics
   */
  static calculateTrends(
    currentMetric: Record<string, number>,
    previousMetric: Record<string, number>
  ): TrendsData {
    return {
      // New scorecard trends
      scheduleAdherence: currentMetric.scheduleAdherence - previousMetric.scheduleAdherence,
      attendanceRate: currentMetric.attendanceRate - previousMetric.attendanceRate,
      punctualityScore: currentMetric.punctualityScore - previousMetric.punctualityScore,
      breakCompliance: currentMetric.breakCompliance - previousMetric.breakCompliance,
      taskCompletionRate: currentMetric.taskCompletionRate - previousMetric.taskCompletionRate,
      productivityIndex: currentMetric.productivityIndex - previousMetric.productivityIndex,
      qualityScore: currentMetric.qualityScore - previousMetric.qualityScore,
      efficiencyRate: currentMetric.efficiencyRate - previousMetric.efficiencyRate,

      // Legacy trends (for backward compatibility)
      service: (currentMetric.service || 0) - (previousMetric.service || 0),
      productivity: (currentMetric.productivity || 0) - (previousMetric.productivity || 0),
      quality: (currentMetric.quality || 0) - (previousMetric.quality || 0),
      assiduity: (currentMetric.assiduity || 0) - (previousMetric.assiduity || 0),
      performance: (currentMetric.performance || 0) - (previousMetric.performance || 0),
      adherence: (currentMetric.adherence || 0) - (previousMetric.adherence || 0),
      lateness: (currentMetric.lateness || 0) - (previousMetric.lateness || 0),
      breakExceeds: (currentMetric.breakExceeds || 0) - (previousMetric.breakExceeds || 0),
      totalScore: (currentMetric.totalScore || 0) - (previousMetric.totalScore || 0),
      percentage: (currentMetric.percentage || 0) - (previousMetric.percentage || 0),
    };
  }

  /**
   * Calculate yearly average from metrics array
   */
  static calculateYearlyAverage(metrics: Record<string, number>[]): YearlyAverageData {
    const avgMetrics = {
      // New scorecard metrics
      scheduleAdherence: 0,
      attendanceRate: 0,
      punctualityScore: 0,
      breakCompliance: 0,
      taskCompletionRate: 0,
      productivityIndex: 0,
      qualityScore: 0,
      efficiencyRate: 0,
      // Legacy metrics
      service: 0,
      productivity: 0,
      quality: 0,
      assiduity: 0,
      performance: 0,
      adherence: 0,
      lateness: 0,
      breakExceeds: 0,
      totalScore: 0,
      percentage: 0,
    };

    metrics.forEach(metric => {
      // New scorecard metrics
      avgMetrics.scheduleAdherence += metric.scheduleAdherence;
      avgMetrics.attendanceRate += metric.attendanceRate;
      avgMetrics.punctualityScore += metric.punctualityScore;
      avgMetrics.breakCompliance += metric.breakCompliance;
      avgMetrics.taskCompletionRate += metric.taskCompletionRate;
      avgMetrics.productivityIndex += metric.productivityIndex;
      avgMetrics.qualityScore += metric.qualityScore;
      avgMetrics.efficiencyRate += metric.efficiencyRate;

      // Legacy metrics (handle nullable values)
      avgMetrics.service += metric.service || 0;
      avgMetrics.productivity += metric.productivity || 0;
      avgMetrics.quality += metric.quality || 0;
      avgMetrics.assiduity += metric.assiduity || 0;
      avgMetrics.performance += metric.performance || 0;
      avgMetrics.adherence += metric.adherence || 0;
      avgMetrics.lateness += metric.lateness || 0;
      avgMetrics.breakExceeds += metric.breakExceeds || 0;
      avgMetrics.totalScore += metric.totalScore || 0;
      avgMetrics.percentage += metric.percentage || 0;
    });

    const count = metrics.length;
    return {
      // New scorecard metrics
      scheduleAdherence: roundToDecimals(safeDiv(avgMetrics.scheduleAdherence, count), 2),
      attendanceRate: roundToDecimals(safeDiv(avgMetrics.attendanceRate, count), 2),
      punctualityScore: roundToDecimals(safeDiv(avgMetrics.punctualityScore, count), 2),
      breakCompliance: roundToDecimals(safeDiv(avgMetrics.breakCompliance, count), 2),
      taskCompletionRate: roundToDecimals(safeDiv(avgMetrics.taskCompletionRate, count), 2),
      productivityIndex: roundToDecimals(safeDiv(avgMetrics.productivityIndex, count), 2),
      qualityScore: roundToDecimals(safeDiv(avgMetrics.qualityScore, count), 2),
      efficiencyRate: roundToDecimals(safeDiv(avgMetrics.efficiencyRate, count), 2),

      // Legacy metrics
      service: roundToDecimals(safeDiv(avgMetrics.service, count), 2),
      productivity: roundToDecimals(safeDiv(avgMetrics.productivity, count), 2),
      quality: roundToDecimals(safeDiv(avgMetrics.quality, count), 2),
      assiduity: roundToDecimals(safeDiv(avgMetrics.assiduity, count), 2),
      performance: roundToDecimals(safeDiv(avgMetrics.performance, count), 2),
      adherence: roundToDecimals(safeDiv(avgMetrics.adherence, count), 2),
      lateness: roundToDecimals(safeDiv(avgMetrics.lateness, count), 2),
      breakExceeds: roundToDecimals(safeDiv(avgMetrics.breakExceeds, count), 2),
      totalScore: roundToDecimals(safeDiv(avgMetrics.totalScore, count), 2),
      percentage: roundToDecimals(safeDiv(avgMetrics.percentage, count), 2),
    };
  }

  /**
   * Process metrics input and calculate scores
   */
  static processMetricsInput(
    rawData?: Record<string, unknown>,
    metrics?: Record<string, unknown>,
    weights?: Record<string, unknown>
  ): MetricCalculationResult {
    let calculatedMetrics: Record<string, number>;
    let finalWeights: Record<string, number>;
    let totalScore: number;
    let percentage: number;

    // Handle new scorecard structure with raw data
    if (rawData) {
      // Calculate metrics from raw data
      const rawCalculatedMetrics = calculateNewScorecardMetrics(rawData);
      calculatedMetrics = rawCalculatedMetrics as Record<string, number>;

      // Use new scorecard weights
      finalWeights = { ...NEW_SCORECARD_WEIGHTS, ...weights };

      // Calculate total score using new method
      const scoreResult = calculateNewScorecardTotalScore(rawCalculatedMetrics, finalWeights);
      totalScore = scoreResult.totalScore;
      percentage = scoreResult.percentage;
    } else if (metrics) {
      // Legacy support: Handle old 1-5 scale metrics
      const validatedMetrics = {
        service: validateMetricScore(metrics.service as number),
        productivity: validateMetricScore(metrics.productivity as number),
        quality: validateMetricScore(metrics.quality as number),
        assiduity: validateMetricScore(metrics.assiduity as number),
        performance: validateMetricScore(metrics.performance as number),
        adherence: validateMetricScore(metrics.adherence as number),
        lateness: validateMetricScore(metrics.lateness as number),
        breakExceeds: validateMetricScore(metrics.breakExceeds as number),
      };

      // Use legacy weights
      const defaultWeights = {
        serviceWeight: 1.0,
        productivityWeight: 1.0,
        qualityWeight: 1.0,
        assiduityWeight: 1.0,
        performanceWeight: 1.0,
        adherenceWeight: 1.0,
        latenessWeight: 1.0,
        breakExceedsWeight: 1.0,
      };

      finalWeights = { ...defaultWeights, ...weights };

      // Convert to array format for calculation utility
      const metricsArray = [
        { score: validatedMetrics.service, weight: finalWeights.serviceWeight },
        { score: validatedMetrics.productivity, weight: finalWeights.productivityWeight },
        { score: validatedMetrics.quality, weight: finalWeights.qualityWeight },
        { score: validatedMetrics.assiduity, weight: finalWeights.assiduityWeight },
        { score: validatedMetrics.performance, weight: finalWeights.performanceWeight },
        { score: validatedMetrics.adherence, weight: finalWeights.adherenceWeight },
        { score: validatedMetrics.lateness, weight: finalWeights.latenessWeight },
        { score: validatedMetrics.breakExceeds, weight: finalWeights.breakExceedsWeight },
      ];

      const result = calculateTotalScore(metricsArray);
      totalScore = result.totalScore;
      percentage = result.percentage;

      // Set calculated metrics to defaults for legacy data
      calculatedMetrics = {
        scheduleAdherence: 0,
        attendanceRate: 0,
        punctualityScore: 0,
        breakCompliance: 0,
        taskCompletionRate: 0,
        productivityIndex: 0,
        qualityScore: 0,
        efficiencyRate: 0,
      };
    } else {
      throw new Error('Either rawData or metrics must be provided');
    }

    return {
      calculatedMetrics,
      finalWeights,
      totalScore,
      percentage,
    };
  }

  /**
   * Prepare database data from calculation results
   */
  static prepareDatabaseData(
    calculationResult: MetricCalculationResult,
    rawData?: Record<string, unknown>,
    metrics?: Record<string, unknown>,
    notes?: string
  ): DatabaseData {
    const { calculatedMetrics, finalWeights, totalScore, percentage } = calculationResult;

    const dbData: DatabaseData = {
      // New scorecard metrics
      scheduleAdherence: calculatedMetrics.scheduleAdherence,
      attendanceRate: calculatedMetrics.attendanceRate,
      punctualityScore: calculatedMetrics.punctualityScore,
      breakCompliance: calculatedMetrics.breakCompliance,
      taskCompletionRate: calculatedMetrics.taskCompletionRate,
      productivityIndex: calculatedMetrics.productivityIndex,
      qualityScore: calculatedMetrics.qualityScore,
      efficiencyRate: calculatedMetrics.efficiencyRate,

      // New weights
      scheduleAdherenceWeight:
        finalWeights.scheduleAdherenceWeight || NEW_SCORECARD_WEIGHTS.scheduleAdherenceWeight,
      attendanceRateWeight:
        finalWeights.attendanceRateWeight || NEW_SCORECARD_WEIGHTS.attendanceRateWeight,
      punctualityScoreWeight:
        finalWeights.punctualityScoreWeight || NEW_SCORECARD_WEIGHTS.punctualityScoreWeight,
      breakComplianceWeight:
        finalWeights.breakComplianceWeight || NEW_SCORECARD_WEIGHTS.breakComplianceWeight,
      taskCompletionRateWeight:
        finalWeights.taskCompletionRateWeight || NEW_SCORECARD_WEIGHTS.taskCompletionRateWeight,
      productivityIndexWeight:
        finalWeights.productivityIndexWeight || NEW_SCORECARD_WEIGHTS.productivityIndexWeight,
      qualityScoreWeight:
        finalWeights.qualityScoreWeight || NEW_SCORECARD_WEIGHTS.qualityScoreWeight,
      efficiencyRateWeight:
        finalWeights.efficiencyRateWeight || NEW_SCORECARD_WEIGHTS.efficiencyRateWeight,

      totalScore: roundToDecimals(totalScore, 2),
      percentage: roundToDecimals(percentage, 2),
      notes,
    };

    // Add raw data fields if provided
    if (rawData) {
      Object.assign(dbData, {
        scheduledHours: rawData.scheduledHours,
        actualHours: rawData.actualHours,
        scheduledDays: rawData.scheduledDays,
        daysPresent: rawData.daysPresent,
        totalShifts: rawData.totalShifts,
        onTimeArrivals: rawData.onTimeArrivals,
        totalBreaks: rawData.totalBreaks,
        breaksWithinLimit: rawData.breaksWithinLimit,
        tasksAssigned: rawData.tasksAssigned,
        tasksCompleted: rawData.tasksCompleted,
        expectedOutput: rawData.expectedOutput,
        actualOutput: rawData.actualOutput,
        totalTasks: rawData.totalTasks,
        errorFreeTasks: rawData.errorFreeTasks,
        standardTime: rawData.standardTime,
        actualTimeSpent: rawData.actualTimeSpent,
      });
    }

    // Add legacy fields if provided
    if (metrics) {
      Object.assign(dbData, {
        service: validateMetricScore(metrics.service as number),
        productivity: validateMetricScore(metrics.productivity as number),
        quality: validateMetricScore(metrics.quality as number),
        assiduity: validateMetricScore(metrics.assiduity as number),
        performance: validateMetricScore(metrics.performance as number),
        adherence: validateMetricScore(metrics.adherence as number),
        lateness: validateMetricScore(metrics.lateness as number),
        breakExceeds: validateMetricScore(metrics.breakExceeds as number),
        serviceWeight: finalWeights.serviceWeight,
        productivityWeight: finalWeights.productivityWeight,
        qualityWeight: finalWeights.qualityWeight,
        assiduityWeight: finalWeights.assiduityWeight,
        performanceWeight: finalWeights.performanceWeight,
        adherenceWeight: finalWeights.adherenceWeight,
        latenessWeight: finalWeights.latenessWeight,
        breakExceedsWeight: finalWeights.breakExceedsWeight,
      });
    }

    return dbData;
  }
}
