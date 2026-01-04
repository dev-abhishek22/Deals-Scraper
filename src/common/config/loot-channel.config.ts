export interface LootChannel {
  name: string;
  telegramId: string;
  platform: 'amazon' | 'flipkart' | 'ajio';
  affiliateTag: string;
}

export const LOOT_CONFIG = {
  AMAZON: [
    {
      id: 1,
      name: 'Amazon Tech Loot',
      telegramId: 'AMAZON_CHANNEL_1',
      username: 'AMAZON_USERNAME_1',
      platform: 'amazon',
      affiliateTag: 'AMAZON_TAG_1',
    },
    // {
    //   name: 'Amazon Fashion Loot',
    //   telegramId: 'AMAZON_CHANNEL_2',
    //   platform: 'amazon',
    //   affiliateTag: 'AMAZON_TAG_2',
    // },
    // {
    //   name: 'Amazon Daily Mix',
    //   telegramId: 'AMAZON_CHANNEL_3',
    //   platform: 'amazon',
    //   affiliateTag: 'AMAZON_TAG_3',
    // },
  ],
  FLIPKART: [],
};
