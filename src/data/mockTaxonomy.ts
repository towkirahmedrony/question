import type { Subject } from '../types/taxonomy';

/**
 * Mock NCTB Curriculum Taxonomy Data
 * Explicitly identified as Mock Data for Phase 1 Frontend Foundation.
 */
export const MOCK_TAXONOMY: Subject[] = [
  {
    id: 'sub_physics_1st',
    code: 'PHY-174',
    name_en: 'Physics 1st Paper',
    name_bn: 'পদার্থবিজ্ঞান ১ম পত্র',
    class_level: 'HSC / Class 11-12',
    chapters: [
      {
        id: 'phy1_ch1',
        chapter_number: 1,
        name_en: 'Physical World and Measurement',
        name_bn: 'ভৌতজগৎ ও পরিমাপ',
        topics: [
          { id: 'phy1_t1_1', name_en: 'Physical Quantities & Units', name_bn: 'ভৌত রাশি ও একক' },
          { id: 'phy1_t1_2', name_en: 'Dimensions and Dimensional Analysis', name_bn: 'মাত্রা ও মাত্রিক বিশ্লেষণ' },
          { id: 'phy1_t1_3', name_en: 'Errors and Significant Figures', name_bn: 'ত্রুটি ও তাৎপর্যপূর্ণ অঙ্ক' },
        ],
      },
      {
        id: 'phy1_ch2',
        chapter_number: 2,
        name_en: 'Vectors',
        name_bn: 'ভেক্টর',
        topics: [
          { id: 'phy1_t2_1', name_en: 'Vector Addition and Resolution', name_bn: 'ভেক্টর যোগ ও বিভাজন' },
          { id: 'phy1_t2_2', name_en: 'Dot & Cross Product', name_bn: 'ডট ও ক্রস গুণন' },
          { id: 'phy1_t2_3', name_en: 'Gradient, Divergence & Curl', name_bn: 'গ্র্যাডিয়েন্ট, ডাইভারজেন্স ও কার্ল' },
        ],
      },
      {
        id: 'phy1_ch4',
        chapter_number: 4,
        name_en: 'Newtonian Mechanics',
        name_bn: 'নিউটনীয় বলবিদ্যা',
        topics: [
          { id: 'phy1_t4_1', name_en: 'Newton’s Laws of Motion & Momentum', name_bn: 'নিউটনের গতির সূত্র ও ভরবেগ' },
          { id: 'phy1_t4_2', name_en: 'Friction and Circular Motion', name_bn: 'ঘর্ষণ ও বৃত্তাকার গতি' },
          { id: 'phy1_t4_3', name_en: 'Moment of Inertia & Torque', name_bn: 'জড়তার ভ্রামক ও টর্ক' },
        ],
      },
      {
        id: 'phy1_ch5',
        chapter_number: 5,
        name_en: 'Work, Energy and Power',
        name_bn: 'কাজ, শক্তি ও ক্ষমতা',
        topics: [
          { id: 'phy1_t5_1', name_en: 'Work done by Constant & Variable Force', name_bn: 'ধ্রুব ও পরিবর্তনশীল বল দ্বারা কাজ' },
          { id: 'phy1_t5_2', name_en: 'Work-Energy Theorem & Conservation of Energy', name_bn: 'কাজ-শক্তি উপপাদ্য ও শক্তির সংরক্ষণশীলতা' },
          { id: 'phy1_t5_3', name_en: 'Power and Efficiency', name_bn: 'ক্ষমতা ও কর্মদক্ষতা' },
        ],
      },
    ],
  },
  {
    id: 'sub_chemistry_1st',
    code: 'CHEM-176',
    name_en: 'Chemistry 1st Paper',
    name_bn: 'রসায়ন ১ম পত্র',
    class_level: 'HSC / Class 11-12',
    chapters: [
      {
        id: 'chem1_ch2',
        chapter_number: 2,
        name_en: 'Qualitative Chemistry',
        name_bn: 'গুণগত রসায়ন',
        topics: [
          { id: 'chem1_t2_1', name_en: 'Atomic Models & Quantum Numbers', name_bn: 'পরমাণু মডেল ও কোয়ান্টাম সংখ্যা' },
          { id: 'chem1_t2_2', name_en: 'Aufbau & Hund’s Rules', name_bn: 'আউফবাউ ও হুন্ডের নীতি' },
          { id: 'chem1_t2_3', name_en: 'Solubility & Solubility Product', name_bn: 'দ্রাব্যতা ও দ্রাব্যতা গুণফল' },
        ],
      },
      {
        id: 'chem1_ch3',
        chapter_number: 3,
        name_en: 'Periodic Properties & Chemical Bonding',
        name_bn: 'পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন',
        topics: [
          { id: 'chem1_t3_1', name_en: 'Periodic Trends (IE, EA, EN)', name_bn: 'পর্যায়বৃত্ত ধর্মসমূহ' },
          { id: 'chem1_t3_2', name_en: 'Hybridization & Molecular Geometry', name_bn: 'সংকরায়ন ও অণুর আকৃতি' },
          { id: 'chem1_t3_3', name_en: 'Hydrogen Bonding & Van der Waals Forces', name_bn: 'হাইড্রোজেন বন্ধন ও ভ্যান ডার ওয়ালস বল' },
        ],
      },
      {
        id: 'chem1_ch4',
        chapter_number: 4,
        name_en: 'Chemical Changes',
        name_bn: 'রাসায়নিক পরিবর্তন',
        topics: [
          { id: 'chem1_t4_1', name_en: 'Equilibrium Constant (Kp and Kc)', name_bn: 'সাম্যাবস্থা ধ্রুবক (Kp ও Kc)' },
          { id: 'chem1_t4_2', name_en: 'Le Chatelier’s Principle', name_bn: 'লা শাতেলিয়ারের নীতি' },
          { id: 'chem1_t4_3', name_en: 'pH & Buffer Solutions', name_bn: 'pH ও বাফার দ্রবণ' },
        ],
      },
    ],
  },
  {
    id: 'sub_math_1st',
    code: 'MATH-265',
    name_en: 'Higher Mathematics 1st Paper',
    name_bn: 'উচ্চতর গণিত ১ম পত্র',
    class_level: 'HSC / Class 11-12',
    chapters: [
      {
        id: 'math1_ch1',
        chapter_number: 1,
        name_en: 'Matrices and Determinants',
        name_bn: 'ম্যাট্রিক্স ও নির্ণায়ক',
        topics: [
          { id: 'math1_t1_1', name_en: 'Matrix Operations & Types', name_bn: 'ম্যাট্রিক্সের প্রকারভেদ ও প্রক্রিয়া' },
          { id: 'math1_t1_2', name_en: 'Properties of Determinants', name_bn: 'নির্ণায়কের বৈশিষ্ট্য ও মান নির্ণয়' },
          { id: 'math1_t1_3', name_en: 'Inverse Matrix & Cramer’s Rule', name_bn: 'বিপরীত ম্যাট্রিক্স ও ক্র্যামারের নিয়ম' },
        ],
      },
      {
        id: 'math1_ch3',
        chapter_number: 3,
        name_en: 'Straight Lines',
        name_bn: 'সরলরেখা',
        topics: [
          { id: 'math1_t3_1', name_en: 'Coordinate Geometry & Distance', name_bn: 'স্থানাঙ্ক জ্যামিতি ও দূরত্ব' },
          { id: 'math1_t3_2', name_en: 'Slope and Equations of Straight Line', name_bn: 'ঢাল ও সরলরেখার সমীকরণ' },
          { id: 'math1_t3_3', name_en: 'Angle between Two Lines & Perpendicular Distance', name_bn: 'দুটি রেখার মধ্যবর্তী কোণ ও লম্ব দূরত্ব' },
        ],
      },
      {
        id: 'math1_ch9',
        chapter_number: 9,
        name_en: 'Differentiation',
        name_bn: 'অন্তরীকরণ',
        topics: [
          { id: 'math1_t9_1', name_en: 'Limits and Continuity', name_bn: 'সীমা ও অবিচ্ছিন্নতা' },
          { id: 'math1_t9_2', name_en: 'Differentiation Formulas & Chain Rule', name_bn: 'অন্তরীকরণের সূত্র ও চেইন রুল' },
          { id: 'math1_t9_3', name_en: 'Maxima and Minima', name_bn: 'গুরুমান ও লঘুমান' },
        ],
      },
    ],
  },
  {
    id: 'sub_biology_1st',
    code: 'BIO-178',
    name_en: 'Biology 1st Paper (Botany)',
    name_bn: 'জীববিজ্ঞান ১ম পত্র (উদ্ভিদবিজ্ঞান)',
    class_level: 'HSC / Class 11-12',
    chapters: [
      {
        id: 'bio1_ch1',
        chapter_number: 1,
        name_en: 'Cell and its Structure',
        name_bn: 'কোষ ও এর গঠন',
        topics: [
          { id: 'bio1_t1_1', name_en: 'Cell Organelles & Ribosomes', name_bn: 'কোষীয় অঙ্গাণু ও রাইবোসোম' },
          { id: 'bio1_t1_2', name_en: 'DNA & RNA Structure', name_bn: 'ডিএনএ ও আরএনএ গঠন' },
          { id: 'bio1_t1_3', name_en: 'Transcription and Translation', name_bn: 'ট্রান্সক্রিপশন ও ট্রান্সলেশন' },
        ],
      },
      {
        id: 'bio1_ch9',
        chapter_number: 9,
        name_en: 'Plant Physiology',
        name_bn: 'উদ্ভিদ শারীরতত্ত্ব',
        topics: [
          { id: 'bio1_t9_1', name_en: 'Mineral Nutrition Absorption', name_bn: 'খনিজ লবণ শোষণ' },
          { id: 'bio1_t9_2', name_en: 'Photosynthesis (C3 & C4 Cycle)', name_bn: 'সালোকসংশ্লেষণ (C3 ও C4 চক্র)' },
          { id: 'bio1_t9_3', name_en: 'Respiration & Glycolysis', name_bn: 'শ্বসন ও গ্লাইকোলাইসিস' },
        ],
      },
    ],
  },
];
