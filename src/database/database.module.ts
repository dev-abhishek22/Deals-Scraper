import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDev = configService.get<string>('NODE_ENV') !== 'production';
        mongoose.set('debug', (collection, method, query, doc) => {
          console.log(
            `[MongoDB] ${collection}.${method}`,
            JSON.stringify(query),
            JSON.stringify(doc),
          );
        });

        mongoose.connection.on('connected', () => {
          console.log('[MongoDB] Connected');
        });

        mongoose.connection.on('error', (err) => {
          console.error('[MongoDB] Connection error', err);
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('[MongoDB] Disconnected');
        });

        return {
          uri: configService.get<string>('MONGO_URI'),
          autoIndex: isDev,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
