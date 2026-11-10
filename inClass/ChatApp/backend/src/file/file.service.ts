import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isMongoId } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { FileResponseDto, FileWithDataResponseDto, UploadFileDto } from './dto/file.dto';
import { resolveUploadContent } from './file-content.util';
import { FILE_META_SELECT, FileMeta, toFileResponse } from './file.mapper';

export interface FileDownload {
  meta: FileMeta;
  bytes: Buffer;
}

@Injectable()
export class FileService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(dto: UploadFileDto, uploaderId: string): Promise<FileResponseDto> {
    const content = resolveUploadContent(dto.data, dto.mime_type);

    const file = await this.prisma.file.create({
      data: {
        name: dto.file_name.trim(),
        mimeType: content.mimeType,
        size: content.bytes.length,
        kind: content.kind,
        data: new Uint8Array(content.bytes),
        uploadedBy: uploaderId,
      },
      select: FILE_META_SELECT,
    });

    return toFileResponse(file);
  }

  async getFile(fileId: string, userId: string): Promise<FileWithDataResponseDto> {
    const { meta, bytes } = await this.loadAccessibleFile(fileId, userId);
    return { ...toFileResponse(meta), data: bytes.toString('base64') };
  }

  download(fileId: string, userId: string): Promise<FileDownload> {
    return this.loadAccessibleFile(fileId, userId);
  }

  /**
   * Loads a file the user may read: they uploaded it, or they participate
   * in a conversation where it was sent.
   */
  private async loadAccessibleFile(fileId: string, userId: string): Promise<FileDownload> {
    if (!isMongoId(fileId)) {
      throw new NotFoundException(`File '${fileId}' not found`);
    }

    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`File '${fileId}' not found`);
    }

    if (file.uploadedBy !== userId && !(await this.wasSharedWith(fileId, userId))) {
      throw new ForbiddenException('No access to this file');
    }

    const { data, ...meta } = file;
    return { meta, bytes: Buffer.from(data) };
  }

  private async wasSharedWith(fileId: string, userId: string): Promise<boolean> {
    const messages = await this.prisma.message.findMany({
      where: { fileId },
      select: { conversationId: true },
    });
    if (messages.length === 0) return false;

    const conversationIds = [...new Set(messages.map((m) => m.conversationId))];
    const shared = await this.prisma.conversation.count({
      where: { id: { in: conversationIds }, participants_ids: { has: userId } },
    });
    return shared > 0;
  }
}
