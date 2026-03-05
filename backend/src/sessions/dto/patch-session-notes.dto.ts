import { IsString, MaxLength } from 'class-validator';

export class PatchSessionNotesDto {
  @IsString()
  @MaxLength(12000)
  sessionNotes!: string;
}
