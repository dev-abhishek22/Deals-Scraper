import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AmazonDealDocument = AmazonDeal & Document;

/* ===================== SUB SCHEMAS ===================== */

@Schema({ _id: false })
class PriceHistory {
  @Prop({ required: true })
  price: number;

  @Prop({ required: true, default: Date.now })
  timestamp: Date;
}

@Schema({ _id: false })
class MediaImage {
  @Prop()
  variant: string;

  @Prop({ type: Object })
  hiRes?: { url: string; width: number; height: number };

  @Prop({ type: Object })
  lowRes?: { url: string; width: number; height: number };
}

@Schema({ _id: false })
class Pricing {
  @Prop()
  currency: string;

  @Prop()
  mrp: number;

  @Prop()
  sellingPrice: number;

  @Prop()
  discountAmount: number;

  @Prop()
  discountPercent: number;

  @Prop()
  type: string; // e.g., BEST_DEAL

  @Prop()
  taxInclusive: boolean;
}

@Schema({ _id: false })
class OfferDetail {
  @Prop()
  offerId: string;

  @Prop()
  dealId: string;

  @Prop()
  state: string;

  @Prop()
  badge: string;

  @Prop()
  startTime: Date;

  @Prop()
  endTime: Date;
}

@Schema({ _id: false })
class Promotion {
  @Prop()
  type: string;

  @Prop()
  benefit: string;

  @Prop()
  termsUrl: string;
}

/* ===================== MAIN SCHEMA ===================== */

@Schema({ timestamps: true })
export class AmazonDeal {
  // --- Flattened Source Details ---
  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  marketplace: string;

  @Prop({ required: true })
  productId: string;

  @Prop()
  brandId: string;

  @Prop()
  canonicalUrl: string;

  // --- Flattened Product Details ---
  @Prop()
  title: string;

  @Prop()
  brand: string;

  @Prop()
  productType: string;

  @Prop()
  categoryId: string;

  @Prop()
  subCategoryId: string;

  // --- Objects and Arrays ---
  @Prop({ type: Pricing })
  pricing: Pricing;

  @Prop({
    type: {
      images: [SchemaFactory.createForClass(MediaImage)],
      altText: String,
    },
  })
  media: {
    images: MediaImage[];
    altText: string;
  };

  @Prop({ type: [SchemaFactory.createForClass(OfferDetail)] })
  offers: OfferDetail[];

  @Prop({ type: [SchemaFactory.createForClass(Promotion)] })
  promotions: Promotion[];

  @Prop({ type: [SchemaFactory.createForClass(PriceHistory)] })
  priceHistory: PriceHistory[];

  // --- Tracking Keys ---
  @Prop({ default: false })
  sent: boolean;

  @Prop({ default: null })
  sent_through: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const AmazonDealSchema = SchemaFactory.createForClass(AmazonDeal);

/* ===================== INDEXES ===================== */

// Composite unique index to prevent duplicate products from the same platform
// AmazonDealSchema.index({ platform: 1, productId: 1 }, { unique: true });

// // Index for price-based queries
// AmazonDealSchema.index({ 'pricing.sellingPrice': 1 });

// // Index for background jobs checking unsent deals
// AmazonDealSchema.index({ sent: 1, timestamp: -1 });
