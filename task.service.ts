import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AmazonDealService } from 'src/amazon-deals/amazon-deals.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly amazonService: AmazonDealService) {}

  @Cron(CronExpression.EVERY_12_HOURS)
  async fetchAmazonDeals() {
    const jobName = 'Amazon Deals Cron';
    const startTime = Date.now();

    try {
      this.logger.log(`${jobName} started`);

      const result = await this.amazonService.fetchAllDealCategories();

      const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

      this.logger.log(
        `${jobName} completed in ${timeTaken}s | Result: ${JSON.stringify(
          result,
        )}`,
      );
    } catch (error) {
      this.logger.error(`Error in ${jobName}`, error?.stack || error);
    }
  }
}
