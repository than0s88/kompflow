import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  workspaceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
