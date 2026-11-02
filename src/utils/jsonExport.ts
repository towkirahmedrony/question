import type { QuestionItem } from '../types/question';
import { formatQuestionForExport } from './validation';

export function exportQuestionsToJson(questions: QuestionItem[]): string {
  const exportData = questions.map(formatQuestionForExport);
  return JSON.stringify(exportData, null, 2);
}

export function downloadJsonFile(questions: QuestionItem[], filename: string = 'porokh_imported_questions.json'): void {
  const jsonContent = exportQuestionsToJson(questions);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyJsonToClipboard(questions: QuestionItem[]): Promise<boolean> {
  try {
    const jsonContent = exportQuestionsToJson(questions);
    await navigator.clipboard.writeText(jsonContent);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
