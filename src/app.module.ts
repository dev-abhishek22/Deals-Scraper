import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './logger/logger.module';
import { CommandModule } from 'nestjs-command';
import { StoreAmazonDeals } from './commands/amazon-deals.commands';
import { AmazonDealsModule } from './amazon-deals/amazon-deals.module';
import { TelegramModule } from './telegram/telegram.module';
import { TasksService } from './task.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    LoggerModule,
    CommandModule,
    AmazonDealsModule,
    TelegramModule
  ],
  providers: [TasksService, StoreAmazonDeals],
})
export class AppModule {}
