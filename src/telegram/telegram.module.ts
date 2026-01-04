import { Module, Global } from '@nestjs/common';
import { AmazonTelegramService } from './amazon.telegram.service';
import { AmazonDealsModule } from '../amazon-deals/amazon-deals.module';
import { forwardRef } from '@nestjs/common';

@Global()
@Module({
  imports: [forwardRef(() => AmazonDealsModule)],
  providers: [AmazonTelegramService],
  exports: [AmazonTelegramService],
})
export class TelegramModule {}
