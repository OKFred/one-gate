import FileManager from '@/components/FileManager';
import type {
  FileManagerAdapter,
  FileManagerFile,
  FileManagerListResult,
} from '@/components/FileManager';
import { THIS_PERMISSION } from '../../constant';
import { useTranslation } from '@/hooks/useTranslation';
import * as OSSFileAPI from '@/api/infra/data/oss/file';

const ossFileAdapter: FileManagerAdapter = {
  listDirectory: async ({ prefix, pageSize, cursor }): Promise<FileManagerListResult> => {
    const res = await OSSFileAPI.listDirectoryFn({
      data: {
        prefix,
        pageSize,
        cursor,
      },
    });
    const data = res.data.data;
    return {
      prefix: data.prefix,
      directories: data.directories,
      files: data.files,
      cursor: data.cursor,
      hasMore: data.hasMore,
    };
  },
  getDownloadUrl: async (file: FileManagerFile) => {
    const res = await OSSFileAPI.getFn({ data: { key: file.key } });
    return res.data.data.downloadUrl;
  },
  createUploadUrl: async ({ key, contentType, expiresIn }) => {
    const res = await OSSFileAPI.addFn({
      data: {
        key,
        contentType,
        expiresIn,
      },
    });
    return res.data.data.url;
  },
  uploadDirect: (url, file, contentType, onProgress) =>
    OSSFileAPI.directUploadFn(url, file, contentType, onProgress),
  deleteFile: (file) => OSSFileAPI.deleteFn({ data: { key: file.key } }),
};

export default function OSSFilePage() {
  const t = useTranslation();

  return (
    <FileManager
      title={t('oss.file.title')}
      adapter={ossFileAdapter}
      permissions={{
        upload: [THIS_PERMISSION.oss_file.add],
        delete: [THIS_PERMISSION.oss_file.delete],
        download: [THIS_PERMISSION.oss_file.read],
      }}
    />
  );
}
