import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Creates a Prisma client configured with the PostgreSQL adapter.
   */
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    super({ adapter });
  }

  /**
   * Opens the database connection when the Nest module initializes.
   * @returns A promise that resolves after Prisma connects to the database.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Closes the database connection when the Nest module is destroyed.
   * @returns A promise that resolves after Prisma disconnects from the database.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
