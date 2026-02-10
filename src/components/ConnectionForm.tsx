import React, { useState } from 'react';
import type { ConnectionParams } from '../services/api';

interface Props {
  onTestConnection: (params: ConnectionParams) => void;
  onScan: (params: ConnectionParams) => void;
  testResult: { success: boolean; message: string } | null;
  isTesting: boolean;
  isScanning: boolean;
}

const DEFAULT_PARAMS: ConnectionParams = {
  db_type: 'postgresql',
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  schema_name: 'redacted_db',
  user: '',
  password: '',
};

// Default ports for each database type
const DB_DEFAULTS: Record<string, { port: number; database: string }> = {
  postgresql: { port: 5432, database: 'postgres' },
  mysql: { port: 3306, database: 'testdb' },
  snowflake: { port: 443, database: '' },
  mongodb: { port: 27017, database: 'test' },
};

export default function ConnectionForm({
  onTestConnection,
  onScan,
  testResult,
  isTesting,
  isScanning,
}: Props) {
  const [params, setParams] = useState<ConnectionParams>(DEFAULT_PARAMS);

  const set = (field: keyof ConnectionParams, value: string | number) =>
    setParams((p) => ({ ...p, [field]: value }));

  // Handle database type change - update port and database defaults
  const handleDbTypeChange = (dbType: string) => {
    const defaults = DB_DEFAULTS[dbType] || DB_DEFAULTS.postgresql;
    setParams((p) => ({
      ...p,
      db_type: dbType,
      port: defaults.port,
      database: p.database === DB_DEFAULTS[p.db_type]?.database ? defaults.database : p.database,
    }));
  };

  const canTest = params.host && params.database && params.user && params.password;
  const canScan = testResult?.success === true;

  return (
    <div className="connection-form">
      {/* DB type */}
      <div className="form-group">
        <label className="form-label">Database Type</label>
        <select
          className="form-select"
          value={params.db_type}
          onChange={(e) => handleDbTypeChange(e.target.value)}
        >
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="snowflake" disabled>Snowflake (Coming Soon)</option>
          <option value="mongodb" disabled>MongoDB (Coming Soon)</option>
        </select>
      </div>

      {/* Host + Port */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Host</label>
          <input
            className="form-input"
            value={params.host}
            onChange={(e) => set('host', e.target.value)}
            placeholder="localhost"
            data-testid="input-host"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Port</label>
          <input
            className="form-input"
            type="number"
            value={params.port}
            onChange={(e) => set('port', parseInt(e.target.value) || 5432)}
            data-testid="input-port"
          />
        </div>
      </div>

      {/* Database + Schema */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Database</label>
          <input
            className="form-input"
            value={params.database}
            onChange={(e) => set('database', e.target.value)}
            placeholder="postgres"
            data-testid="input-database"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Schema</label>
          <input
            className="form-input"
            value={params.schema_name}
            onChange={(e) => set('schema_name', e.target.value)}
            placeholder="public"
            data-testid="input-schema"
          />
        </div>
      </div>

      {/* User + Password */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">DB Username</label>
          <input
            className="form-input"
            value={params.user}
            onChange={(e) => set('user', e.target.value)}
            placeholder="postgres"
            data-testid="input-user"
          />
        </div>
        <div className="form-group">
          <label className="form-label">DB Password</label>
          <input
            className="form-input"
            type="password"
            value={params.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="••••"
            data-testid="input-password"
          />
        </div>
      </div>

      {/* Test Connection result */}
      {testResult && (
        <div className={`alert ${testResult.success ? 'alert--success' : 'alert--error'}`}>
          {testResult.success ? '✅' : '❌'} {testResult.message}
        </div>
      )}

      {/* Buttons */}
      <div className="btn-group">
        <button
          className="btn btn--secondary"
          onClick={() => onTestConnection(params)}
          disabled={!canTest || isTesting || isScanning}
          data-testid="btn-test"
        >
          {isTesting ? '⏳ Testing...' : '🔌 Test Connection'}
        </button>
        <button
          className="btn btn--primary"
          onClick={() => onScan(params)}
          disabled={!canScan || isScanning}
          data-testid="btn-scan"
        >
          {isScanning ? '⏳ Scanning...' : '🔍 Scan Now'}
        </button>
      </div>

      <p className="privacy-notice">
        <span>ℹ️</span> Your credentials are never stored. Used only for this scan.
      </p>
    </div>
  );
}
