/**
 * Small helpers for the Structured Plain Text artifact. They never rewrite
 * question content: counting and file actions only.
 */

const QUESTION_FIELD = /^Q(?:_BN|_EN)?\s*:/m;

/** Number of `---` separated blocks that contain a question field. */
export const countQuestionBlocks = (text: string): number =>
  text
    .split(/^\s*-{3,}\s*$/m)
    .filter((block) => QUESTION_FIELD.test(block)).length;

/** True when the text has at least one complete question field and separator. */
export const looksLikePlainText = (text: string): boolean =>
  countQuestionBlocks(text) > 0 && /^ANS\s*:/m.test(text);

export const downloadPlainText = (text: string, filename = 'porokh-questions.txt'): void => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const copyPlainText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
