import {
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { AmazonDealService } from './amazon-deals.service';
import { AmazonTelegramService } from 'src/telegram/amazon.telegram.service';

@Controller('amazon')
export class AmazonDealsController {
  constructor(private readonly amazonDealService: AmazonDealService,
    private readonly amazonTelegramService: AmazonTelegramService
  ) {}

  @Post('test')
  async testDeals() {
    const result = await this.amazonDealService.fetchAllDealCategories();
    return {
      success: true,
      result,
    };
  }

  @Get('deals')
  async getDeals() {
    return await this.amazonTelegramService.runGlobalAmazonHeist();
  }
}
