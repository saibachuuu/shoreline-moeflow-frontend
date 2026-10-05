import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Spin,
  Switch,
} from 'antd';
import { useIntl } from 'react-intl';
import { toLowerCamelCase } from '@/utils';
import { FormItem } from '@/components/shared-form/FormItem';
import { getSettings, saveSettings, PartnerSearchSettings } from './api';
const TextArea = Input.TextArea;
type Values = Omit<PartnerSearchSettings, 'partnerSearchTeamIds'> & {
  partnerSearchTeamIds: string;
};
export function Settings() {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<Values>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const apply = useCallback(
    (raw: PartnerSearchSettings) => {
      const data = toLowerCamelCase(raw) as PartnerSearchSettings;
      form.setFieldsValue({
        ...data,
        partnerSearchTeamIds: (data.partnerSearchTeamIds ?? []).join('\n'),
      });
    },
    [form],
  );
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    getSettings()
      .then((result) => {
        if (active) apply(result.data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apply, reload]);
  const submit = (values: Values) => {
    setSaving(true);
    saveSettings({
      ...values,
      partnerSearchTeamIds: Array.from(
        new Set(
          values.partnerSearchTeamIds
            .split('\n')
            .map((id) => id.trim())
            .filter(Boolean),
        ),
      ),
    })
      .then((result) => {
        apply(result.data);
        message.success(formatMessage({ id: 'site.setting.editSuccess' }));
      })
      .catch((failure) => {
        const invalid = failure.data?.message?.partnerSearchTeamIds;
        if (Array.isArray(invalid)) {
          failure.data.message.partnerSearchTeamIds = [
            formatMessage(
              { id: 'site.setting.autoJoinTeamIDsError' },
              { line: invalid.map((index: number) => index + 1).join(', ') },
            ),
          ];
        }
        failure.default?.(form);
      })
      .finally(() => setSaving(false));
  };
  return (
    <section style={{ marginTop: 32 }}>
      <h3>{formatMessage({ id: 'partnerSearch.settingsTitle' })}</h3>
      {loading ? (
        <Spin />
      ) : error ? (
        <Alert
          type="error"
          message={formatMessage({ id: 'adminSite.loadFailed' })}
          action={
            <Button onClick={() => setReload((value) => value + 1)}>
              {formatMessage({ id: 'adminSite.retry' })}
            </Button>
          }
        />
      ) : (
        <Form form={form} onFinish={submit} autoComplete="off">
          <FormItem
            label={formatMessage({ id: 'site.setting.partnerSearchEnabled' })}
            name="partnerSearchEnabled"
            valuePropName="checked"
          >
            <Switch />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.partnerSearchTeamIDs' })}
            name="partnerSearchTeamIds"
            tooltip={formatMessage({
              id: 'site.setting.partnerSearchTeamIDsTip',
            })}
          >
            <TextArea rows={6} />
          </FormItem>
          <FormItem
            label={formatMessage({
              id: 'site.setting.partnerSearchRateLimitSeconds',
            })}
            name="partnerSearchRateLimitSeconds"
            tooltip={formatMessage({
              id: 'site.setting.partnerSearchRateLimitSecondsTip',
            })}
          >
            <InputNumber min={0} style={{ width: 200 }} />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.partnerSearchMaxLimit' })}
            name="partnerSearchMaxLimit"
            tooltip={formatMessage({
              id: 'site.setting.partnerSearchMaxLimitTip',
            })}
          >
            <InputNumber min={1} style={{ width: 200 }} />
          </FormItem>
          <Button type="primary" htmlType="submit" loading={saving}>
            {formatMessage({ id: 'form.submit' })}
          </Button>
        </Form>
      )}
    </section>
  );
}
