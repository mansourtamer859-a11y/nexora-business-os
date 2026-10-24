import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  initialWorkspaceData,
  parseWorkspaceData,
  type WorkspaceData,
} from '../lib/workspaceData';

export type WorkspaceDataStatus = 'checking' | 'ready' | 'unauthorized' | 'error';

type ApiRecord = {
  data: WorkspaceData | null;
  revision: number;
};

function isApiRecord(value: unknown): value is ApiRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Number.isSafeInteger(record.revision)
    && (record.revision as number) >= 0
    && (record.data === null || parseWorkspaceData(record.data) !== null);
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body
      && typeof body.error === 'string') {
      return body.error;
    }
  } catch {
    // Use the status-based fallback below when a response has no JSON error body.
  }
  return `Workspace request failed (${response.status}).`;
}

export function useWorkspaceData(enabled: boolean, onUnauthorized: () => void) {
  const [data, setData] = useState<WorkspaceData>(initialWorkspaceData);
  const [status, setStatus] = useState<WorkspaceDataStatus>('checking');
  const [error, setError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const revisionRef = useRef(0);
  const persistedDataRef = useRef('');
  const latestDataRef = useRef(data);
  const saveInFlightRef = useRef(false);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch('/api/business-data', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (response.status === 401) {
          onUnauthorized();
          setStatus('unauthorized');
          return;
        }
        if (!response.ok) throw new Error(await getErrorMessage(response));

        const body: unknown = await response.json();
        if (!isApiRecord(body)) throw new Error('The workspace API returned invalid data.');

        revisionRef.current = body.revision;
        persistedDataRef.current = body.data ? JSON.stringify(body.data) : '';
        if (body.data) setData(body.data);
        setStatus('ready');
      } catch (loadError) {
        if (controller.signal.aborted) return;
        const message = loadError instanceof Error ? loadError.message : 'Workspace data could not be loaded.';
        setError(message);
        setStatus('error');
      }
    };

    void load();
    return () => controller.abort();
  }, [enabled, loadAttempt, onUnauthorized]);

  useEffect(() => {
    if (!enabled || status !== 'ready') return undefined;
    const snapshot = data;
    const serialized = JSON.stringify(snapshot);
    if (serialized === persistedDataRef.current) return undefined;

    const timer = window.setTimeout(() => {
      if (saveInFlightRef.current) return;
      saveInFlightRef.current = true;

      const save = async () => {
        try {
          const response = await fetch('/api/business-data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: snapshot, revision: revisionRef.current }),
          });
          if (response.status === 401) {
            onUnauthorized();
            setStatus('unauthorized');
            return;
          }
          if (!response.ok) throw new Error(await getErrorMessage(response));

          const body: unknown = await response.json();
          if (typeof body !== 'object' || body === null || !('revision' in body)
            || !Number.isSafeInteger(body.revision) || (body.revision as number) < 1) {
            throw new Error('The workspace API returned an invalid save confirmation.');
          }
          revisionRef.current = body.revision as number;
          persistedDataRef.current = serialized;
          setError('');
        } catch (saveError) {
          const message = saveError instanceof Error ? saveError.message : 'Workspace data could not be saved.';
          setError(message);
          setStatus('error');
        } finally {
          saveInFlightRef.current = false;
          if (JSON.stringify(latestDataRef.current) !== serialized) setSaveAttempt((current) => current + 1);
        }
      };

      void save();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [data, enabled, onUnauthorized, saveAttempt, status]);

  const retry = useCallback(() => {
    setStatus('checking');
    setError('');
    setLoadAttempt((attempt) => attempt + 1);
  }, []);
  const setDeals = useCallback<Dispatch<SetStateAction<WorkspaceData['deals']>>>((update) => {
    setData((current) => ({ ...current, deals: typeof update === 'function' ? update(current.deals) : update }));
  }, []);
  const setInventoryOnHand = useCallback<Dispatch<SetStateAction<number>>>((update) => {
    setData((current) => ({
      ...current,
      inventoryOnHand: typeof update === 'function' ? update(current.inventoryOnHand) : update,
    }));
  }, []);
  const setInvoices = useCallback<Dispatch<SetStateAction<WorkspaceData['invoices']>>>((update) => {
    setData((current) => ({ ...current, invoices: typeof update === 'function' ? update(current.invoices) : update }));
  }, []);

  return {
    data,
    setDeals,
    setInventoryOnHand,
    setInvoices,
    status,
    error,
    retry,
  };
}
