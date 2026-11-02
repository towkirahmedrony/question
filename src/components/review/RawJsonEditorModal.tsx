import React, { useState } from 'react';
import type { QuestionItem } from '../../types/question';
import { formatQuestionForExport } from '../../utils/validation';
import { Modal } from '../common/Modal';
import { Copy, Check, Code } from 'lucide-react';

interface RawJsonEditorModalProps {
  question: QuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RawJsonEditorModal: React.FC<RawJsonEditorModalProps> = ({
  question,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!question) return null;

  const formattedJson = JSON.stringify(formatQuestionForExport(question), null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-indigo-600" />
          <span>Raw Question JSON Schema</span>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Matches the exact bilingual format specification:</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-auto max-h-[60vh] border border-slate-800 leading-relaxed">
          {formattedJson}
        </pre>
      </div>
    </Modal>
  );
};
