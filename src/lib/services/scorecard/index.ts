/**
 * Scorecard Service Module
 *
 * This module provides a refactored, modular approach to handling scorecard operations.
 * It replaces the original 479-line monolithic API route with focused, maintainable modules.
 */

export { ScorecardService } from './scorecard-service';
export { ScorecardCalculations } from './scorecard-calculations';
export {
  handleGetScorecard,
  handleCreateScorecard,
  handleDeleteScorecard,
} from './scorecard-handlers';

export type {
  ScorecardQueryParams,
  ScorecardMetricsInput,
  ScorecardDeleteParams,
  AuthorizedUser,
} from './scorecard-service';

export type {
  TrendsData,
  YearlyAverageData,
  MetricCalculationResult,
  DatabaseData,
} from './scorecard-calculations';
