import { PartialType } from '@nestjs/mapped-types';
import { CreateAmazonDealDto } from './create-amazon-deal.dto';

export class UpdateAmazonDealDto extends PartialType(CreateAmazonDealDto) {}
