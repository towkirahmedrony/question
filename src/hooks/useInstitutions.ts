import { useEffect, useState } from 'react';
import { readErrorMessage } from '../services/apiClient';
import { loadInstitutions, type InstitutionOption } from '../services/sourceService';

export interface InstitutionOptions {
  institutions: InstitutionOption[];
  isLoading: boolean;
  error: string | null;
}

/** Active institutions/boards used as exam reference sources. */
export const useInstitutions = (): InstitutionOptions => {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    loadInstitutions()
      .then((list) => {
        if (active) setInstitutions(list);
      })
      .catch((cause: unknown) => {
        if (active) setError(readErrorMessage(cause, 'Institution options could not be loaded.'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { institutions, isLoading, error };
};
