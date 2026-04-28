import { IsString, MaxLength } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @MaxLength(120)
  title!: string;
}
