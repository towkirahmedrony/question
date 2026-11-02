import React, { useState } from 'react';
import type { QuestionItem } from '../../types/question';
import { Modal } from '../common/Modal';
import { DifficultyBadge, SourceTypeBadge } from '../common/Badge';
import { Check, HelpCircle, Eye } from 'lucide-react';

interface QuestionPreviewModalProps {
  question: QuestionItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QuestionPreviewModal: React.FC<QuestionPreviewModalProps> = ({
  question,
  isOpen,
  onClose,
}) => {
  const [previewLang, setPreviewLang] = useState<'bn' | 'en'>('bn');
  const [showExplanation, setShowExplanation] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);

  if (!question) return null;

  const questionText = previewLang === 'bn' ? question.body.text_bn : (question.body.text_en || question.body.text_bn);
  const explanationText = previewLang === 'bn' ? question.explanation.bn : (question.explanation.en || question.explanation.bn);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Porokh Student View Preview</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setPreviewLang('bn')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                previewLang === 'bn' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setPreviewLang('en')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                previewLang === 'en' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              English
            </button>
          </div>
        </div>
      }
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Badges & Source Ref Header */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <DifficultyBadge level={question.difficulty_level} />
          <SourceTypeBadge type={question.source_type} />
          {question.exam_references.map((ref, idx) => (
            <span
              key={idx}
              className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-medium border border-indigo-100"
            >
              {ref}
            </span>
          ))}
        </div>

        {/* Question Text Box */}
        <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200">
          <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed select-text">
            {questionText || '(No question text provided)'}
          </p>

          {/* Attached Diagram / Image */}
          {question.body.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 bg-white p-2 flex justify-center">
              <img
                src={question.body.image_url}
                alt="Question Diagram"
                className="max-h-56 object-contain rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Options List */}
        <div className="space-y-2">
          {question.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx); // A, B, C, D
            const optText = previewLang === 'bn' ? opt.text_bn : (opt.text_en || opt.text_bn);
            const isCorrect = opt.isCorrect;
            const isUserSelected = selectedOptionId === opt.id;

            let borderStyle = 'border-slate-200 hover:border-slate-300 bg-white';
            if (isCorrect) {
              borderStyle = 'border-emerald-300 bg-emerald-50/50';
            } else if (isUserSelected && !isCorrect) {
              borderStyle = 'border-rose-300 bg-rose-50/50';
            }

            return (
              <div
                key={opt.id}
                onClick={() => setSelectedOptionId(opt.id)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${borderStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                      isCorrect
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm font-medium text-slate-900 leading-snug select-text">
                    {optText}
                  </span>
                </div>

                {isCorrect && (
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    <Check className="w-3.5 h-3.5" />
                    Correct
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Explanation Section */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>{showExplanation ? 'Hide Explanation' : 'Show Explanation'}</span>
          </button>

          {showExplanation && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed">
              <span className="font-bold text-amber-900 block mb-1">Explanation:</span>
              <p className="select-text whitespace-pre-wrap">
                {explanationText || 'No explanation provided for this question.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
