import { Module } from '@nestjs/common';
import { AmazonDealService } from './amazon-deals.service';
import { AmazonDealsController } from './amazon-deals.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AmazonDeal, AmazonDealSchema } from './models/amazon-deal.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AmazonDeal.name, schema: AmazonDealSchema }
    ]),
  ],
  controllers: [AmazonDealsController],
  providers: [AmazonDealService],
  exports: [AmazonDealService],
})
export class AmazonDealsModule {}
