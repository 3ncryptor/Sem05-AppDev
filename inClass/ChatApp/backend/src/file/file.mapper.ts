import { FileResponseDto } from './dto/file.dto';

/** Prisma select for file metadata. Never includes the stored bytes. */
export const FILE_META_SELECT = {
  id: true,
  name: true,
  mimeType: true,
  size: true,
  kind: true,
  uploadedBy: true,
  createdAt: true,
} as const;

export interface FileMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: string;
  uploadedBy: string;
  createdAt: Date;
}

export function toFileResponse(file: FileMeta): FileResponseDto {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    kind: file.kind,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt,
    downloadUrl: `/file/${file.id}/download`,
  };
}
