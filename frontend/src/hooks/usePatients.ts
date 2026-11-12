import { useEffect, useState } from 'react';
import { PatientProfile } from '../types/patient';
import { fetchPatients } from '../lib/api';

export function usePatients() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchPatients();
        if (isMounted) {
          setPatients(data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load patients');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return { patients, loading, error };
}

