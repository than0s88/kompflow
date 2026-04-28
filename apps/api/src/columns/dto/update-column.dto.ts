import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}
