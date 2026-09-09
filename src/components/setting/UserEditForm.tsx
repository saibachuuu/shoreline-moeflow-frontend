import { css } from '@emotion/core';
import { Button, Form as AntdForm, Input, Tag, Tooltip, message } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
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
  const [defaultDisplayName, setDefaultDisplayName] = useState<string>(
    user.defaultDisplayName || '',
  );
  const [aliasInput, setAliasInput] = useState('');

  const addAlias = () => {
    const value = aliasInput.trim();
    if (value && !aliases.includes(value)) setAliases([...aliases, value]);
    setAliasInput('');
  };

  const removeAlias = (aliasToRemove: string) => {
    setAliases(aliases.filter((item) => item !== aliasToRemove));
    if (defaultDisplayName === aliasToRemove) {
      setDefaultDisplayName('');
    }
  };

  const togglePreferredAlias = (alias: string) => {
    if (defaultDisplayName === alias) {
      setDefaultDisplayName('');
    } else {
      setDefaultDisplayName(alias);
    }
  };

  const handleFinish = (values: any) => {
    setSubmitting(true);
    api.user
      .editUser({ data: { ...values, aliases, defaultDisplayName } })
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
        .UserEditForm__Hint {
          margin: 6px 0 4px 0;
          font-size: 12px;
          color: var(--text-color-secondary, rgba(0, 0, 0, 0.45));
          user-select: none;
        }
        .UserEditForm__Tag--candidate {
          transition: all 0.2s;
          user-select: none;
        }
        .UserEditForm__Tag--candidate:hover {
          opacity: 0.85;
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
              <Tooltip
                title={
                  !defaultDisplayName
                    ? formatMessage({ id: 'userEdit.defaultUsername' })
                    : formatMessage({ id: 'userEdit.cancelPreferredTooltip' })
                }
              >
                <Tag
                  color={!defaultDisplayName ? 'gold' : undefined}
                  className="UserEditForm__Tag--candidate"
                  onClick={() => setDefaultDisplayName('')}
                  style={{ cursor: 'pointer' }}
                >
                  {!defaultDisplayName ? (
                    <StarFilled style={{ marginRight: 4 }} />
                  ) : (
                    <StarOutlined style={{ marginRight: 4, opacity: 0.5 }} />
                  )}
                  {user.name} ({formatMessage({ id: 'userEdit.defaultUsername' })})
                </Tag>
              </Tooltip>
              {aliases.map((alias) => {
                const isPreferred = defaultDisplayName === alias;
                return (
                  <Tooltip
                    key={alias}
                    title={
                      isPreferred
                        ? formatMessage({ id: 'userEdit.cancelPreferredTooltip' })
                        : formatMessage({ id: 'userEdit.setAsPreferredTooltip' })
                    }
                  >
                    <Tag
                      color={isPreferred ? 'gold' : undefined}
                      closable
                      className="UserEditForm__Tag--candidate"
                      style={{ cursor: 'pointer' }}
                      onClick={() => togglePreferredAlias(alias)}
                      onClose={(e) => {
                        e.stopPropagation();
                        removeAlias(alias);
                      }}
                    >
                      {isPreferred ? (
                        <StarFilled style={{ marginRight: 4 }} />
                      ) : (
                        <StarOutlined style={{ marginRight: 4, opacity: 0.5 }} />
                      )}
                      {alias}
                      {isPreferred && (
                        <span style={{ marginLeft: 4, fontWeight: 500 }}>
                          ({formatMessage({ id: 'userEdit.preferred' })})
                        </span>
                      )}
                    </Tag>
                  </Tooltip>
                );
              })}
            </div>
            <div className="UserEditForm__Hint">
              {formatMessage({ id: 'userEdit.preferredDisplayNameHint' })}
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
