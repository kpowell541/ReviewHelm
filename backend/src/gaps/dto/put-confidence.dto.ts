import { IsObject } from 'class-validator';

export class PutConfidenceDto {
  @IsObject()
  histories!: Record<string, unknown>;
}
