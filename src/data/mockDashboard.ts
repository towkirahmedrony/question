import type { MockBatchHistory } from '../types/question';

/**
 * Mock Batch Activity and Overview for Phase 1 Frontend Foundation.
 * Explicitly identified as Mock Data.
 */
export const MOCK_DASHBOARD_HISTORY: MockBatchHistory[] = [
  {
    id: 'batch_2026_10_01',
    batchNumber: 'BATCH-2026-1042',
    date: '2026-10-28',
    subjectNameBn: 'পদার্থবিজ্ঞান ১ম পত্র',
    subjectNameEn: 'Physics 1st Paper',
    totalQuestions: 25,
    validCount: 24,
    status: 'imported',
    sourceName: 'Dhaka_Board_2023_Physics.jpg',
  },
  {
    id: 'batch_2026_10_02',
    batchNumber: 'BATCH-2026-1041',
    date: '2026-10-26',
    subjectNameBn: 'রসায়ন ১ম পত্র',
    subjectNameEn: 'Chemistry 1st Paper',
    totalQuestions: 30,
    validCount: 28,
    status: 'imported',
    sourceName: 'BUET_Admission_Chem_2022.jpg',
  },
  {
    id: 'batch_2026_10_03',
    batchNumber: 'BATCH-2026-1040',
    date: '2026-10-24',
    subjectNameBn: 'উচ্চতর গণিত ১ম পত্র',
    subjectNameEn: 'Higher Mathematics 1st Paper',
    totalQuestions: 20,
    validCount: 18,
    status: 'partially_imported',
    sourceName: 'NDC_Math_PreTest_p1.jpg',
  },
  {
    id: 'batch_2026_10_04',
    batchNumber: 'BATCH-2026-1039',
    date: '2026-10-21',
    subjectNameBn: 'জীববিজ্ঞান ১ম পত্র',
    subjectNameEn: 'Biology 1st Paper',
    totalQuestions: 35,
    validCount: 35,
    status: 'imported',
    sourceName: 'Rajshahi_Board_2023_Bio.jpg',
  },
];

export const MOCK_DASHBOARD_METRICS = {
  totalImportedAllTime: 1248,
  totalBatchesProcessed: 64,
  averageAccuracyRate: '96.4%',
  pendingReviewBatches: 2,
};
