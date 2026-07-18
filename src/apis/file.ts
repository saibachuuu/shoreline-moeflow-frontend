/**
 * 文件相关 API
 */
import { request } from '.';
import { AxiosRequestConfig } from 'axios';
import { toUnderScoreCase } from '@/utils';
import { PaginationParams } from '.';
import { File } from '@/interfaces';

/** 获取项目中文件列表的请求数据 */
interface GetProjectFilesParams {
  target?: string;
  word?: string;
}
/** 获取项目中文件列表 */
const getProjectFiles = ({
  projectID,
  params,
  configs,
}: {
  projectID: string;
  params?: GetProjectFilesParams & PaginationParams;
  configs?: AxiosRequestConfig;
}) => {
  return request<File[]>({
    method: 'GET',
    url: `/v1/projects/${projectID}/files`,
    params: toUnderScoreCase(params),
    ...configs,
  });
};

/** 获取文件的请求数据 */
interface GetFileParams {
  target?: string;
}
export interface GetFileReturn extends File {
  projectID: string;
}
/** 获取文件 */
const getFile = ({
  fileID,
  params,
  configs,
}: {
  fileID: string;
  params?: GetFileParams;
  configs?: AxiosRequestConfig;
}) => {
  return request<GetFileReturn>({
    method: 'GET',
    url: `/v1/files/${fileID}`,
    params: toUnderScoreCase(params),
    ...configs,
  });
};

interface DeleteFileResponse {
  message: string;
}

/** 删除文件 */
const deleteFile = ({
  id,
  configs,
}: {
  id: string;
  configs?: AxiosRequestConfig;
}) => {
  return request<DeleteFileResponse>({
    method: 'DELETE',
    url: `/v1/files/${id}`,
    ...configs,
  });
};

interface RegenerateThumbnailsResponse {
  message: string;
  count?: number;
}

/** 重新生成项目中所有图片的缩略图和采样图 */
const regenerateThumbnails = ({
  projectID,
  configs,
}: {
  projectID: string;
  configs?: AxiosRequestConfig;
}) => {
  return request<RegenerateThumbnailsResponse>({
    method: 'POST',
    url: `/v1/projects/${projectID}/thumbnails`,
    ...configs,
  });
};

/** 重新生成单张图片的缩略图和采样图 */
const regenerateThumbnail = ({
  fileID,
  configs,
}: {
  fileID: string;
  configs?: AxiosRequestConfig;
}) => {
  return request<RegenerateThumbnailsResponse>({
    method: 'POST',
    url: `/v1/files/${fileID}/thumbnail`,
    ...configs,
  });
};

export default {
  getProjectFiles,
  getFile,
  deleteFile,
  regenerateThumbnails,
  regenerateThumbnail,
};
