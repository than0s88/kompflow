import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  // { cover, labels[], dueDate, memberIds[] } — see lib/card-ornaments.ts on web
  @IsOptional()
  @IsObject()
  ornaments?: Record<string, unknown>;
}
