/**
 * Repository Pattern Implementation
 *
 * This module provides a database abstraction layer using the Repository pattern
 * to eliminate direct Prisma usage throughout the application and improve
 * maintainability, testability, and separation of concerns.
 *
 * Benefits:
 * - Centralized database operations
 * - Consistent error handling
 * - Type-safe interfaces
 * - Easy testing with mocks
 * - Reduced coupling to Prisma ORM
 */

// Base repository exports
export * from './base-repository';

// Specific repository exports
export * from './user-repository';
export * from './agent-metric-repository';

// Repository instances for easy import
export { userRepository } from './user-repository';
export { agentMetricRepository } from './agent-metric-repository';

/**
 * Usage Examples:
 *
 * // Import specific repository
 * import { userRepository } from '@/lib/repositories';
 *
 * // Use in API routes or services
 * const user = await userRepository.findByEmail('user@example.com');
 * const users = await userRepository.findByRole('AGENT');
 *
 * // Create new user
 * const newUser = await userRepository.create({
 *   email: 'new@example.com',
 *   name: 'New User',
 *   role: 'AGENT'
 * });
 *
 * // Update user
 * const updatedUser = await userRepository.update(userId, {
 *   name: 'Updated Name'
 * });
 *
 * // Agent metrics
 * import { agentMetricRepository } from '@/lib/repositories';
 *
 * const metrics = await agentMetricRepository.findByAgent(agentId);
 * const averages = await agentMetricRepository.getAverageScores(agentId);
 */
