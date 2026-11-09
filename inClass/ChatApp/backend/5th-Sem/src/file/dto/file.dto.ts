import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const EXAMPLE_FILE_ID = '64b8f9e2c4a3b12d4e5f9001';
const EXAMPLE_PIXEL_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// ─── Request Body DTO ─────────────────────────────────────────────────────────

export class UploadFileDto {
  @ApiProperty({
    description: 'Original file name, shown to other users and used for downloads',
    example: 'holiday.jpg',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  file_name: string;

  @ApiPropertyOptional({
    description:
      'MIME type of the file. Optional when `data` is a data URL (the type is read from it) ' +
      'or when the file is a PNG/JPEG/GIF/WebP/BMP/HEIC image (the type is detected from its bytes).',
    example: 'image/jpeg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(127)
  mime_type?: string;

  @ApiProperty({
    description:
      'File contents encoded as base64. Plain base64 ("iVBORw0KGgo...") ' +
      'or a data URL ("data:image/png;base64,iVBORw0KGgo...") are both accepted.',
    example: `data:image/png;base64,${EXAMPLE_PIXEL_BASE64}`,
  })
  @IsString()
  @IsNotEmpty()
  data: string;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class FileResponseDto {
  @ApiProperty({ description: 'Unique MongoDB ObjectId of the file', example: EXAMPLE_FILE_ID })
  id: string;

  @ApiProperty({ description: 'Original file name', example: 'holiday.jpg' })
  name: string;

  @ApiProperty({ description: 'MIME type', example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({
    description: 'Size in bytes (of the decoded file, not the base64 text)',
    example: 48213,
  })
  size: number;

  @ApiProperty({
    description: 'IMAGE for recognised image formats, FILE for everything else',
    enum: ['IMAGE', 'FILE'],
    example: 'IMAGE',
  })
  kind: string;

  @ApiProperty({
    description: 'MongoDB ObjectId of the user who uploaded the file',
    example: '64b8f9e2c4a3b12d4e5f6789',
  })
  uploadedBy: string;

  @ApiProperty({ description: 'ISO timestamp of the upload', example: '2024-01-15T10:34:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Path that returns the raw bytes (send the same Authorization header)',
    example: `/file/${EXAMPLE_FILE_ID}/download`,
  })
  downloadUrl: string;
}

export class FileWithDataResponseDto extends FileResponseDto {
  @ApiProperty({
    description:
      'File contents as plain base64. To show an image, use `data:${mimeType};base64,${data}` as its URI.',
    example: EXAMPLE_PIXEL_BASE64,
  })
  data: string;
}
