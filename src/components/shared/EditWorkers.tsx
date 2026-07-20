import { css } from '@emotion/core';
import { FC, useState } from 'react';
import { Icon } from '@/components';
import style from '@/style';
import { clickEffect } from '@/utils/style';
import { ProjectWorkers, PROJECT_WORKER_ROLES } from '@/apis/project';
import { parseProjectWorkerInput } from './projectWorkers';

interface EditWorkersProps {
  workers: ProjectWorkers;
  onSave: (workers: ProjectWorkers) => Promise<void>;
  onCancel: () => void;
}

export const EditWorkers: FC<EditWorkersProps> = ({
  workers,
  onSave,
  onCancel,
}) => {
  const roles = PROJECT_WORKER_ROLES;

  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    roles.forEach((role) => {
      initial[role.key] = workers?.[role.key]?.join(',') || '';
    });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (role: string, value: string) => {
    setInputs((prev) => ({ ...prev, [role]: value }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const newWorkers: ProjectWorkers = {};
      roles.forEach((role) => {
        const members = parseProjectWorkerInput(inputs[role.key]);
        if (members.length > 0) {
          newWorkers[role.key] = members;
        }
      });
      await onSave(newWorkers);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px;
        min-width: 280px;
        max-width: 400px;
        .EditWorkers__Row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .EditWorkers__Label {
          width: 40px;
          flex: none;
          font-size: 14px;
          color: ${style.textColorLight};
          white-space: nowrap;
        }
        .EditWorkers__Input {
          flex: 1;
          min-width: 0;
          padding: 6px 10px;
          border: 1px solid ${style.borderColorLight};
          border-radius: ${style.borderRadiusBase};
          font-size: 14px;
          outline: none;
          &:focus {
            border-color: ${style.primaryColor};
          }
        }
        .EditWorkers__Buttons {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 10px;
          flex-wrap: wrap;
        }
        .EditWorkers__Button {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: ${style.borderRadiusBase};
          font-size: 13px;
          cursor: pointer;
          ${clickEffect()};
          white-space: nowrap;
        }
        .EditWorkers__Button--save {
          background: ${style.primaryColor};
          color: white;
          opacity: ${isSaving ? 0.5 : 1};
          cursor: ${isSaving ? 'not-allowed' : 'pointer'};
        }
        .EditWorkers__Button--cancel {
          background: ${style.backgroundColorLight};
          color: ${style.textColorSecondary};
        }
      `}
    >
      {roles.map((role) => (
        <div key={role.key} className="EditWorkers__Row">
          <span className="EditWorkers__Label">{role.label}:</span>
          <input
            type="text"
            className="EditWorkers__Input"
            value={inputs[role.key]}
            onChange={(e) => handleInputChange(role.key, e.target.value)}
            placeholder="用逗号分隔人员"
          />
        </div>
      ))}
      <div className="EditWorkers__Buttons">
        <span
          className="EditWorkers__Button EditWorkers__Button--cancel"
          onClick={onCancel}
        >
          <Icon icon="times" />
          取消
        </span>
        <span
          className="EditWorkers__Button EditWorkers__Button--save"
          onClick={handleSave}
        >
          <Icon icon="check" />
          确认
        </span>
      </div>
    </div>
  );
};
