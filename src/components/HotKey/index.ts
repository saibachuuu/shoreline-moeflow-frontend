import Bowser from 'bowser';
import { OSName } from '../../interfaces';

const userAgent =
  typeof window !== 'undefined' && window.navigator?.userAgent
    ? window.navigator.userAgent
    : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
const browser = Bowser.getParser(userAgent);
export const osName = (browser.getOSName(true) || 'windows') as OSName;

export { HotKeyRecorder } from './components/HotKeyRecorder';
export { useHotKey } from './hooks/useHotKey';
