import React, { useState } from 'react';
import ConnectionForm from './components/ConnectionForm';
import ScanProgress from './components/ScanProgress';
import ComplianceReport from './components/ComplianceReport';
import { testConnection, runScan } from './services/api';
import type { ConnectionParams, ScanResponse } from './services/api';

type AppState = 'connect' | 'scanning' | 'results';

export default function App() {
  const [state, setState] = useState<AppState>('connect');
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ------ Test Connection ------
  const handleTest = async (params: ConnectionParams) => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await testConnection(params);
      setTestResult(res);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Connection failed';
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  // ------ Run Scan ------
  const handleScan = async (params: ConnectionParams) => {
    setIsScanning(true);
    setError(null);
    setProgressMsg('Connecting to database...');
    setState('scanning');

    try {
      setProgressMsg('Running PII classifiers across all tables...');
      const res = await runScan(params);
      setScanResult(res);
      setState('results');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Scan failed';
      setError(msg);
      setState('connect');
    } finally {
      setIsScanning(false);
    }
  };

  // ------ New Scan ------
  const handleNewScan = () => {
    setState('connect');
    setScanResult(null);
    setTestResult(null);
    setError(null);
  };

  return (
    <div className="app-container">
      <div className="container">
        {/* Header card — white box, like privacy-portal */}
        <header className="header-card">
          <div className="header-card__left">
            <span className="header-card__icon">🧠</span>
            <div className="header-card__info">
              <h1 className="header-card__title">DataCerebrium</h1>
              <p className="header-card__sub">
                {state === 'results'
                  ? 'DPDP Compliance Report'
                  : 'Scan your database for DPDP compliance gaps'}
              </p>
            </div>
          </div>
          <span className="header-card__badge">DPDP Compliance Scanner</span>
        </header>

        {/* Error */}
        {error && (
          <div className="alert alert--error" style={{ marginBottom: 16 }}>
            ❌ {error}
          </div>
        )}

        {/* Connection: two-column card (brand left, form right) */}
        {state === 'connect' && (
          <div className="login-card">
            <div className="login-card__brand">
              <div className="login-card__brand-inner">
                <span className="login-card__brand-icon">🧠</span>
                <h2 className="login-card__brand-title">
                  Your Data,<br />Our Analysis
                </h2>
                <p className="login-card__brand-desc">
                  Discover PII fields, assess DPDP risk, and get migration-ready
                  — in under 60 seconds.
                </p>
                <ul className="login-card__features">
                  <li>✅ Auto-detect PII across all tables</li>
                  <li>✅ Risk scoring per column</li>
                  <li>✅ Consent mapping suggestions</li>
                  <li>✅ Downloadable reports &amp; scripts</li>
                </ul>
              </div>
            </div>
            <div className="login-card__form">
              <h2 className="login-card__form-heading">Connect Database</h2>
              <p className="login-card__form-sub">
                Enter your credentials to scan for compliance gaps
              </p>
              <ConnectionForm
                onTestConnection={handleTest}
                onScan={handleScan}
                testResult={testResult}
                isTesting={isTesting}
                isScanning={isScanning}
              />
            </div>
          </div>
        )}

        {state === 'scanning' && <ScanProgress message={progressMsg} />}

        {state === 'results' && scanResult && (
          <ComplianceReport data={scanResult} onNewScan={handleNewScan} />
        )}

        {/* Footer */}
        <footer className="app-footer">
          <div>© 2026 DataCerebrium by ConsentAxis — Open-source DPDP compliance toolkit</div>
          <div className="app-footer__sub">
            Built for India's Digital Personal Data Protection Act, 2023 &nbsp;|&nbsp;
            <a href="https://consentaxis.com" target="_blank" rel="noopener noreferrer">consentaxis.com</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
