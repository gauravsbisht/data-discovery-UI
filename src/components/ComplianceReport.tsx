import React, { useMemo, useRef, useState } from 'react';
import type { ScanResponse, PIIFinding } from '../services/api';
import { getReportUrl, getScriptUrl } from '../services/api';

interface Props {
  data: ScanResponse;
  onNewScan: () => void;
}

type SortField = 'table' | 'column' | 'pii_type' | 'confidence' | 'risk_level';
type RiskFilter = 'all' | 'critical' | 'high';
type ViewMode = 'grouped' | 'flat';

const RISK_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function ComplianceReport({ data, onNewScan }: Props) {
  const [sortField, setSortField] = useState<SortField>('risk_level');
  const [sortAsc, setSortAsc] = useState(true);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const findingsRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  // ---- Score color ----
  const scoreColor =
    data.score >= 70
      ? 'var(--dc-success)'
      : data.score >= 40
        ? 'var(--dc-warning)'
        : 'var(--dc-danger)';

  // ---- Heatmap data ----
  const heatmap = useMemo(() => {
    const tables = [...new Set(data.heatmap.map((h) => h.table))];
    const piiTypes = [...new Set(data.heatmap.map((h) => h.pii_type))];
    const lookup = new Map(data.heatmap.map((h) => [`${h.table}|${h.pii_type}`, h]));
    return { tables, piiTypes, lookup };
  }, [data.heatmap]);

  // ---- Sorted & filtered findings ----
  const sortedFindings = useMemo(() => {
    let items = [...data.findings];
    if (riskFilter === 'critical') {
      items = items.filter((f) => f.risk_level === 'critical');
    } else if (riskFilter === 'high') {
      items = items.filter((f) => f.risk_level === 'critical' || f.risk_level === 'high');
    }
    items.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'confidence') {
        cmp = a.confidence - b.confidence;
      } else if (sortField === 'risk_level') {
        cmp = (RISK_ORDER[a.risk_level] ?? 4) - (RISK_ORDER[b.risk_level] ?? 4);
      } else {
        cmp = (a[sortField] ?? '').localeCompare(b[sortField] ?? '');
      }
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [data.findings, sortField, sortAsc, riskFilter]);

  // ---- Grouped findings by table ----
  const groupedFindings = useMemo(() => {
    const groups: Record<string, PIIFinding[]> = {};
    for (const f of sortedFindings) {
      if (!groups[f.table]) groups[f.table] = [];
      groups[f.table].push(f);
    }
    return groups;
  }, [sortedFindings]);

  // Toggle table expansion
  const toggleTable = (table: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(table)) next.delete(table);
      else next.add(table);
      return next;
    });
  };

  // Expand all tables
  const expandAll = () => setExpandedTables(new Set(Object.keys(groupedFindings)));
  const collapseAll = () => setExpandedTables(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const sortArrow = (field: SortField) =>
    sortField === field ? (sortAsc ? ' ▲' : ' ▼') : '';

  // ---- PII type display name ----
  const formatPII = (t: string) =>
    t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // ---- Stat card click handlers ----
  const scrollToFindings = () => {
    setRiskFilter('all');
    setViewMode('grouped');
    findingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToHighRisk = () => {
    setRiskFilter('high');
    setViewMode('flat'); // Show flat view for filtered results
    findingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToConsent = () => {
    consentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToVolume = () => {
    volumeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      {/* Header row */}
      <div className="report-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>
            🧠 Compliance Gap Report
          </h2>
          <p className="report-header__meta">
            Database: {data.summary.tables_scanned} tables scanned •{' '}
            {new Date(data.scanned_at).toLocaleString()}
          </p>
        </div>
        <button className="btn btn--outline" onClick={onNewScan} data-testid="btn-new-scan">
          ← New Scan
        </button>
      </div>

      {/* Stat cards */}
      <div className="stats-row" data-testid="stat-cards">
        <div className="stat-card">
          <div className="stat-card__label">Compliance Score</div>
          <div className="stat-card__value" style={{ color: scoreColor }} data-testid="score">
            {data.score}%
          </div>
          <div className="stat-card__sub" style={{ color: scoreColor }}>
            {data.score >= 70 ? '🟢 GOOD' : data.score >= 40 ? '🟡 MODERATE' : '🔴 LOW'}
          </div>
        </div>
        <div className="stat-card" onClick={scrollToFindings} title="View all PII findings">
          <div className="stat-card__label">PII Columns</div>
          <div className="stat-card__value">{data.summary.total_pii_columns}</div>
          <div className="stat-card__sub">
            across {data.summary.tables_with_pii} tables
          </div>
        </div>
        <div className="stat-card stat-card--danger" onClick={scrollToHighRisk} title="View high-risk findings">
          <div className="stat-card__label">High Risk</div>
          <div className="stat-card__value" style={{ color: 'var(--dc-danger)' }}>
            {data.summary.high_risk_fields}
          </div>
          <div className="stat-card__sub" style={{ color: 'var(--dc-danger)' }}>
            ⚠️ Urgent
          </div>
        </div>
        <div className="stat-card stat-card--info" onClick={scrollToConsent} title="View consent migration fields">
          <div className="stat-card__label">Consent Fields</div>
          <div className="stat-card__value" style={{ color: 'var(--dc-primary)' }}>
            {data.summary.consent_fields}
          </div>
          <div className="stat-card__sub">
            📋 Migrate
          </div>
        </div>
        <div className="stat-card stat-card--warning" onClick={scrollToVolume} title="View data volume & impact">
          <div className="stat-card__label">Data Volume</div>
          <div className="stat-card__value" style={{ color: 'var(--dc-warning)' }}>
            {data.table_stats ? data.table_stats.reduce((sum, t) => sum + Math.max(0, t.row_count), 0).toLocaleString() : '—'}
          </div>
          <div className="stat-card__sub">
            📊 Records
          </div>
        </div>
      </div>

      {/* PII Heatmap */}
      {heatmap.piiTypes.length > 0 && (
        <div className="section">
          <div className="section__title">📊 PII Heatmap</div>
          <div className="heatmap-container">
            <table className="heatmap">
              <thead>
                <tr>
                  <th>Table</th>
                  {heatmap.piiTypes.map((t) => (
                    <th key={t}>{formatPII(t)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.tables.map((tbl) => (
                  <tr key={tbl}>
                    <td>{tbl}</td>
                    {heatmap.piiTypes.map((pt) => {
                      const cell = heatmap.lookup.get(`${tbl}|${pt}`);
                      return (
                        <td
                          key={pt}
                          className={
                            cell?.found
                              ? 'heatmap__cell--found'
                              : 'heatmap__cell--empty'
                          }
                        >
                          {cell?.found ? '██' : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Findings table */}
      <div className="section" ref={findingsRef}>
        <div className="section__title">
          🔍 Detailed Findings ({sortedFindings.length}{riskFilter !== 'all' ? ` of ${data.findings.length}` : ''})
          {riskFilter !== 'all' && (
            <button
              className="filter-badge"
              onClick={() => { setRiskFilter('all'); setViewMode('grouped'); }}
            >
              Showing: {riskFilter} risk only ✕
            </button>
          )}
          {riskFilter === 'all' && (
            <div className="view-toggle">
              <button
                className={`view-toggle__btn ${viewMode === 'grouped' ? 'active' : ''}`}
                onClick={() => setViewMode('grouped')}
              >
                Grouped
              </button>
              <button
                className={`view-toggle__btn ${viewMode === 'flat' ? 'active' : ''}`}
                onClick={() => setViewMode('flat')}
              >
                Flat
              </button>
            </div>
          )}
        </div>

        {/* Grouped View */}
        {viewMode === 'grouped' && riskFilter === 'all' && (
          <div className="findings-grouped" data-testid="findings-grouped">
            <div className="findings-grouped__actions">
              <button className="btn btn--link" onClick={expandAll}>Expand All</button>
              <button className="btn btn--link" onClick={collapseAll}>Collapse All</button>
            </div>
            {Object.entries(groupedFindings).map(([table, findings]) => (
              <div key={table} className="findings-group">
                <div
                  className="findings-group__header"
                  onClick={() => toggleTable(table)}
                >
                  <span className="findings-group__toggle">
                    {expandedTables.has(table) ? '−' : '+'}
                  </span>
                  <span className="findings-group__table">{table}</span>
                  <span className="findings-group__count">{findings.length} PII columns</span>
                  <span className="findings-group__risk">
                    {findings.filter(f => f.risk_level === 'critical' || f.risk_level === 'high').length} high-risk
                  </span>
                </div>
                {expandedTables.has(table) && (
                  <div className="findings-group__body">
                    <table className="data-table data-table--compact">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>PII Type</th>
                          <th>Confidence</th>
                          <th>Risk</th>
                          <th>Encryption</th>
                          <th>Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {findings.map((f, i) => (
                          <tr key={i}>
                            <td><code>{f.column}</code></td>
                            <td>{formatPII(f.pii_type)}</td>
                            <td>{Math.round(f.confidence * 100)}%</td>
                            <td>
                              <span className={`badge badge--${f.risk_level}`}>
                                {f.risk_level}
                              </span>
                            </td>
                            <td>
                              <span className={`encryption-badge encryption-badge--${f.encryption_status === 'encrypted' || f.encryption_status === 'hashed' ? 'yes' : 'no'}`}>
                                {f.encryption_status === 'encrypted' || f.encryption_status === 'hashed' ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td className="purpose-cell">{f.purpose || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Flat View (original table, shown when filtered or flat mode selected) */}
        {(viewMode === 'flat' || riskFilter !== 'all') && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" data-testid="findings-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('table')}>Table{sortArrow('table')}</th>
                  <th onClick={() => handleSort('column')}>Column{sortArrow('column')}</th>
                  <th onClick={() => handleSort('pii_type')}>PII Type{sortArrow('pii_type')}</th>
                  <th onClick={() => handleSort('confidence')}>Confidence{sortArrow('confidence')}</th>
                  <th onClick={() => handleSort('risk_level')}>Risk{sortArrow('risk_level')}</th>
                  <th>Encryption</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {sortedFindings.map((f, i) => (
                  <tr key={i}>
                    <td>{f.table}</td>
                    <td><code>{f.column}</code></td>
                    <td>{formatPII(f.pii_type)}</td>
                    <td>{Math.round(f.confidence * 100)}%</td>
                    <td>
                      <span className={`badge badge--${f.risk_level}`}>
                        {f.risk_level}
                      </span>
                    </td>
                    <td>
                      <span className={`encryption-badge encryption-badge--${f.encryption_status === 'encrypted' || f.encryption_status === 'hashed' ? 'yes' : 'no'}`}>
                        {f.encryption_status === 'encrypted' || f.encryption_status === 'hashed' ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="purpose-cell">{f.purpose || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Consent mapping */}
      {data.consent_mappings.length > 0 && (
        <div className="section" ref={consentRef}>
          <div className="section__title">📋 Consent Migration Candidates</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Table.Column</th>
                <th>→ DPDP Purpose</th>
                <th>Subject ID</th>
              </tr>
            </thead>
            <tbody>
              {data.consent_mappings.map((c, i) => (
                <tr key={i}>
                  <td>
                    <code>{c.table}.{c.column}</code>
                  </td>
                  <td>{c.purpose}</td>
                  <td>{c.subject_id_column || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data Volume & Impact Metrics */}
      {data.table_stats && data.table_stats.length > 0 && (
        <div className="section" ref={volumeRef}>
          <div className="section__title">📊 Data Volume & Impact</div>
          <div className="impact-summary">
            <div className="impact-summary__card">
              <span className="impact-summary__icon">👥</span>
              <div className="impact-summary__content">
                <div className="impact-summary__value">
                  ~{(data.estimated_data_subjects || 0).toLocaleString()}
                </div>
                <div className="impact-summary__label">Estimated Data Subjects</div>
              </div>
            </div>
            <div className="impact-summary__card">
              <span className="impact-summary__icon">📁</span>
              <div className="impact-summary__content">
                <div className="impact-summary__value">
                  {data.table_stats.reduce((sum, t) => sum + t.row_count, 0).toLocaleString()}
                </div>
                <div className="impact-summary__label">Total Records</div>
              </div>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Table</th>
                <th>Row Count</th>
                <th>PII Columns</th>
                <th>Remediation Scale</th>
              </tr>
            </thead>
            <tbody>
              {data.table_stats.map((t, i) => (
                <tr key={i}>
                  <td><code>{t.table}</code></td>
                  <td>{t.row_count.toLocaleString()}</td>
                  <td>{t.pii_columns}</td>
                  <td>
                    <span className={`badge badge--${t.row_count > 10000 ? 'high' : t.row_count > 1000 ? 'medium' : 'low'}`}>
                      {t.row_count > 10000 ? 'Large' : t.row_count > 1000 ? 'Medium' : 'Small'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Download buttons */}
      <div className="section">
        <div className="section__title">📥 Downloads</div>
        <div className="btn-group">
          <a
            className="btn btn--primary"
            href={getReportUrl(data.scan_id)}
            download
            data-testid="btn-download-report"
          >
            📥 Download Report (MD)
          </a>
          <a
            className="btn btn--secondary"
            href={getScriptUrl(data.scan_id)}
            download
            data-testid="btn-download-script"
          >
            📜 Download Migration Script
          </a>
        </div>
      </div>

      {/* Cross-sell CTA */}
      <div className="cta-banner">
        <div className="cta-banner__text">
          <strong>🔗 Want to fix these gaps?</strong>{' '}
          ConsentAxis manages consent ledgers, DSARs, and audit trails — DPDP-ready.
        </div>
        <a
          className="btn btn--primary"
          href="https://consentaxis.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Try ConsentAxis →
        </a>
      </div>
    </div>
  );
}
