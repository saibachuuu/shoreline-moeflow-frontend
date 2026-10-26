import { AxiosRequestConfig } from 'axios';
import { request } from '.';
import { toLowerCamelCase } from '@/utils';

/** 默认存储的只读概览。后端不会下发任何凭据。 */
export interface APIStorageDefault {
  storageType: 'OSS' | 'LOCAL_STORAGE';
  /** 归一后的实现风格：S3 / ALI；本地存储为 null */
  bucketStyle: string | null;
  /** 环境变量里的原始写法，便于对照（如 R2、MINIO） */
  bucketStyleRaw: string;
  endpointHost: string;
  bucket: string;
  /** 对象 key 的总前缀，仅 S3 风格有值 */
  keyPrefix: string;
  viaCdn: boolean;
  cdnDomain: string;
  prefixes: {
    files: string;
    outputs: string;
    userAvatars: string;
    teamAvatars: string;
  };
  capabilities: {
    serverSideImageProcessing: boolean;
    cdnUrlAuth: boolean;
  };
  requiresLocalThumbnail: boolean;
  /** 配置有风险时后端给出的提示文案，正常为空 */
  warning: string;
}

/** 注意：这里没有用 `toUnderScoreCase` —— 查询接口没有请求体。 */
const getStorageDefault = async ({
  configs,
}: { configs?: AxiosRequestConfig } = {}) => {
  const result = await request<APIStorageDefault>({
    method: 'GET',
    url: `/v1/admin/storage/default`,
    ...configs,
  });
  // 与 siteSetting 一致：请求层不自动转命名风格，由调用方显式转换。
  return { ...result, data: toLowerCamelCase(result.data) as APIStorageDefault };
};

export default {
  getStorageDefault,
};
