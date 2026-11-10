import { Module } from '@nestjs/common';
import { FileCleanupService } from './file-cleanup.service';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Module({
  controllers: [FileController],
  providers: [FileService, FileCleanupService],
})
export class FileModule {}
