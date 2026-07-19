export const QUICK_CHARACTERS = [
  '…',
  '～',
  '♡',
  '♥',
  '「',
  '」',
  '『',
  '』',
  '○',
  '●',
  '♪',
  '♩',
  '☆',
  '★',
  '■',
  '※',
  '·',
] as const;

export interface InsertCharacterResult {
  value: string;
  cursor: number;
}

export function insertCharacterAtSelection(
  value: string,
  selectionStart: number | null,
  selectionEnd: number | null,
  character: string,
): InsertCharacterResult {
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? start;

  return {
    value: value.slice(0, start) + character + value.slice(end),
    cursor: start + character.length,
  };
}
