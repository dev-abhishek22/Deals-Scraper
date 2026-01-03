import { Command } from 'nestjs-command';
import { Injectable, Logger } from '@nestjs/common';
import { AmazonDealService } from 'src/amazon-deals/amazon-deals.service';

@Injectable()
export class StoreAmazonDeals {
  private readonly logger = new Logger(StoreAmazonDeals.name);

  constructor(private readonly amazonService: AmazonDealService) {}

  @Command({
    command: 'store:amazon-deals',
    describe: 'Fetch and store Amazon deals',
  })
  async run() {
    try {
      const startTime = Date.now();

      this.logger.log('Amazon deals storing started');

      const result = await this.amazonService.fetchAllDealCategories();

      const timeTaken = (Date.now() - startTime) / 1000;

      this.logger.log(`Amazon deals storing completed in ${timeTaken}s`);

      console.log({
        message: 'Amazon deals stored successfully',
        result,
        timeTakenSeconds: timeTaken,
      });
    } catch (error) {
      this.logger.error(
        'Error while storing Amazon deals',
        error?.stack || error,
      );
      throw error;
    }
  }
}
