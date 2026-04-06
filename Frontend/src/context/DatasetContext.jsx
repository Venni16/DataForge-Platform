import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const DatasetContext = createContext(null);

const STORAGE_KEY = 'dataforge_state_v1';

const initialState = {
  datasetId: null,
  currentVersion: 0,
  columns: [],
  dtypes: {},
  missing: {},
  missingPct: {},
  numericColumns: [],
  categoricalColumns: [],
  shape: { rows: 0, columns: 0 },
  preview: [],
  describe: {},
  datasetName: null,
  activeTab: 'upload',
  isLoading: false,
};

/** Fields that are safe to persist across refreshes */
const PERSIST_KEYS = [
  'datasetId', 'currentVersion', 'columns', 'dtypes',
  'missing', 'missingPct', 'numericColumns', 'categoricalColumns',
  'shape', 'preview', 'describe', 'datasetName',
];

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Only restore known safe keys
    return Object.fromEntries(
      PERSIST_KEYS.filter(k => parsed[k] !== undefined).map(k => [k, parsed[k]])
    );
  } catch {
    return {};
  }
}

function saveToStorage(state) {
  try {
    const toSave = Object.fromEntries(PERSIST_KEYS.map(k => [k, state[k]]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch { /* ignore quota errors */ }
}

function clearStorage() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATASET':
      return { ...state, ...action.payload };
    case 'SET_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_LOADING':
      return { ...state, isLoading: action.value };
    case 'RESET':
      clearStorage();
      return { ...initialState };
    default:
      return state;
  }
}

export function DatasetProvider({ children }) {
  // Hydrate from localStorage on first render
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    ...loadPersistedState(),
    // Always start on upload tab if no dataset, else overview
    activeTab: (() => {
      try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return s.datasetId ? 'overview' : 'upload';
      } catch { return 'upload'; }
    })(),
  });

  // Persist to localStorage whenever dataset state changes
  useEffect(() => {
    if (state.datasetId) {
      saveToStorage(state);
    }
  }, [
    state.datasetId, state.currentVersion, state.columns, state.shape,
    state.preview, state.missing, state.describe, state.datasetName,
  ]);

  const setDataset = useCallback((payload) => {
    dispatch({ type: 'SET_DATASET', payload });
  }, []);

  const setTab = useCallback((tab) => {
    dispatch({ type: 'SET_TAB', tab });
  }, []);

  const setLoading = useCallback((value) => {
    dispatch({ type: 'SET_LOADING', value });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const applyProcessResult = useCallback((result) => {
    dispatch({
      type: 'SET_DATASET',
      payload: {
        currentVersion: result.version,
        columns:           result.columns          ?? state.columns,
        dtypes:            result.dtypes            ?? state.dtypes,
        missing:           result.missing           ?? state.missing,
        missingPct:        result.missing_pct       ?? state.missingPct,
        numericColumns:    result.numeric_columns   ?? state.numericColumns,
        categoricalColumns:result.categorical_columns ?? state.categoricalColumns,
        shape:             result.shape             ?? state.shape,
        preview:           result.preview           ?? state.preview,
        describe:          result.describe          ?? state.describe,
      },
    });
  }, [state]);

  // Switch to a completely different dataset by its full data object
  const switchDataset = useCallback((data) => {
    dispatch({
      type: 'SET_DATASET',
      payload: {
        datasetId:         data.dataset_id,
        datasetName:       data.name || data.dataset_id?.slice(0, 8),
        currentVersion:    data.version || 1,
        columns:           data.columns || [],
        dtypes:            data.dtypes || {},
        missing:           data.missing || {},
        missingPct:        data.missing_pct || {},
        numericColumns:    data.numeric_columns || [],
        categoricalColumns:data.categorical_columns || [],
        shape:             data.shape || { rows: 0, columns: 0 },
        preview:           data.preview || [],
        describe:          data.describe || {},
      },
    });
    dispatch({ type: 'SET_TAB', tab: 'overview' });
  }, []);

  return (
    <DatasetContext.Provider value={{
      ...state,
      setDataset, setTab, setLoading, reset,
      applyProcessResult, switchDataset,
    }}>
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider');
  return ctx;
}
