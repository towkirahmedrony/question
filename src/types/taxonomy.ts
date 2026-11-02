export interface Topic {
  id: string;
  name_en: string;
  name_bn: string;
}

export interface Chapter {
  id: string;
  chapter_number: number;
  name_en: string;
  name_bn: string;
  topics: Topic[];
}

export interface Subject {
  id: string;
  code: string;
  name_en: string;
  name_bn: string;
  class_level: string; // e.g. "HSC / Class 11-12", "SSC / Class 9-10"
  chapters: Chapter[];
}
