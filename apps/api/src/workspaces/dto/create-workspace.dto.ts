import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsIn(['private', 'workspace'])
  visibility?: 'private' | 'workspace';
}
