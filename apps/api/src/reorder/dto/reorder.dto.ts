import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ColumnReorderItemDto {
  @IsString()
  id!: string;

  @IsInt()
  position!: number;
}

export class CardReorderItemDto {
  @IsString()
  id!: string;

  @IsInt()
  position!: number;

  @IsString()
  columnId!: string;
}

export class ReorderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnReorderItemDto)
  columns?: ColumnReorderItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardReorderItemDto)
  cards?: CardReorderItemDto[];
}
