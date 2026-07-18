// 文件类型
export const FILE_TYPE = {
  UNKNOWN: 0 as 0, // 未知
  FOLDER: 1 as 1, // 文件夹
  IMAGE: 2 as 2, // 图片
  TEXT: 3 as 3, // 纯文本
};
export type FileTypes = (typeof PARSE_STATUS)[keyof typeof PARSE_STATUS];

export const PARSE_STATUS = {
  NOT_START: 0 as 0, // 未开始
  QUEUING: 1 as 1, // 排队中
  PARSING: 2 as 2, // 解析中
  PARSE_FAILED: 3 as 3, // 解析失败
  PARSE_SUCCEEDED: 4 as 4, // 解析成功
};
export type ParseStatuses = (typeof PARSE_STATUS)[keyof typeof PARSE_STATUS];

// 文件不存在的原因
export const FILE_NOT_EXIST_REASON = {
  UNKNOWN: 0 as 0, // 未知
  NOT_UPLOAD: 1 as 1, // 还没有上传
  FINISH: 2 as 2, // 因为完结被删除
  BLOCK: 4 as 4, // 因为屏蔽被删除
};
export type FileNotExistReasons =
  (typeof FILE_NOT_EXIST_REASON)[keyof typeof FILE_NOT_EXIST_REASON];

// 图片封面大小
export const IMAGE_COVER = {
  WIDTH: 180 as 180,
  HEIGHT: 140 as 140,
};
