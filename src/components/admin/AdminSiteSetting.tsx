import { css } from '@emotion/core';
import { Alert, Button, Form as AntdForm, Input, message, Spin, Switch } from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import classNames from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { api } from '@/apis';
import { APISiteSetting } from '@/apis/siteSetting';
import { FC } from '@/interfaces';
import { toLowerCamelCase } from '@/utils';
import { Form } from '@/components/shared-form/Form';
import { FormItem } from '@/components/shared-form/FormItem';
import { setCustomSiteTitle } from '@/store/site/slice';

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

  interface APISiteSettingFormData
    extends Omit<APISiteSetting, 'whitelistEmails' | 'autoJoinTeamIds'> {
    whitelistEmails: string;
    autoJoinTeamIds: string;
  }

  const formDataFromAPI = (
    data: APISiteSetting,
  ): APISiteSettingFormData => {
    // 后端 auto_join_team_ids 经 toLowerCamelCase 的 _id 特例转成
    // autoJoinTeamIds（小写 d），与表单字段名保持一致。
    return {
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
            '加载失败',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [form]);

  useEffect(() => {
    loadSiteSetting();
  }, [loadSiteSetting, reloadToken]);

  const handleFinish = (values: APISiteSettingFormData) => {
    api.siteSetting
      .editSiteSetting({
        data: {
          ...values,
          whitelistEmails: textareaToArray(values.whitelistEmails),
          autoJoinTeamIds: textareaToArray(values.autoJoinTeamIds),
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
              站点设置加载失败，若持续出现请检查登录状态（重新登录）后重试。
              <Button
                size="small"
                style={{ marginLeft: 12 }}
                loading={loading}
                onClick={() => {
                  setReloadToken((value) => value + 1);
                }}
              >
                重试
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
          label={formatMessage({ id: 'site.setting.onlyAllowAdminCreateTeam' })}
          name="onlyAllowAdminCreateTeam"
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
    </div>
  );
};
