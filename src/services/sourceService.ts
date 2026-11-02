import { apiRequest } from './apiClient';

/** Institution fields the exam reference editor needs. */
export interface InstitutionOption {
  id: string;
  name_bn: string;
  name_en: string | null;
  type: string;
  code: string | null;
  eiin: string | null;
}

const toOption = (row: Record<string, unknown>): InstitutionOption | null => {
  const id = typeof row.id === 'string' ? row.id : '';
  const type = typeof row.type === 'string' ? row.type : '';
  if (!id || !type) return null;

  return {
    id,
    name_bn: typeof row.name_bn === 'string' ? row.name_bn : '',
    name_en: typeof row.name_en === 'string' ? row.name_en : null,
    type,
    code: typeof row.code === 'string' ? row.code : null,
    eiin: typeof row.eiin === 'string' ? row.eiin : null,
  };
};

let institutionsPromise: Promise<InstitutionOption[]> | null = null;

/** Active institutions/boards from the existing content endpoint. */
export const loadInstitutions = (): Promise<InstitutionOption[]> => {
  if (!institutionsPromise) {
    institutionsPromise = apiRequest<unknown>('/content/institutions')
      .then((value) => {
        if (!Array.isArray(value)) return [];

        return (value as Record<string, unknown>[])
          .filter((row) => row.is_active !== false)
          .map(toOption)
          .filter((option): option is InstitutionOption => option !== null)
          .sort((left, right) =>
            (left.name_bn || left.name_en || '').localeCompare(right.name_bn || right.name_en || '')
          );
      })
      .catch((error: unknown) => {
        institutionsPromise = null;
        throw error;
      });
  }

  return institutionsPromise;
};

/** Institution types that may back each reference kind, mirroring the backend. */
export const institutionTypesForKind = (kind: string): string[] => {
  switch (kind) {
    case 'board':
      return ['board'];
    case 'college':
      return ['college'];
    case 'university':
      return ['university'];
    case 'admission':
      return ['university', 'college'];
    case 'school':
      return ['school'];
    default:
      return [];
  }
};
