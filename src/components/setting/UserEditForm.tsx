import { css } from '@emotion/core';
import { Button, Form as AntdForm, Input, Tag, message } from 'antd';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { Form, FormItem } from '..';
import { api } from '@/apis';
import { FC } from '@/interfaces';
import { AppState } from '@/store';
import { setUserInfo } from '@/store/user/slice';
import { toLowerCamelCase } from '@/utils';
import { USER_NAME_REGEX } from '@/utils/regex';
import style from '@/style';

/** 修改项目表单的属性接口 */
interface UserEditFormProps {
  className?: string;
}
/**
 * 修改项目表单
 * 从 redux 的 currentProject 中读取值，使用前必须先
 * dispatch(setCurrentProject({ id }));
 */
export const UserEditForm: FC<UserEditFormProps> = ({ className }) => {
  const { formatMessage } = useIntl(); // i18n
  const [form] = AntdForm.useForm();
  const dispatch = useDispatch();
  const [submitting, setSubmitting] = useState(false);
  const user = useSelector((state: AppState) => state.user);
  const [aliases, setAliases] = useState<string[]>(user.aliases || []);
  const [aliasInput, setAliasInput] = useState('');

  const addAlias = () => {
    const value = aliasInput.trim();
    if (value && !aliases.includes(value)) setAliases([...aliases, value]);
    setAliasInput('');
  };

  const handleFinish = (values: any) => {
    setSubmitting(true);
    api.user
      .editUser({ data: { ...values, aliases } })
      .then((data) => {
        // 修改成功
        dispatch(setUserInfo(toLowerCamelCase(data.data.user)));
        // 弹出提示
        message.success(data.data.message);
      })
      .catch((error) => {
        error.default(form);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div
      className={className}
      css={css`
        width: 100%;
        .ant-form-item:last-child {
          margin-bottom: 0;
        }
        .UserEditForm__AliasField {
          width: 100%;
          box-sizing: border-box;
          padding: 4px 11px;
          border: 1px solid ${style.borderColorBase};
          border-radius: ${style.borderRadiusBase};
          background: ${style.backgroundColorLight};
          transition: all 0.2s;
        }
        .UserEditForm__AliasField:focus-within {
          border-color: ${style.primaryColor};
          box-shadow: 0 0 0 2px ${style.primaryColor}20;
        }
        .UserEditForm__Aliases {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
        }
        .UserEditForm__AliasInput.ant-input {
          display: block;
          width: 100%;
          min-height: 48px;
          padding: 4px 0;
          resize: vertical;
        }
      `}
    >
      <Form
        form={form}
        onFinish={handleFinish}
        requiredMark={false}
        initialValues={{ ...user, locale: user.locale.id }}
      >
        <FormItem
          name="name"
          label={formatMessage({ id: 'user.name' })}
          rules={[
            { required: true },
            {
              pattern: USER_NAME_REGEX,
              message: formatMessage({ id: 'auth.userNameFormatTip' }),
            },
            { min: 2 },
            { max: 18 },
          ]}
        >
          <Input />
        </FormItem>
        <FormItem label={formatMessage({ id: 'userEdit.siteAlias' })}>
          <div className="UserEditForm__AliasField">
            <div className="UserEditForm__Aliases">
              {aliases.map((alias) => (
                <Tag
                  closable
                  key={alias}
                  onClose={() => setAliases(aliases.filter((item) => item !== alias))}
                >
                  {alias}
                </Tag>
              ))}
            </div>
            <Input.TextArea
              bordered={false}
              autoSize={{ minRows: 2, maxRows: 4 }}
              className="UserEditForm__AliasInput"
              value={aliasInput}
              onChange={(event) => setAliasInput(event.target.value)}
              onPressEnter={(event) => {
                event.preventDefault();
                addAlias();
              }}
              placeholder={formatMessage({ id: 'userEdit.enterToAdd' })}
            />
          </div>
        </FormItem>
        <FormItem
          name="signature"
          label={formatMessage({ id: 'user.signature' })}
          rules={[{ min: 0 }, { max: 140 }]}
        >
          <Input.TextArea />
        </FormItem>
        <FormItem name="locale" style={{ display: 'none' }}>
          <Input />
        </FormItem>
        <FormItem>
          <Button type="primary" block htmlType="submit" loading={submitting}>
            {formatMessage({ id: 'site.save' })}
          </Button>
        </FormItem>
      </Form>
    </div>
  );
};
