import axios from 'axios';

// Use environment variable for API URL, fallback to local proxy for dev
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({ baseURL: API_BASE });

// ---------- Types ----------

export interface ConnectionParams {
  db_type: string;
  host: string;
  port: number;
  database: string;
  schema_name: string;
  user: string;
  password: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  tables_found: number;
}

export interface PIIFinding {
  table: string;
  column: string;
  pii_type: string;
  confidence: number;
  classifier: string;
  risk_level: string;
  encryption_status: string;
  purpose: string;
}

export interface ConsentMapping {
  table: string;
  column: string;
  purpose: string;
  subject_id_column: string | null;
}

export interface HeatmapCell {
  table: string;
  pii_type: string;
  found: boolean;
  confidence: number;
}

export interface TableStats {
  table: string;
  row_count: number;
  pii_columns: number;
}

export interface ScanSummary {
  tables_scanned: number;
  tables_with_pii: number;
  total_pii_columns: number;
  consent_fields: number;
  high_risk_fields: number;
  pii_types_found: string[];
}

export interface ScanResponse {
  scan_id: string;
  score: number;
  summary: ScanSummary;
  findings: PIIFinding[];
  consent_mappings: ConsentMapping[];
  heatmap: HeatmapCell[];
  table_stats: TableStats[];
  estimated_data_subjects: number;
  scanned_at: string;
}

// ---------- API calls ----------

export async function testConnection(params: ConnectionParams): Promise<TestConnectionResponse> {
  const { data } = await api.post<TestConnectionResponse>('/scan/test-connection', params);
  return data;
}

export async function runScan(params: ConnectionParams): Promise<ScanResponse> {
  const { data } = await api.post<ScanResponse>('/scan/run', params);
  return data;
}

export function getReportUrl(scanId: string): string {
  return `${API_BASE}/scan/${scanId}/report`;
}

export function getScriptUrl(scanId: string): string {
  return `${API_BASE}/scan/${scanId}/script`;
}
