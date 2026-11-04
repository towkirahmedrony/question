import React from 'react';
import { useLanguage } from '../../i18n/useLanguage';
import { ChevronDown, FileText } from 'lucide-react';

const EXAMPLE = `@source: admission
@institution: University of Dhaka
@exam: A Unit
@unit: ক
@session: 2024-25
@tags: biology, cell biology

Q_BN: কোষ ঝিল্লির মোট শুষ্ক ওজনের কত ভাগ লিপিড?
Q_EN: What percentage of the total dry weight of the cell membrane is lipid?
A_BN: প্রায় 50 ভাগ
A_EN: About 50%
B_BN: প্রায় 75 ভাগ
B_EN: About 75%
C_BN: প্রায় 90 ভাগ
C_EN: About 90%
D_BN: প্রায় 25 ভাগ
D_EN: About 25%
ANS: B
EXP_BN: কোষ ঝিল্লির মোট শুষ্ক ওজনের প্রায় 75% লিপিড।
EXP_EN: Lipids make up about 75% of the total dry weight of the cell membrane.
DIFF: medium
TAGS: biology, cell biology, cell membrane

---

Q_BN: প্লাজমোডেসমাটা কী?
Q_EN: What is a plasmodesma?
A_BN: কোষ গহ্বর
A_EN: Cell vacuole
B_BN: সাইটোপ্লাজমের সুতা
B_EN: Cytoplasmic thread
C_BN: আন্তঃকোষীয় সাইটোপ্লাজমের সংযোগ
C_EN: Intercellular cytoplasmic connection
D_BN: কোনটিই নয়
D_EN: None of the above
ANS: C
DIFF: medium
TAGS: biology, plant cell, plasmodesmata`;

const OPTIONAL_SOURCE_EXAMPLE = `@source: model_test

Q_BN: পানির রাসায়নিক সংকেত কী?
Q_EN: What is the chemical formula of water?
A_BN: CO₂
A_EN: CO₂
B_BN: H₂O
B_EN: H₂O
ANS: B
DIFF: easy`;

/** Collapsible reference for the canonical format and supported inputs. */
export const FormatGuide: React.FC = () => {
  const { t } = useLanguage();

  return (
    <details className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 list-none">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <FileText className="w-4 h-4 text-indigo-600" />
          {t.import_format_guide}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-slate-100 px-4 py-4 space-y-4 text-xs sm:text-sm text-slate-600">
        <div>
          <h3 className="font-bold text-slate-900">{t.import_guide_title}</h3>
          <p className="mt-1 leading-relaxed">{t.import_guide_intro}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="font-semibold text-slate-800">Inputs</p>
            <p className="mt-1 leading-relaxed">{t.import_guide_inputs}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="font-semibold text-slate-800">Required fields</p>
            <p className="mt-1 leading-relaxed">{t.import_guide_fields}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="font-semibold text-slate-800">Metadata</p>
            <p className="mt-1 leading-relaxed">{t.import_guide_metadata}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="font-semibold text-slate-800">Answers and taxonomy</p>
            <p className="mt-1 leading-relaxed">{t.import_guide_answers}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="font-semibold text-slate-800">CSV columns</p>
            <p className="mt-1 leading-relaxed">{t.import_guide_csv}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="font-semibold text-amber-900">Common errors</p>
            <p className="mt-1 leading-relaxed text-amber-800">{t.import_guide_errors}</p>
          </div>
        </div>

        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3">
          <p className="font-semibold text-indigo-900">Question separator</p>
          <p className="mt-1 leading-relaxed text-indigo-800">{t.import_guide_separator}</p>
        </div>

        <div>
          <p className="font-semibold text-slate-800 mb-2">Complete example</p>
          <pre className="max-h-80 overflow-auto rounded-xl bg-slate-900 text-slate-100 p-3.5 font-mono text-[11px] leading-5">
            {EXAMPLE}
          </pre>
        </div>

        <div>
          <p className="font-semibold text-slate-800 mb-2">Model Test / Guidebook / Unknown (institution and unit optional)</p>
          <pre className="overflow-auto rounded-xl bg-slate-900 text-slate-100 p-3.5 font-mono text-[11px] leading-5">
            {OPTIONAL_SOURCE_EXAMPLE}
          </pre>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Metadata lines: <code>@source</code>, <code>@institution</code>, <code>@exam</code>,{' '}
          <code>@unit</code>, <code>@session</code> (legacy <code>@year</code> accepted), <code>@tags</code>. Question fields:{' '}
          <code>Q_BN</code>, <code>Q_EN</code>, <code>A_BN…F_EN</code>, <code>ANS</code>,{' '}
          <code>EXP_BN</code>, <code>EXP_EN</code>, <code>DIFF</code>, <code>TAGS</code>.
        </p>
      </div>
    </details>
  );
};
