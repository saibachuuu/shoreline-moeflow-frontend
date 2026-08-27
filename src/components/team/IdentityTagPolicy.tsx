import { css } from '@emotion/core';
import { Button, Input, Modal, Select, Spin, Switch, Tag, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { api } from '@/apis';
import { FC, UserTeam } from '@/interfaces';
import style from '@/style';
import { toLowerCamelCase } from '@/utils';
import { filterIdentityTagPermissions } from '@/utils/identityTags';
import {
  IDENTITY_TAG_MESSAGE_IDS,
  formatIdentityTagLabel,
  formatPermissionLabel,
} from '@/utils/identityLabels';

interface Props {
  team: UserTeam;
  className?: string;
}

const PROJECT_PERMISSION_CODES = [
  'project:ACCESS',
  'project:CHANGE',
  'project:COMPLETE_PROJECT',
  'project:ADD_FILE',
  'project:MOVE_FILE',
  'project:RENAME_FILE',
  'project:DELETE_FILE',
  'project:OUTPUT_TRA',
  'project:ADD_LABEL',
  'project:MOVE_LABEL',
  'project:DELETE_LABEL',
  'project:ADD_TRA',
  'project:DELETE_TRA',
  'project:PROOFREAD_TRA',
  'project:CHECK_TRA',
  'project:ADD_TARGET',
  'project:CHANGE_TARGET',
  'project:DELETE_TARGET',
  'project:CHECK_USER',
  'project:INVITE_USER',
  'project:CHANGE_USER_REMARK',
  'project:CHANGE_USER_ROLE',
  'project:DELETE_USER',
  'project:MANAGE_MEMBERS',
];

const TEAM_PERMISSION_CODES = [
  'team:ACCESS',
  'team:DELETE',
  'team:CHANGE',
  'team:CREATE_ROLE',
  'team:DELETE_ROLE',
  'team:CHECK_USER',
  'team:INVITE_USER',
  'team:DELETE_USER',
  'team:CHANGE_USER_ROLE',
  'team:CHANGE_USER_REMARK',
  'team:CREATE_TERM_BANK',
  'team:ACCESS_TERM_BANK',
  'team:CHANGE_TERM_BANK',
  'team:DELETE_TERM_BANK',
  'team:CREATE_TERM',
  'team:CHANGE_TERM',
  'team:DELETE_TERM',
  'team:CREATE_PROJECT',
  'team:CREATE_PROJECT_SET',
  'team:CHANGE_PROJECT_SET',
  'team:DELETE_PROJECT_SET',
  'team:USE_OCR_QUOTA',
  'team:USE_MT_QUOTA',
  'team:INSIGHT',
];

export const IdentityTagPolicy: FC<Props> = ({ team, className }) => {
  const { formatMessage } = useIntl();
  const [policy, setPolicy] = useState<any>();
  const [scope, setScope] = useState<'team' | 'project'>('project');
  const [selected, setSelected] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [assignable, setAssignable] = useState(true);
  const load = () =>
    api.member
      .getIdentityTagPolicy({ teamID: team.id })
      .then((result) => {
        const data = toLowerCamelCase(result.data) as any;
        setPolicy(data);
        setCreating(false);
        setSelected(
          (current) => current || Object.keys(data.projectTags || {})[0],
        );
      })
      .catch((error) => error.default());
  useEffect(() => {
    load();
  }, [team.id]);
  const tags = useMemo(
    () =>
      policy ? policy[scope === 'team' ? 'teamTags' : 'projectTags'] || {} : {},
    [policy, scope],
  );
  useEffect(() => {
    if (creating) return;
    setSelected((current) =>
      current && tags[current] ? current : Object.keys(tags)[0],
    );
  }, [creating, scope, tags]);
  useEffect(() => {
    const item = selected ? tags[selected] : undefined;
    setName(
      item
        ? formatIdentityTagLabel(
            formatMessage,
            selected!,
            item.name || selected,
          )
        : '',
    );
    setCode(selected || '');
    setPermissions(item?.permissions || []);
    setAssignable(item?.assignable ?? true);
  }, [formatMessage, selected, tags]);
  if (!policy) return <Spin />;
  const current = selected ? tags[selected] : undefined;
  const permissionCodes =
    scope === 'team' ? TEAM_PERMISSION_CODES : PROJECT_PERMISSION_CODES;
  const permissionOptions = filterIdentityTagPermissions(
    permissionCodes,
    scope,
    current?.source,
  );
  const validCode = /^[a-z][a-z0-9_]{1,63}$/.test(code);
  const update = async (upserts: any[], removes: any[] = []) => {
    setSaving(true);
    try {
      const result = await api.member.updateIdentityTagPolicy({
        teamID: team.id,
        data: { expectedVersion: policy.version, upserts, removes },
      });
      setPolicy(toLowerCamelCase(result.data));
      message.success(formatMessage({ id: 'site.identityTagPolicy.updated' }));
      return true;
    } catch (error: any) {
      error.default();
      return false;
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    const storedName = IDENTITY_TAG_MESSAGE_IDS[code] ? code : name.trim();
    const saved = await update([
      {
        scope,
        code,
        name: storedName,
        permissions: filterIdentityTagPermissions(
          permissions,
          scope,
          current?.source,
        ),
        assignable,
      },
    ]);
    if (saved) {
      setCreating(false);
      setSelected(code);
    }
  };
  const restore = () =>
    current &&
    current.source === 'team_override' &&
    update([], [{ scope, code: selected! }]);
  const remove = () => {
    if (!selected || current?.source !== 'team') return;
    Modal.confirm({
      title: formatMessage({ id: 'site.identityTagPolicy.deleteCustomTag' }),
      content: formatMessage({
        id: 'site.identityTagPolicy.deleteCustomTagTip',
      }),
      okType: 'danger',
      okText: formatMessage({ id: 'site.delete' }),
      cancelText: formatMessage({ id: 'site.cancel' }),
      onOk: () => update([], [{ scope, code: selected }]),
    });
  };
  const isSystemTeamTag = scope === 'team' && current?.source === 'site';
  return (
    <div
      className={className}
      css={css`
        width: 100%;
        max-width: 960px;
        height: 100%;
        max-height: 100%;
        box-sizing: border-box;
        min-width: 0;
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr);
        overflow: hidden;
        border: 1px solid ${style.borderColorLight};
        .IdentityTagPolicy__Aside {
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          border-right: 1px solid ${style.borderColorLight};
        }
        .IdentityTagPolicy__Scope {
          flex: none;
          padding: 10px;
        }
        .IdentityTagPolicy__Items {
          flex: 1 1 auto;
          min-height: 0;
          overflow: auto;
        }
        .IdentityTagPolicy__Item {
          padding: 9px 12px;
          cursor: pointer;
          border-bottom: 1px solid ${style.borderColorLighter};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .IdentityTagPolicy__Item--selected {
          border-left: 3px solid ${style.primaryColor};
          padding-left: 9px;
          background: ${style.backgroundColorLight};
        }
        .IdentityTagPolicy__Add {
          flex: none;
          align-self: flex-start;
          margin: 6px 0 8px 8px;
        }
        .IdentityTagPolicy__Detail {
          min-width: 0;
          min-height: 0;
          padding: 18px;
          overflow: auto;
          overflow-wrap: anywhere;
        }
        .IdentityTagPolicy__FieldLabel {
          display: block;
          margin-bottom: 6px;
          color: ${style.textColorSecondary};
          font-size: 12px;
        }
        .IdentityTagPolicy__Actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
        }
        @media (max-width: 600px) {
          height: auto;
          max-height: none;
          grid-template-columns: 1fr;
          grid-template-rows: auto auto;
          overflow: visible;
          .IdentityTagPolicy__Aside {
            border-right: 0;
            border-bottom: 1px solid ${style.borderColorLight};
          }
          .IdentityTagPolicy__Items {
            flex: none;
            max-height: 220px;
          }
          .IdentityTagPolicy__Detail {
            overflow: visible;
          }
        }
      `}
    >
      <aside className="IdentityTagPolicy__Aside">
        <div className="IdentityTagPolicy__Scope">
          <Select
            value={scope}
            onChange={(value) => {
              setCreating(false);
              setScope(value);
            }}
            style={{ width: '100%' }}
          >
            <Select.Option value="project">
              {formatMessage({ id: 'site.identityTagPolicy.projectTags' })}
            </Select.Option>
            <Select.Option value="team">
              {formatMessage({ id: 'site.identityTagPolicy.teamTags' })}
            </Select.Option>
          </Select>
        </div>
        <div className="IdentityTagPolicy__Items">
          {Object.entries(tags).map(([tagCode, item]: [string, any]) => (
            <div
              key={tagCode}
              className={`IdentityTagPolicy__Item ${selected === tagCode ? 'IdentityTagPolicy__Item--selected' : ''}`}
              onClick={() => {
                setCreating(false);
                setSelected(tagCode);
              }}
            >
              {formatIdentityTagLabel(
                formatMessage,
                tagCode,
                item.name || tagCode,
              )}
              {item.source === 'site' && (
                <Tag style={{ marginLeft: 5 }}>
                  {formatMessage({ id: 'site.identityTagPolicy.systemTag' })}
                </Tag>
              )}
              {item.source === 'team_override' && (
                <Tag color="blue" style={{ marginLeft: 5 }}>
                  {formatMessage({
                    id: 'site.identityTagPolicy.overriddenTag',
                  })}
                </Tag>
              )}
            </div>
          ))}
        </div>
        <Button
          className="IdentityTagPolicy__Add"
          type="link"
          onClick={() => {
            setCreating(true);
            setSelected(undefined);
            setName('');
            setCode('');
            setPermissions([]);
            setAssignable(true);
          }}
        >
          {formatMessage({ id: 'site.identityTagPolicy.addTag' })}
        </Button>
      </aside>
      <section className="IdentityTagPolicy__Detail">
        <div>
          <label className="IdentityTagPolicy__FieldLabel">
            {formatMessage({ id: 'site.identityTagPolicy.tagCode' })}
          </label>
          <Input
            value={code}
            onChange={(event) =>
              setCode(event.target.value.trim().toLowerCase())
            }
            disabled={!!current}
            placeholder={formatMessage({
              id: 'site.identityTagPolicy.codePlaceholder',
            })}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="IdentityTagPolicy__FieldLabel">
            {formatMessage({ id: 'site.identityTagPolicy.tagName' })}
          </label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!!current && current.source !== 'team'}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <label className="IdentityTagPolicy__FieldLabel">
            {formatMessage({ id: 'site.identityTagPolicy.permissions' })}
          </label>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            value={permissions}
            onChange={setPermissions}
          >
            {permissionOptions.map((permission) => (
              <Select.Option key={permission} value={permission}>
                {formatPermissionLabel(formatMessage, permission)}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
          }}
        >
          <Switch
            checked={assignable}
            disabled={isSystemTeamTag}
            onChange={setAssignable}
          />
          <span>
            {formatMessage({
              id: 'site.identityTagPolicy.assignableToMembers',
            })}
          </span>
        </div>
        <div className="IdentityTagPolicy__Actions">
          <Button
            type="primary"
            loading={saving}
            disabled={!name.trim() || !validCode}
            onClick={save}
          >
            {formatMessage({ id: 'site.save' })}
          </Button>
          {current?.source === 'team_override' && (
            <Button onClick={restore}>
              {formatMessage({
                id: 'site.identityTagPolicy.restoreInitialPermissions',
              })}
            </Button>
          )}
          {current?.source === 'team' && (
            <Button danger onClick={remove}>
              {formatMessage({ id: 'site.identityTagPolicy.deleteCustomTag' })}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};
