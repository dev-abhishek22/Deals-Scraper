import { Controller, Post } from '@nestjs/common';
import { AmazonDealService } from './amazon-deals.service';

@Controller('amazon')
export class AmazonDealsController {
  constructor(private readonly amazonService: AmazonDealService) {}

  @Post('test')
  async testDeals() {
    const result = await this.amazonService.fetchAllDealCategories();
    return {
      success: true,
      result,
    };
  }
}
