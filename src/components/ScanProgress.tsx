import React from 'react';

interface Props {
  message: string;
}

export default function ScanProgress({ message }: Props) {
  return (
    <div className="progress-container">
      <h2 className="card__title" style={{ marginBottom: 8 }}>
        🧠 DataCerebrium — Scanning...
      </h2>
      <p className="progress-label">{message}</p>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }}
        />
      </div>
      <p className="progress-counter">Analyzing columns for PII patterns...</p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; width: 40%; }
          50% { opacity: 0.85; width: 80%; }
        }
      `}</style>
    </div>
  );
}
