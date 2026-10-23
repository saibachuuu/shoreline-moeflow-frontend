import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '@/store';
import { MODIFIER_KEY_EVENT_KEYS } from '@/components/HotKey/constants';
import { getHotKeyEvent, isKeyboardElement } from '@/components/HotKey/utils';

/**
 * 监听符号快捷键，命中后把对应符号插入当前输入框。
 *
 * 与符号按钮是否展开无关：面板收起时快捷键依然生效。
 * 返回符号列表，供调用方渲染按钮。
 */
export const useQuickCharacterHotKey = (
  disabled: boolean,
  onInsert: (character: string) => void,
) => {
  const quickCharacters = useSelector(
    (state: AppState) => state.imageTranslator.quickCharacters,
  );

  useEffect(() => {
    if (disabled) return undefined;

    const handleKeyDown = (nativeEvent: KeyboardEvent) => {
      if (MODIFIER_KEY_EVENT_KEYS.includes(nativeEvent.key)) return;

      const target = nativeEvent.target as HTMLElement | null;
      if (!target) return;

      // 弹窗内的按键不触发符号插入
      if (target.closest?.('.ant-modal, .ant-modal-mask')) return;

      // 输入框（input）内不触发
      if (target.tagName === 'INPUT') return;

      // 其他快捷键元素但不是多行文本框时也不触发
      if (isKeyboardElement(target) && target.tagName !== 'TEXTAREA') return;

      const event = getHotKeyEvent(nativeEvent);

      const matchedItem = quickCharacters.find((item) => {
        const hotKey = item.hotKey;
        if (!hotKey || !hotKey.key) return false;
        if (event.key !== hotKey.key) return false;
        if (Boolean(event.ctrl) !== Boolean(hotKey.ctrl)) return false;
        if (Boolean(event.alt) !== Boolean(hotKey.alt)) return false;
        if (Boolean(event.shift) !== Boolean(hotKey.shift)) return false;
        if (Boolean(event.meta) !== Boolean(hotKey.meta)) return false;
        return true;
      });

      if (matchedItem && matchedItem.character) {
        nativeEvent.preventDefault();
        nativeEvent.stopPropagation();
        onInsert(matchedItem.character);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled, quickCharacters, onInsert]);

  return quickCharacters;
};
