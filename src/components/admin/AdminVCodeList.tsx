import { css } from '@emotion/core';
import { Table, TablePaginationConfig } from 'antd';
import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import apis from '@/apis';
import { APIVCode } from '@/apis/user';
import { FC } from '@/interfaces';
import { toLowerCamelCase } from '@/utils';
import dayjs from 'dayjs';

/** 验证码列表的属性接口 */
interface AdminVCodeListProps {
  className?: string;
}
/**
 * 验证码列表
 */
export const AdminVCodeList: FC<AdminVCodeListProps> = ({ className }) => {
  const { formatMessage } = useIntl();
  const [data, setData] = useState<APIVCode[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await apis.adminGetVCodeList();
      const data = toLowerCamelCase(result.data);
      setData(data);
    } catch (error) {
      error.default();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    {
      title: formatMessage({ id: 'admin.vcodeType' }),
      dataIndex: 'intro',
      key: 'intro',
    },
    {
      title: formatMessage({ id: 'admin.vcode' }),
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: formatMessage({ id: 'admin.vcodeInfo' }),
      dataIndex: 'info',
      key: 'info',
    },
    {
      title: formatMessage({ id: 'admin.vcodeExpired' }),
      dataIndex: 'expires',
      key: 'expires',
      render: (_: any, record: APIVCode) =>
        (dayjs.utc().isAfter(dayjs.utc(record.expires))
          ? formatMessage({ id: 'admin.vcodeExpiredTag' })
          : '') +

        dayjs.utc(record.expires).local().format('lll'),
    },
    {
      title: formatMessage({ id: 'admin.vcodeGenerated' }),
      dataIndex: 'sendTime',
      key: 'sendTime',
    },
  ];

  return (
    <div className={classNames('AdminVCodeList', className)} css={css``}>
      <Table
        dataSource={data}
        rowKey={(record) => record.id}
        columns={columns}
        loading={loading}
      />
    </div>
  );
};
