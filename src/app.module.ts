import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './logger/logger.module';
import { CommandModule } from 'nestjs-command';
import { StoreAmazonDeals } from './commands/amazon-deals.commands';
import { AmazonDealsModule } from './amazon-deals/amazon-deals.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    LoggerModule,
    CommandModule,
    AmazonDealsModule,
  ],
  providers: [StoreAmazonDeals],
})
export class AppModule {}
