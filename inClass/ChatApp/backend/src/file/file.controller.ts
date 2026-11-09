import { Body, Controller, Get, Header, Param, Post, StreamableFile } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { FileResponseDto, FileWithDataResponseDto, UploadFileDto } from './dto/file.dto';
import { contentDisposition } from './file-content.util';
import { FileService } from './file.service';

const FILE_ID_PARAM = {
  name: 'id',
  description: 'MongoDB ObjectId of the file',
  example: '64b8f9e2c4a3b12d4e5f9001',
};

@ApiTags('files')
@ApiSecurity('basic-auth')
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post()
  @ApiOperation({
    summary: 'Upload an image or file (base64)',
    description:
      'Uploads a file sent as base64 in a JSON body (max 10 MB). ' +
      'PNG, JPEG, GIF, WebP, BMP and HEIC/HEIF images are recognised from their bytes and stored with kind IMAGE; ' +
      'anything else is stored as FILE. ' +
      'To send it in a chat, pass the returned `id` as `file_id` to `POST /message`.',
  })
  @ApiBody({ type: UploadFileDto })
  @ApiResponse({ status: 201, description: 'File stored', type: FileResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Invalid base64, empty file, or data that is not the declared image type',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization header' })
  @ApiResponse({ status: 413, description: 'File larger than 10 MB' })
  upload(@Body() body: UploadFileDto, @CurrentUser() user: any) {
    return this.fileService.upload(body, user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a file as base64',
    description:
      'Returns the file metadata and its contents as base64. ' +
      'Allowed for the uploader and for participants of conversations where the file was sent.',
  })
  @ApiParam(FILE_ID_PARAM)
  @ApiResponse({ status: 200, description: 'File with base64 data', type: FileWithDataResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization header' })
  @ApiResponse({ status: 403, description: 'No access to this file' })
  @ApiResponse({ status: 404, description: 'File not found' })
  getFile(@Param('id') id: string, @CurrentUser() user: any) {
    return this.fileService.getFile(id, user.id);
  }

  @Get(':id/download')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({
    summary: 'Download a file (raw bytes)',
    description:
      'Returns the original bytes with their Content-Type. ' +
      'Images are shown inline, other files are downloaded. Same access rules as GET /file/{id}.',
  })
  @ApiParam(FILE_ID_PARAM)
  @ApiResponse({ status: 200, description: 'The file contents' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization header' })
  @ApiResponse({ status: 403, description: 'No access to this file' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async download(@Param('id') id: string, @CurrentUser() user: any) {
    const { meta, bytes } = await this.fileService.download(id, user.id);
    const disposition = meta.kind === 'IMAGE' ? 'inline' : 'attachment';
    return new StreamableFile(bytes, {
      type: meta.mimeType,
      length: bytes.length,
      disposition: contentDisposition(disposition, meta.name),
    });
  }
}
