/**
 * Hybrid storage layer:
 *  - Uses Supabase when SUPABASE_URL + SUPABASE_SERVICE_KEY are set.
 *  - Falls back to local JSON files in ./data/ otherwise.
 *
 * Both modes expose the same API surface so the rest of the codebase
 * never has to know which backend is active.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USE_SUPABASE = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

let supabase = null;
if (USE_SUPABASE) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// ── Local Fallback ─────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!USE_SUPABASE && !fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function localPath(filename) {
  return path.join(DATA_DIR, filename);
}

function readLocal(filename) {
  const p = localPath(filename);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeLocal(filename, data) {
  fs.writeFileSync(localPath(filename), JSON.stringify(data, null, 2));
}

// ── Datasets ───────────────────────────────────────────────────────────────────
export async function saveDatasetMeta(meta) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('datasets').upsert(meta);
    if (error) throw new Error(error.message);
  } else {
    const datasets = readLocal('datasets.json');
    const idx = datasets.findIndex(d => d.id === meta.id);
    if (idx >= 0) datasets[idx] = { ...datasets[idx], ...meta };
    else datasets.push(meta);
    writeLocal('datasets.json', datasets);
  }
}

export async function getDatasetMeta(datasetId) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();
    if (error) return null;
    return data;
  } else {
    const datasets = readLocal('datasets.json');
    return datasets.find(d => d.id === datasetId) || null;
  }
}

// ── Operations History ─────────────────────────────────────────────────────────
export async function saveOperation(record) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('operations_history').insert(record);
    if (error) throw new Error(error.message);
  }
  // The data engine already persists history locally — no duplication needed in local mode.
}

export async function getOperations(datasetId) {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('operations_history')
      .select('*')
      .eq('dataset_id', datasetId)
      .order('timestamp', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }
  return []; // delegated to data-engine in local mode
}

export async function getAllDatasets() {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  } else {
    const datasets = readLocal('datasets.json');
    return [...datasets].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }
}

export async function deleteDataset(id) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('datasets').delete().eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const datasets = readLocal('datasets.json');
    writeLocal('datasets.json', datasets.filter(d => d.id !== id));
  }
}

export async function updateDataset(id, updates) {
  if (USE_SUPABASE) {
    const { error } = await supabase.from('datasets').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const datasets = readLocal('datasets.json');
    const index = datasets.findIndex(d => d.id === id);
    if (index !== -1) {
      datasets[index] = { ...datasets[index], ...updates };
      writeLocal('datasets.json', datasets);
    }
  }
}

export const storageMode = USE_SUPABASE ? 'supabase' : 'local';
