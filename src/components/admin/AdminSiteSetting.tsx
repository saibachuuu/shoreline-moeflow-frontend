import { moduleAdminSettings } from '@/modules';
import { css } from '@emotion/core';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form as AntdForm,
  Input,
  message,
  Spin,
  Switch,
  Tag,
} from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import classNames from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { api } from '@/apis';
import { APISiteSetting } from '@/apis/siteSetting';
import { APIStorageDefault } from '@/apis/storage';
import { FC } from '@/interfaces';
import { toLowerCamelCase } from '@/utils';
import { Form } from '@/components/shared-form/Form';
import { FormItem } from '@/components/shared-form/FormItem';
import {
  setCustomSiteTitle,
  setShowBetaBadge,
  SHOW_BETA_BADGE_KEY,
  getInitialShowBetaBadge,
} from '@/store/site/slice';

function textareaToArray(textarea: string): string[] {
  return textarea.trim() === ''
    ? []
    : Array.from(
        new Set(
          textarea
            .split('\n')
            .map((item) => item.trim())
            .filter((item) => item !== ''),
        ),
      );
}

function arrayToTextarea(array: string[]): string {
  return array.join('\n');
}

/** 站点设置的属性接口 */
interface AdminSiteSettingProps {
  className?: string;
}
/**
 * 站点设置
 */
export const AdminSiteSetting: FC<AdminSiteSettingProps> = ({ className }) => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();

  const [form] = AntdForm.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [siteSetting, setSiteSetting] = useState<APISiteSetting | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // 存储概览是只读的旁路信息：加载失败不该影响上面的站点设置表单，
  // 所以它有自己的状态，不与 loadError 合并。
  const [storageOverview, setStorageOverview] =
    useState<APIStorageDefault | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  interface APISiteSettingFormData
    extends Omit<APISiteSetting, 'whitelistEmails' | 'autoJoinTeamIds'> {
    whitelistEmails: string;
    autoJoinTeamIds: string;
    showBetaBadge?: boolean;
  }

  const formDataFromAPI = (data: APISiteSetting): APISiteSettingFormData => {
    // 后端 auto_join_team_ids 经 toLowerCamelCase 的 _id 特例转成
    // autoJoinTeamIds（小写 d），与表单字段名保持一致。
    return {
      showBetaBadge: getInitialShowBetaBadge(),
      ...data,
      whitelistEmails: arrayToTextarea(data.whitelistEmails ?? []),
      autoJoinTeamIds: arrayToTextarea(data.autoJoinTeamIds ?? []),
    };
  };

  const loadSiteSetting = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    api.siteSetting
      .getSiteSetting({})
      .then((result) => {
        const data = toLowerCamelCase(result.data) as APISiteSetting;
        const formData = formDataFromAPI(data);
        setSiteSetting(data);
        form.setFieldsValue(formData);
      })
      .catch((error) => {
        console.error('[AdminSiteSetting] 加载站点设置失败', error);
        setLoadError(
          (error?.data?.message as string) ||
            (error?.message as string) ||
            formatMessage({ id: 'adminSite.loadFailed' }),
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [form]);

  useEffect(() => {
    loadSiteSetting();
  }, [loadSiteSetting, reloadToken]);

  const loadStorageOverview = useCallback(() => {
    setStorageError(null);
    api.storage
      .getStorageDefault()
      .then((result) => {
        setStorageOverview(result.data);
      })
      .catch((error) => {
        console.error('[AdminSiteSetting] 加载存储概览失败', error);
        setStorageError(
          (error?.data?.message as string) ||
            (error?.message as string) ||
            formatMessage({ id: 'adminSite.storageLoadFailed' }),
        );
      });
  }, []);

  useEffect(() => {
    loadStorageOverview();
  }, [loadStorageOverview, reloadToken]);

  const handleFinish = (values: APISiteSettingFormData) => {
    const { showBetaBadge, ...apiValues } = values;
    if (typeof showBetaBadge === 'boolean') {
      try {
        localStorage.setItem(SHOW_BETA_BADGE_KEY, String(showBetaBadge));
      } catch {}
      dispatch(setShowBetaBadge(showBetaBadge));
    }
    api.siteSetting
      .editSiteSetting({
        data: {
          ...apiValues,
          whitelistEmails: textareaToArray(apiValues.whitelistEmails),
          autoJoinTeamIds: textareaToArray(apiValues.autoJoinTeamIds),
        },
      })
      .then((result) => {
        const data = toLowerCamelCase(result.data) as APISiteSetting;
        const formData = formDataFromAPI(data);
        form.setFieldsValue(formData);
        dispatch(setCustomSiteTitle(data.customSiteTitle));
        // 弹出提示
        message.success(formatMessage({ id: 'site.setting.editSuccess' }));
      })
      .catch((error) => {
        console.log(error);
        if (error.data?.message?.whitelistEmails) {
          const line = error.data.message.whitelistEmails
            .map((line: number) => line + 1)
            .join(', ');
          error.data.message.whitelistEmails = [
            formatMessage(
              { id: 'site.setting.whitelistEmailsError' },
              { line },
            ),
          ];
        }
        if (error.data?.message?.autoJoinTeamIds) {
          const line = error.data.message.autoJoinTeamIds
            .map((line: number) => line + 1)
            .join(', ');
          error.data.message.autoJoinTeamIds = [
            formatMessage(
              { id: 'site.setting.autoJoinTeamIDsError' },
              { line },
            ),
          ];
        }

        error.default(form);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <div
      className={classNames('AdminSiteSetting', className)}
      css={css`
        padding: 24px;
      `}
    >
      {loadError && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
          message={loadError}
          description={
            <div>
              {formatMessage({ id: 'adminSite.loadFailedRetry' })}
              <Button
                size="small"
                style={{ marginLeft: 12 }}
                loading={loading}
                onClick={() => {
                  setReloadToken((value) => value + 1);
                }}
              >
                {formatMessage({ id: 'adminSite.retry' })}
              </Button>
            </div>
          }
        />
      )}
      {loading ? (
        <Spin />
      ) : (
        <Form form={form} onFinish={handleFinish} autoComplete="off">
          <FormItem
            label={formatMessage({ id: 'site.setting.showBetaBadge' })}
            name="showBetaBadge"
            valuePropName="checked"
            tooltip={formatMessage({ id: 'site.setting.showBetaBadgeTip' })}
          >
            <Switch
              onChange={(checked) => {
                try {
                  localStorage.setItem(SHOW_BETA_BADGE_KEY, String(checked));
                } catch {}
                dispatch(setShowBetaBadge(checked));
              }}
            />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.enableWhitelist' })}
            name="enableWhitelist"
          >
            <Switch defaultChecked={siteSetting?.enableWhitelist} />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.whitelistEmails' })}
            name="whitelistEmails"
            tooltip={formatMessage({ id: 'site.setting.whitelistEmailsTip' })}
          >
            <TextArea rows={10} />
          </FormItem>
          <FormItem
            label={formatMessage({
              id: 'site.setting.onlyAllowAdminCreateTeam',
            })}
            name="onlyAllowAdminCreateTeam"
            valuePropName="checked"
          >
            <Switch defaultChecked={siteSetting?.onlyAllowAdminCreateTeam} />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.autoJoinTeamIDs' })}
            name="autoJoinTeamIds"
            tooltip={formatMessage({ id: 'site.setting.autoJoinTeamIDsTip' })}
          >
            <TextArea rows={10} />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.customSiteTitle' })}
            name="customSiteTitle"
            tooltip={formatMessage({ id: 'site.setting.customSiteTitleTip' })}
          >
            <TextArea rows={2} />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.homepageImageUrl' })}
            name="homepageImageUrl"
            tooltip={formatMessage({ id: 'site.setting.homepageImageUrlTip' })}
          >
            <Input placeholder="https://example.com/homepage-image.png" />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.homepageWelcome' })}
            name="homepageWelcome"
            tooltip={formatMessage({ id: 'site.setting.homepageWelcomeTip' })}
          >
            <TextArea rows={7} />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.homepageHtml' })}
            name="homepageHtml"
            tooltip={formatMessage({ id: 'site.setting.homepageHtmlTip' })}
          >
            <TextArea rows={10} />
          </FormItem>
          <FormItem
            label={formatMessage({ id: 'site.setting.homepageCss' })}
            name="homepageCss"
          >
            <TextArea rows={10} />
          </FormItem>

          <FormItem
            css={css`
              text-align: right;
            `}
          >
            <Button type="primary" htmlType="submit" loading={submitting}>
              {formatMessage({ id: 'form.submit' })}
            </Button>
          </FormItem>
        </Form>
      )}
      {/* 存储概览：全部数据来自服务器环境变量，只读；后端不下发任何凭据。 */}
      <Card
        size="small"
        title={formatMessage({ id: 'adminSite.storageOverview' })}
        css={css`
          margin-top: 24px;
        `}
      >
        {storageError ? (
          <Alert
            type="warning"
            showIcon
            message={storageError}
            action={
              <Button
                size="small"
                onClick={() => setReloadToken((value) => value + 1)}
              >
                {formatMessage({ id: 'adminSite.retry' })}
              </Button>
            }
          />
        ) : !storageOverview ? (
          <Spin />
        ) : (
          <>
            {storageOverview.warning && (
              <Alert
                type="error"
                showIcon
                css={css`
                  margin-bottom: 16px;
                `}
                message={storageOverview.warning}
              />
            )}
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item
                label={formatMessage({ id: 'adminSite.storageType' })}
              >
                {storageOverview.storageType === 'OSS'
                  ? 'OSS'
                  : formatMessage({ id: 'adminSite.storageTypeLocal' })}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({ id: 'adminSite.storageStyle' })}
              >
                {storageOverview.bucketStyle ?? '—'}
                {storageOverview.bucketStyle &&
                  storageOverview.bucketStyleRaw &&
                  storageOverview.bucketStyleRaw.toUpperCase() !==
                    storageOverview.bucketStyle && (
                    <Tag
                      css={css`
                        margin-left: 8px;
                      `}
                    >
                      {formatMessage({ id: 'adminSite.storageStyleRaw' })}:{' '}
                      {storageOverview.bucketStyleRaw}
                    </Tag>
                  )}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({ id: 'adminSite.storageEndpoint' })}
              >
                {storageOverview.endpointHost || '—'}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({ id: 'adminSite.storageBucket' })}
              >
                {storageOverview.bucket || '—'}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({ id: 'adminSite.storageKeyPrefix' })}
              >
                <Tag color="blue">{storageOverview.keyPrefix || '(无)'}</Tag>
                <div
                  css={css`
                    color: #8c8c8c;
                    font-size: 12px;
                    margin-top: 4px;
                  `}
                >
                  {formatMessage({ id: 'adminSite.storageKeyPrefixTip' })}
                </div>
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({ id: 'adminSite.storageAccess' })}
              >
                {storageOverview.viaCdn
                  ? formatMessage(
                      { id: 'adminSite.storageAccessCdn' },
                      { domain: storageOverview.cdnDomain },
                    )
                  : formatMessage({ id: 'adminSite.storageAccessSigned' })}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({ id: 'adminSite.storagePrefixes' })}
              >
                {[
                  storageOverview.prefixes?.files,
                  storageOverview.prefixes?.outputs,
                  storageOverview.prefixes?.userAvatars,
                  storageOverview.prefixes?.teamAvatars,
                ]
                  .filter(Boolean)
                  .map((prefix) => (
                    <Tag key={prefix}>{prefix}</Tag>
                  ))}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage({ id: 'adminSite.storageThumbnail' })}
              >
                {storageOverview.requiresLocalThumbnail
                  ? formatMessage({ id: 'adminSite.storageThumbnailLocal' })
                  : formatMessage({ id: 'adminSite.storageThumbnailServer' })}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>
      {moduleAdminSettings.map((Setting, index) => (
        <Setting key={index} />
      ))}
    </div>
  );
};
