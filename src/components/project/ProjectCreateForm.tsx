import { css } from '@emotion/core';
import { Button, Form as AntdForm, Input, message, Modal, Upload } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Form, FormItem, RoleRadioGroup, TypeRadioGroup } from '@/components';
import { LanguageSelect } from './LanguageSelect';
import { api } from '@/apis';
import { FC, UserProjectSet, UserTeam } from '@/interfaces';
import { useDispatch, useSelector } from 'react-redux';
import { createProject, resetProjectsState } from '@/store/project/slice';
import { useHistory } from 'react-router-dom';
import { AppState } from '@/store';
import { toLowerCamelCase } from '@/utils';
import { GROUP_ALLOW_APPLY_TYPE } from '@/constants';
import { configs } from '@/configs';
import style from '@/style';
import { resetFilesState } from '@/store/file/slice';

/** 创建项目表单的属性接口 */
interface ProjectCreateFormProps {
  teamID: string;
  projectSetID: string;
  className?: string;
}

/** 从画廊 URL 解析 gid/token（兼容 exhentai.org / e-hentai.org 及常见镜像域名）。 */
const parseGalleryUrl = (url: string) => {
  const match = url.match(/\/g\/(\d+)\/([A-Za-z0-9]+)/);
  return match ? { gid: match[1], token: match[2] } : null;
};
/**
 * 创建项目表单
 */
export const ProjectCreateForm: FC<ProjectCreateFormProps> = ({
  teamID,
  projectSetID,
  className,
}) => {
  const { formatMessage } = useIntl(); // i18n
  const [form] = AntdForm.useForm();
  const dispatch = useDispatch();
  const history = useHistory();
  const [isAllowApply, setIsAllowApply] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const currentTeam = useSelector(
    (state: AppState) => state.team.currentTeam,
  ) as UserTeam;
  const currentProjectSet = useSelector(
    (state: AppState) => state.projectSet.currentProjectSet,
  ) as UserProjectSet;
  const [disableSourceLanugageIDs, setDisableSourceLanugageIDs] = useState(
    configs.default.project.targetLanguageCodes,
  );
  const [disableTargetLanugageIDs, setDisableTargetLanugageIDs] = useState([
    configs.default.project.sourceLanugageCode,
  ]);
  const [supportLabelplusTXT, setSupportLabelplusTXT] = useState(true);
  const [labelplusTXT, setLabelplusTXT] = useState<string>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formFinishValues, setFormFinishValues] = useState<any>();

  const showFinishModal = (values: any) => {
    setFormFinishValues(values);
    setIsModalVisible(true);
  };

  const handleOk = () => {
    handleFinish(formFinishValues);
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleFinish = (values: any) => {
    setSubmitting(true);
    const parsed = values.galleryUrl
      ? parseGalleryUrl(values.galleryUrl)
      : null;
    api.project
      .createProject({
        teamID: currentTeam.id,
        data: { ...values, labelplusTXT },
      })
      .then((result) => {
        const projectID = result.data.project.id;
        // 填了画廊网址时，创建后触发归档导入（失败不阻断创建流程）
        const triggerArchive = parsed
          ? api.project
              .importFromArchive({
                projectID,
                gid: parsed.gid,
                token: parsed.token,
                galleryUrl: values.galleryUrl,
              })
              .catch((error) => {
                message.error(
                  formatMessage({ id: 'project.archiveImportTriggerFailed' }),
                );
              })
          : Promise.resolve();
        return triggerArchive.then(() => result);
      })
      .then((result) => {
        setSubmitting(false);
        // 创建成功
        dispatch(
          createProject({
            project: toLowerCamelCase(result.data.project),
            unshift: true,
          }),
        );
        dispatch(resetFilesState());
        dispatch(resetProjectsState());
        // 跳转到项目
        history.replace(
          `/dashboard/teams/${teamID}/project-sets/${projectSetID}/projects/${result.data.project.id}`,
        );
        // 弹出提示
        message.success(result.data.message);
      })
      .catch((error) => {
        error.default(form);
        setSubmitting(false);
      });
  };

  return (
    <div
      className={className}
      css={css`
        width: 100%;
        .ant-form-item:last-child {
          margin-bottom: 0;
        }
        .ProjectCreateForm__Label {
          margin-right: 8px;
          color: ${style.textColor};
        }
        .ProjectCreateForm__Tip {
          color: ${style.textColorSecondary};
        }
        .ProjectCreateForm__TXT {
          margin-bottom: 24px;
        }
        .ProjectCreateForm__TXTUpload {
          display: flex;
          align-items: center;
        }
        .ProjectCreateForm__TXTTextAres {
          width: 100%;
          margin-top: 10px;
          height: 80px;
          background-color: ${style.backgroundColorLight};
          color: ${style.textColor};
          border: 1px solid ${style.borderColorBase};
        }
      `}
    >
      <Form
        form={form}
        onFinish={handleFinish}
        initialValues={{
          intro: '',
          projectSet: currentProjectSet.id,
          sourceLanguage: configs.default.project.sourceLanugageCode,
          targetLanguages: configs.default.project.targetLanguageCodes,
        }}
        requiredMark={false}
        onValuesChange={(values) => {
          // 关闭加入时，隐藏加入选项
          if (values.allowApplyType) {
            setIsAllowApply(
              values.allowApplyType !== GROUP_ALLOW_APPLY_TYPE.NONE,
            );
          }
          // 禁用源语言中的目标语言
          if (values.sourceLanguage) {
            setDisableTargetLanugageIDs([values.sourceLanguage]);
          }
          // 禁用目标语言中的源语言
          if (values.targetLanguages) {
            setDisableSourceLanugageIDs(values.targetLanguages);
          }
          // 当目标语言大于 1 个的时候，不显示从“翻译数据.txt”导入
          if (values.targetLanguages && values.targetLanguages.length > 1) {
            setSupportLabelplusTXT(false);
            setLabelplusTXT(undefined);
          } else {
            setSupportLabelplusTXT(true);
          }
        }}
      >
        <FormItem
          name="name"
          label={formatMessage({ id: 'project.name' })}
          rules={[{ required: true }, { min: 1 }, { max: 40 }]}
        >
          <Input />
        </FormItem>
        <FormItem
          name="intro"
          label={formatMessage({ id: 'project.intro' })}
          rules={[{ min: 0 }, { max: 140 }]}
        >
          <Input.TextArea />
        </FormItem>
        <FormItem
          name="sourceLanguage"
          label={formatMessage({ id: 'site.sourceLanguage' })}
          rules={[
            {
              required: true,
              message: formatMessage({ id: 'form.selectRequired' }),
            },
          ]}
        >
          <LanguageSelect disabledLanguageIDs={disableSourceLanugageIDs} />
        </FormItem>
        <FormItem
          name="targetLanguages"
          label={formatMessage({ id: 'site.targetLanguage' })}
          rules={[
            {
              required: true,
              message: formatMessage({ id: 'form.selectRequired' }),
            },
          ]}
        >
          <LanguageSelect
            mode="multiple"
            disabledLanguageIDs={disableTargetLanugageIDs}
          />
        </FormItem>
        <FormItem
          name="allowApplyType"
          label={formatMessage({ id: 'site.allowApplyTypeLabel' })}
          rules={[
            {
              required: true,
              message: formatMessage({ id: 'form.selectRequired' }),
            },
          ]}
        >
          <TypeRadioGroup
            typeName="allowApplyType"
            groupType="project"
            useDefaultType={true}
          />
        </FormItem>
        <FormItem
          style={{
            display: isAllowApply ? 'flex' : 'none',
          }}
          name="applicationCheckType"
          label={formatMessage({ id: 'site.applicationCheckTypeLabel' })}
          rules={[
            {
              required: true,
              message: formatMessage({ id: 'form.selectRequired' }),
            },
          ]}
        >
          <TypeRadioGroup
            typeName="applicationCheckType"
            groupType="project"
            useDefaultType={true}
          />
        </FormItem>
        <FormItem
          name="galleryUrl"
          label={formatMessage({ id: 'project.archiveUrl' })}
          rules={[
            {
              validator: (_, value) => {
                if (!value || parseGalleryUrl(value)) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(
                    formatMessage({ id: 'project.archiveUrlInvalid' }),
                  ),
                );
              },
            },
          ]}
        >
          <Input
            placeholder={formatMessage({ id: 'project.archiveUrlPlaceholder' })}
            allowClear
          />
        </FormItem>
        {/* The current backend still requires this legacy field for the
            invitation adapter. It is not an identity configuration control. */}
        <FormItem name="defaultRole" style={{ display: 'none' }} rules={[{ required: true }]}>
          <RoleRadioGroup groupType="project" useDefaultType={true} />
        </FormItem>
        <FormItem name="projectSet" style={{ display: 'none' }}>
          {/* 用于提交 project set id */}
          <Input />
        </FormItem>
        <div className="ProjectCreateForm__TXT">
          <div className="ProjectCreateForm__TXTUpload">
            <div className="ProjectCreateForm__Label">
              {formatMessage({ id: 'project.createViaLabelplus' })}
            </div>
            {!supportLabelplusTXT ? (
              <div className="ProjectCreateForm__Tip">
                {formatMessage({ id: 'project.createViaLabelplusNotSupport' })}
              </div>
            ) : labelplusTXT === undefined ? (
              <Upload
                accept=".txt"
                beforeUpload={(file) => {
                  return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function (event) {
                      if (event.target) {
                        const content = event.target.result;
                        if (typeof content === 'string') {
                          setLabelplusTXT(content);
                        }
                      }
                      reject();
                    };
                    reader.readAsText(file);
                  });
                }}
              >
                <Button>{formatMessage({ id: 'site.upload' })}</Button>
              </Upload>
            ) : (
              <Button
                onClick={() => {
                  setLabelplusTXT(undefined);
                }}
              >
                {formatMessage({ id: 'site.delete' })}
              </Button>
            )}
          </div>
          {labelplusTXT !== undefined && (
            <textarea
              className="ProjectCreateForm__TXTTextAres"
              disabled={true}
              value={labelplusTXT}
            />
          )}
        </div>
        <FormItem>
          <Button type="primary" block htmlType="submit" loading={submitting}>
            {formatMessage({ id: 'form.submit' })}
          </Button>
        </FormItem>
      </Form>
      <Modal
        title={formatMessage({ id: 'project.createNoticeTitle' })}
        open={isModalVisible}
        onOk={handleOk}
        okText={formatMessage({ id: 'project.createNoticeOk' })}
        onCancel={handleCancel}
        css={css`
          .ProjectCreateForm__ModalContent {
            p {
              margin-bottom: 8px;
            }
            ol {
              padding-left: 36px;
              margin-bottom: 0;
            }
            ul {
              padding-left: 18px;
            }
          }
        `}
      >
        <div className="ProjectCreateForm__ModalContent">
          <p>{formatMessage({ id: 'project.createNoticeIntro1' })}</p>
          <p>{formatMessage({ id: 'project.createNoticeIntro2' })}</p>
          <p>
            {formatMessage(
              { id: 'project.createNoticeIntro3' },
              { sitename: formatMessage({ id: 'site.name' }) },
            )}
          </p>
          <ol>
            <li>
              {formatMessage({ id: 'project.createNoticeItem1' })}
              <ul>
                <li>
                  {formatMessage(
                    { id: 'project.createNoticeItem1Sub' },
                    {
                      cov: (
                        <strong>
                          {formatMessage({ id: 'project.coveredUncovered' })}
                        </strong>
                      )
                    },
                  )}
                </li>
              </ul>
            </li>
            <li>{formatMessage({ id: 'project.createNoticeItem2' })}</li>
            <li>{formatMessage({ id: 'project.createNoticeItem3' })}</li>
            <li>{formatMessage({ id: 'project.createNoticeItem4' })}</li>
            <li>{formatMessage({ id: 'project.createNoticeItem5' })}</li>
          </ol>
        </div>
      </Modal>
    </div>
  );
};
