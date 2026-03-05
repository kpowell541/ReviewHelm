import { IsObject, IsString, MinLength } from 'class-validator';

export class PublishChecklistsDto {
  @IsString()
  @MinLength(1)
  version!: string;

  @IsObject()
  byId!: Record<string, string>;
}
