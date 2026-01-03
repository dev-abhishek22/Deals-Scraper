import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  chromium,
  Browser,
  BrowserContext,
  BrowserContextOptions,
  Page,
  Request,
} from 'playwright';
import { AmazonDeal } from './models/amazon-deal.model';

@Injectable()
export class AmazonDealService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  private capturedHeaders: Record<string, string> = {};

  constructor(
    @InjectModel(AmazonDeal.name)
    private readonly dealsModel: Model<AmazonDeal>,
  ) {}

  buildAmazonHeaders(): {
    browserContext: BrowserContextOptions;
  } {
    return {
      browserContext: {
        locale: 'en-IN',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/143.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        timezoneId: 'Asia/Kolkata',
        javaScriptEnabled: true,
      },
    };
  }

  async warmUpAmazon(): Promise<void> {
    if (this.browser && this.page) return;

    const { browserContext } = this.buildAmazonHeaders();

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    this.context = await this.browser.newContext(browserContext);
    this.page = await this.context.newPage();

    const activePage = this.page;

    // Promise to wait for security tokens
    let resolveTokens: (val: boolean) => void;
    const tokenPromise = new Promise<boolean>((res) => {
      resolveTokens = res;
    });

    let tokensCaptured = false;

    const requestListener = (request: Request) => {
      const url = request.url();
      if (
        !tokensCaptured &&
        url.includes('data.amazon.in') &&
        url.includes('promotions')
      ) {
        const headers = request.headers();
        if (
          headers['x-api-csrf-token'] &&
          headers['x-amzn-encrypted-slate-token']
        ) {
          this.capturedHeaders = { ...headers };
          tokensCaptured = true;
          resolveTokens(true);
          console.log('✅ Amazon security tokens captured');
        }
      }
    };

    activePage.on('request', requestListener);

    try {
      console.log('🌐 Navigating to Amazon Deals...');
      await activePage.goto('https://www.amazon.in/deals', {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });

      await activePage.waitForSelector('#nav-logo-sprites', {
        timeout: 15_000,
      });

      const triggerAndTry = async (scrollAmount: number) => {
        await activePage.evaluate((y) => window.scrollBy(0, y), scrollAmount);
        return await Promise.race([
          tokenPromise,
          new Promise<boolean>((res) => setTimeout(() => res(false), 5000)),
        ]);
      };

      console.log('🖱️ Scrolling to trigger API...');
      let captured = await triggerAndTry(800);

      if (!captured) {
        console.warn('⚠️ Tokens not captured yet. Trying a deeper scroll...');
        captured = await triggerAndTry(1200);
      }

      if (!captured && !tokensCaptured) {
        throw new Error('Security tokens not captured after multiple scrolls.');
      }

      console.log('🚀 Amazon warm-up completed successfully');
    } catch (error: any) {
      console.error('❌ Amazon warm-up failed:', error.message);
      await this.onModuleDestroy();
      throw error;
    } finally {
      activePage.off('request', requestListener);
    }
  }

  /* ===================== FETCH & STORE ===================== */

  async fetchAndStoreDeals(basePayload: any): Promise<number> {
    if (!this.page) throw new Error('Amazon not warmed up');

    let totalStored = 0;
    let startIndex = 0;
    let lastIndex = -1;

    const expandHeader =
      'rankedPromotions[].product(product/v2).title(product.offer.title/v1),' +
      'rankedPromotions[].product(product/v2).links(product.links/v2),' +
      'rankedPromotions[].product(product/v2).brandLogo(product.brand-logo/v1).logo(brand.logo/v1),' +
      'rankedPromotions[].product(product/v2).buyingOptions[].dealBadge(product.deal-badge/v1),' +
      'rankedPromotions[].product(product/v2).buyingOptions[].dealDetails(product.deal-details/v1),' +
      'rankedPromotions[].product(product/v2).buyingOptions[].promotionsUnified(product.promotions-unified/v1),' +
      'rankedPromotions[].product(product/v2).productImages(product.product-images/v2),' +
      'rankedPromotions[].product(product/v2).buyingOptions[].price(product.price/v1),' +
      'rankedPromotions[].product(product/v2).twisterVariations(product.twister-variations/v2),' +
      'rankedPromotions[].product(product/v2).buyingOptions[].callToAction(product.call-to-action/v1),' +
      'rankedPromotions[].product(product/v2).buyingOptions[].dealCustomerStatus(product.deal-customer-status/v1),' +
      'rankedPromotions[].product(product/v2).productCategory(product.offer.product-category/v1)';

    while (totalStored < 100) {
      const rankingContext = encodeURIComponent(
        JSON.stringify(basePayload.rankingContext),
      );
      const filters = encodeURIComponent(JSON.stringify(basePayload.filters));

      const apiUrl =
        `https://data.amazon.in/api/marketplaces/A21TJRUUN4KGV/promotions` +
        `?pageSize=30` +
        `&startIndex=${startIndex}` +
        `&calculateRefinements=true` +
        `&_enableNestedRefs=true` +
        `&rankingContext=${rankingContext}` +
        `&filters=${filters}`;

      const response = await this.page.request.get(apiUrl, {
        headers: {
          ...this.capturedHeaders,
          accept: `application/vnd.com.amazon.api+json; type="promotions.search.result/v1"; expand="${expandHeader}"`,
          'content-type': 'application/json',
          referer: 'https://www.amazon.in/deals',
          origin: 'https://www.amazon.in',
        },
      });

      if (!response.ok()) {
        console.error(
          `Amazon API Error: ${response.status()} - ${await response.text()}`,
        );
        break;
      }

      const data = await response.json();
      const promotions = data.entity?.rankedPromotions || [];

      if (promotions.length === 0) break;

      await this.storePromotionsResponse(data);
      totalStored += promotions.length;

      if (promotions.length < 30) break;

      const nextIndex = data.entity.nextIndex;
      if (nextIndex === undefined || nextIndex === lastIndex) break;

      lastIndex = startIndex;
      startIndex = nextIndex;

      await this.page.waitForTimeout(2000);
    }

    return totalStored;
  }

  async fetchAllDealCategories() {
    await this.warmUpAmazon();
    const results: Record<string, number> = {};

    for (const filter of this.getPromotionFilters()) {
      results[filter.name] = await this.fetchAndStoreDeals(filter.payload);
      await this.page?.waitForTimeout(3000);
    }
    return results;
  }

  /* ===================== TRANSFORMS ===================== */

  private extractMedia(product: any) {
    const images = product.productImages?.entity?.images ?? [];
    return {
      images: images.map((img: any) => ({
        variant: img.variant,
        hiRes: img.hiRes?.physicalId
          ? {
              url: `https://m.media-amazon.com/images/I/${img.hiRes.physicalId}.jpg`,
              width: img.hiRes.width,
              height: img.hiRes.height,
            }
          : undefined,
        lowRes: img.lowRes?.physicalId
          ? {
              url: `https://m.media-amazon.com/images/I/${img.lowRes.physicalId}.jpg`,
              width: img.lowRes.width,
              height: img.lowRes.height,
            }
          : undefined,
      })),
      altText: product.productImages?.entity?.altText,
    };
  }

  async storePromotionsResponse(response: any) {
    const promotionsList = response.entity?.rankedPromotions || [];

    for (const promo of promotionsList) {
      const product = promo.product?.entity;
      if (!product) continue;

      const primaryOption = product.buyingOptions?.[0];
      const pPay = primaryOption?.price?.entity?.priceToPay;
      const pBasis = primaryOption?.price?.entity?.basisPrice;
      const pSavings = primaryOption?.price?.entity?.savings;

      const currentPrice = Number(pPay?.moneyValueOrRange?.value?.amount || 0);

      const pricing = {
        currency: pPay?.moneyValueOrRange?.value?.currencyCode || 'INR',
        mrp: Number(pBasis?.moneyValueOrRange?.value?.amount || 0),
        sellingPrice: currentPrice,
        discountAmount: Number(pSavings?.money?.amount || 0),
        discountPercent: pSavings?.percentage?.value || 0,
        type: pPay?.type,
        taxInclusive:
          pPay?.impositions?.some(
            (i: any) => i.id === 'TAX_INCLUSIVE_MESSAGE',
          ) || false,
      };

      const offers = (product.buyingOptions || []).map((opt: any) => ({
        offerId: opt.price?.resource?.url?.split('/')?.pop(),
        dealId: opt.dealDetails?.entity?.id,
        state: opt.dealDetails?.entity?.state,
        badge: opt.dealBadge?.entity?.label?.content?.fragments?.[0]?.text,
        startTime: opt.dealDetails?.entity?.startTime
          ? new Date(opt.dealDetails.entity.startTime)
          : null,
        endTime: opt.dealDetails?.entity?.endTime
          ? new Date(opt.dealDetails.entity.endTime)
          : null,
      }));

      const bankPromotions = (
        primaryOption?.promotionsUnified?.entity?.displayablePromotions || []
      ).map((p: any) => ({
        type: p.base?.displayStyles?.[0],
        benefit: p.longMessage?.message?.fragments
          ?.map((f: any) => f.text)
          .join(' '),
        termsUrl: p.longMessage?.message?.fragments?.find((f: any) => f.link)
          ?.link?.url,
      }));

      await this.dealsModel.updateOne(
        { platform: 'amazon', productId: product.asin },
        {
          $set: {
            platform: 'amazon',
            marketplace: 'amazon.in',
            productId: product.asin,
            brandId: promo.brandId,
            canonicalUrl: product.links?.entity?.viewOnAmazon?.url,
            title: product.title?.entity?.displayString,
            brand:
              product.brandLogo?.entity?.logo?.entity?.altText ||
              product.brandLogo?.entity?.altText,
            productType: product.productCategory?.entity?.productType,
            categoryId: product.productCategory?.entity?.categoryId,
            subCategoryId: product.productCategory?.entity?.subCategoryId,
            pricing,
            media: this.extractMedia(product),
            offers,
            promotions: bankPromotions,
            timestamp: new Date(),
          },
          $push: {
            priceHistory: {
              price: currentPrice,
              timestamp: new Date(),
            },
          },
          $setOnInsert: {
            sent: false,
            sent_through: null,
          },
        },
        { upsert: true },
      );
    }
  }

  buildPromotionsPayload(params: any) {
    return {
      rankingContext: {
        pageTypeId: 'deals',
        rankGroup: params.rankGroup ?? 'CITADEL_ESPEON_BLEND_RANKING',
      },
      filters: {
        includedDepartments: [],
        excludedDepartments: [],
        includedTags: [],
        excludedTags: [],
        promotionTypes: [],
        accessTypes: [],
        brandIds: [],
        unifiedIds: [],
      },
    };
  }

  private getPromotionFilters() {
    const sortOrders = [
      'CITADEL_ESPEON_BLEND_RANKING',
      'BY_PERCENTAGE_OFF_DESC',
      'BY_CREATION_DATE_DESC',
      'BY_PRICE_ASC',
    ];

    const randomSort =
      sortOrders[Math.floor(Math.random() * sortOrders.length)];

    return [
      {
        name: 'ALL',
        payload: this.buildPromotionsPayload({
          rankGroup: randomSort,
        }),
      },
      {
        name: 'ELECTRONICS_BASIC',
        payload: this.buildPromotionsPayload({
          departmentIds: ['976420031'],
          rankGroup: randomSort,
        }),
      },
      {
        name: 'ELECTRONICS_LIGHTNING',
        payload: this.buildPromotionsPayload({
          departmentIds: ['976420031'],
          promotionTypes: ['LIGHTNING_DEAL'],
          rankGroup: randomSort,
          excludedTags: [
            'PantryDOTD',
            'PRIME_ONLY_LD',
            'BAU_SL_Prime',
            'Exdealspage',
            'restrictedcontent',
            'APPAREL_SL_DOTD_XCM',
            'SL_DOTD_XCM',
            'LDexclusion',
            'PJONLY',
            'PRIME_BAU',
            'automatedPEATag',
            'SP_PRIME_BAU',
            'predefined-request#deals-collection-lightning-deals',
          ],
        }),
      },
      {
        name: 'ELECTRONICS_COUPONS',
        payload: this.buildPromotionsPayload({
          departmentIds: ['976420031'],
          promotionTypes: ['COUPON'],
          rankGroup: randomSort,
          excludedTags: [
            'restrictedcontent',
            'predefined-request#deals-collection-coupons',
          ],
        }),
      },
      {
        name: 'ELECTRONICS_TRENDING',
        payload: this.buildPromotionsPayload({
          departmentIds: ['976420031'],
          rankGroup: 'TRENDING_DEAL_RANKING',
          includedTags: ['PIMA_TRENDING'],
          excludedTags: ['predefined-request#trending-bubble'],
        }),
      },
    ];
  }

  async onModuleDestroy() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.browser = null;
    this.page = null;
  }
}
