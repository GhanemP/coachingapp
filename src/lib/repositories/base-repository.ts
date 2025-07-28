/**
 * Base repository interface for common database operations
 * Provides abstraction layer over Prisma ORM
 */

export interface FindManyOptions<T = Record<string, unknown>> {
  where?: Partial<T>;
  include?: Record<string, boolean | object>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
}

export interface FindUniqueOptions<T = Record<string, unknown>> {
  where: Partial<T>;
  include?: Record<string, boolean | object>;
}

export interface CreateOptions<T = Record<string, unknown>> {
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
  include?: Record<string, boolean | object>;
}

export interface UpdateOptions<T = Record<string, unknown>> {
  where: { id: string };
  data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
  include?: Record<string, boolean | object>;
}

export interface BaseRepository<T> {
  findMany(options?: FindManyOptions<T>): Promise<T[]>;
  findUnique(options: FindUniqueOptions<T>): Promise<T | null>;
  findById(id: string, include?: Record<string, boolean | object>): Promise<T | null>;
  create(options: CreateOptions<T>): Promise<T>;
  update(options: UpdateOptions<T>): Promise<T>;
  delete(id: string): Promise<T>;
  count(where?: Partial<T>): Promise<number>;
}

export abstract class AbstractRepository<T> implements BaseRepository<T> {
  protected abstract model: {
    findMany: (args: Record<string, unknown>) => Promise<T[]>;
    findUnique: (args: Record<string, unknown>) => Promise<T | null>;
    create: (args: Record<string, unknown>) => Promise<T>;
    update: (args: Record<string, unknown>) => Promise<T>;
    delete: (args: Record<string, unknown>) => Promise<T>;
    count: (args: Record<string, unknown>) => Promise<number>;
  };

  protected handleError(operation: string, error: unknown): void {
    console.error(`Repository error in ${operation}:`, error);
    // Additional error handling logic can be added here
    // such as logging to external services, metrics, etc.
  }

  async findMany(options: FindManyOptions<T> = {}): Promise<T[]> {
    return await this.model.findMany({
      where: options.where,
      include: options.include,
      orderBy: options.orderBy,
      skip: options.skip,
      take: options.take,
    });
  }

  async findUnique(options: FindUniqueOptions<T>): Promise<T | null> {
    return await this.model.findUnique({
      where: options.where,
      include: options.include,
    });
  }

  async findById(id: string, include?: Record<string, boolean | object>): Promise<T | null> {
    return await this.model.findUnique({
      where: { id },
      include,
    });
  }

  async create(options: CreateOptions<T>): Promise<T> {
    return await this.model.create({
      data: options.data,
      include: options.include,
    });
  }

  async update(options: UpdateOptions<T>): Promise<T> {
    return await this.model.update({
      where: options.where,
      data: options.data,
      include: options.include,
    });
  }

  async delete(id: string): Promise<T> {
    return await this.model.delete({
      where: { id },
    });
  }

  async count(where?: Partial<T>): Promise<number> {
    return await this.model.count({
      where,
    });
  }
}