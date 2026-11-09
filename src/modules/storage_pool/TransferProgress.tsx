import { Progress } from 'antd';
import { useIntl } from 'react-intl';
import { TransferRecord } from './api';
import { formatBytes } from '@/utils/size';

export const TransferProgress = ({ record }: { record: TransferRecord }) => {
  const { formatMessage: fm } = useIntl();
  const warning = !!record.lastError && record.status === 4;
  return (
    <div>
      <Progress
        size="small"
        percent={record.progressPercent}
        status={
          record.status === 5
            ? 'exception'
            : record.status === 4 && !warning
              ? 'success'
              : record.status === 7 || warning
                ? 'normal'
                : 'active'
        }
        strokeColor={warning ? '#faad14' : undefined}
        format={() =>
          `${record.processedObjects ?? record.copiedObjects}/${record.totalObjects}`
        }
      />
      <div style={{ fontSize: 12, color: '#8c8c8c', lineHeight: '18px' }}>
        {formatBytes(record.copiedBytes) || '0 B'} /{' '}
        {formatBytes(record.totalBytes) || '0 B'}
        {!!record.skippedObjects && (
          <>
            {' '}
            · {fm({ id: 'storagePool.skipped', defaultMessage: '已跳过' })}{' '}
            {record.skippedObjects}
          </>
        )}
        {!!record.breakdown?.objectCount && (
          <div>
            {fm({ id: 'storagePool.breakdownOrigin' })}{' '}
            {formatBytes(record.breakdown.originBytes) || '0 B'} ·{' '}
            {fm({ id: 'storagePool.breakdownOutput' })}{' '}
            {formatBytes(record.breakdown.outputBytes) || '0 B'}
          </div>
        )}
      </div>
    </div>
  );
};
