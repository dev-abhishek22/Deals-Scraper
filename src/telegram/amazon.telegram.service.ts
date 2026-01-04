import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { AmazonDealService } from 'src/amazon-deals/amazon-deals.service';
import { LOOT_CONFIG } from 'src/common/config/loot-channel.config';

@Injectable()
export class AmazonTelegramService implements OnModuleInit {
  private bot: Telegraf;

  constructor(
    private readonly configService: ConfigService,
    private readonly amazonDealService: AmazonDealService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is missing');
    this.bot = new Telegraf(token);
  }

  onModuleInit() {
    this.bot.launch();
    console.log('🤖 Telegram Broadcaster is online');
  }

  async runGlobalAmazonHeist(): Promise<any[]> {
    const finalReport: any[] = [];

    for (const channel of LOOT_CONFIG.AMAZON) {
      const channelId = this.configService.get<string>(channel.telegramId);
      const channelUser =
        this.configService.get<string>(channel.username) || channel.username;
      const tag =
        this.configService.get<string>(channel.affiliateTag) ||
        channel.affiliateTag;

      if (channelId) {
        console.log(`🚀 Starting heist for: ${channel.name}`);
        const result = await this.executeHeist(
          channelId,
          tag,
          channelUser,
          channel.id,
        );
        finalReport.push({ channel: channel.name, ...result });
      }
    }

    console.table(finalReport);
    return finalReport;
  }

  async executeHeist(
    channelId: string,
    tag: string,
    channelUser: string,
    configId: number,
  ): Promise<any> {
    const stats: any = {
      totalFetched: 0,
      sent: 0,
      failed: 0,
      dbUpdated: 0,
      failures: [] as any[],
    };

    try {
      const batch = await this.amazonDealService.fetchLootBatch(50);
      stats.totalFetched = batch.length;

      if (batch.length === 0) return stats;

      const templatePath = path.join(
        process.cwd(),
        'views',
        'amazon-deals.hbs',
      );
      const source = fs.readFileSync(templatePath, 'utf-8');
      const template = handlebars.compile(source);

      const sentIds: string[] = [];

      for (const deal of batch) {
        try {
          const htmlCaption = template({ ...deal, channelName: channelUser });

          await this.bot.telegram.sendPhoto(channelId, deal.image, {
            caption: htmlCaption,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🛒 SECURE THE LOOT NOW',
                    url: `${deal.url}?tag=${tag}`,
                  },
                ],
              ],
            },
          });

          sentIds.push(deal._id);
          stats.sent++;
          await new Promise((res) => setTimeout(res, 3000));
        } catch (error) {
          if (error.message.includes('caption is too long')) {
            try {
              const retryCaption = template({
                ...deal,
                title: deal.title.substring(0, 150) + '...',
                channelName: channelUser,
              });
              await this.bot.telegram.sendPhoto(channelId, deal.image, {
                caption: retryCaption,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '🛒 SECURE THE LOOT NOW',
                        url: `${deal.url}?tag=${tag}`,
                      },
                    ],
                  ],
                },
              });
              sentIds.push(deal._id);
              stats.sent++;
              await new Promise((res) => setTimeout(res, 3000));
            } catch (retryErr) {
              stats.failed++;
              stats.failures.push({
                id: deal.productId,
                reason: retryErr.message,
              });
            }
          } else {
            stats.failed++;
            stats.failures.push({ id: deal.productId, reason: error.message });
          }
        }
      }

      if (sentIds.length > 0) {
        const updateResult = await this.amazonDealService.markBatchAsSent(
          sentIds,
          configId,
        );
        stats.dbUpdated = (updateResult as any).modifiedCount || 0;
      }

      return stats;
    } catch (error) {
      return { ...stats, error: error.message };
    }
  }
}
