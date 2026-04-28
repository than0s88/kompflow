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

  // Set when moving a card to a column on a different board (cross-board transfer)
  @IsOptional()
  @IsString()
  targetBoardId?: string;
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
