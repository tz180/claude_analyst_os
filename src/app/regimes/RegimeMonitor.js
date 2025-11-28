import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, TrendingDown } from 'lucide-react';
import { factorExposureServices, regimeServices } from '../../supabaseServices';

const defaultTargets = { mkt: 1, smb: 0.15, hml: 0 };
const scenarioShocks = {
  calm: { mkt: -0.01, smb: -0.002, hml: 0.001 },
  stress: { mkt: -0.05, smb: -0.01, hml: -0.02 },
  growth: { mkt: 0.02, smb: 0.005, hml: -0.005 },
};

const formatPct = (val) => `${(val * 100).toFixed(1)}%`;

const RegimeMonitor = ({ positions = [] }) => {
  const [regime, setRegime] = useState(null);
  const [exposures, setExposures] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [latestRegime, latestExposures] = await Promise.all([
        regimeServices.getCurrentProbabilities(),
        factorExposureServices.getLatestExposures(positions.map((p) => p.ticker)),
      ]);
      setRegime(latestRegime);
      setExposures(latestExposures || []);
    };
    load();
  }, [positions]);

  const factorSummary = useMemo(() => {
    const totals = {};
    exposures.forEach((row) => {
      Object.entries(row.betas || {}).forEach(([factor, beta]) => {
        totals[factor] = (totals[factor] || 0) + Number(beta || 0);
      });
    });
    return totals;
  }, [exposures]);

  const drift = useMemo(() => {
    return Object.keys({ ...factorSummary, ...defaultTargets }).map((factor) => {
      const current = factorSummary[factor] || 0;
      const target = defaultTargets[factor] || 0;
      return { factor, current, target, drift: current - target };
    });
  }, [factorSummary]);

  const scenarioPnL = useMemo(() => {
    if (!regime) return [];
    return Object.entries(regime.probabilities || {}).map(([label, prob]) => {
      const shocks = scenarioShocks[label] || scenarioShocks.stress;
      const expectedShock = Object.entries(factorSummary).reduce((sum, [factor, beta]) => {
        return sum + (shocks[factor] || 0) * beta;
      }, 0);
      return { label, probability: prob, expectedShock };
    });
  }, [regime, factorSummary]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Regime Monitor</p>
            <h2 className="text-2xl font-semibold">Current Regime Probabilities</h2>
          </div>
          <Activity className="text-blue-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarioPnL.map((row) => (
            <div key={row.label} className="border rounded-lg p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold capitalize">{row.label}</span>
                <span className="text-sm text-gray-600">{formatPct(row.probability)}</span>
              </div>
              <div className="text-sm text-gray-700 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <span>Scenario P&L Shock: {formatPct(row.expectedShock)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Factor Alignment</p>
            <h3 className="text-xl font-semibold">Exposure Drift vs Targets</h3>
          </div>
          <AlertTriangle className="text-amber-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Beta</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {drift.map((row) => (
                <tr key={row.factor}>
                  <td className="px-4 py-2 font-medium text-gray-900 uppercase">{row.factor}</td>
                  <td className="px-4 py-2 text-gray-700">{row.current.toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-700">{row.target.toFixed(2)}</td>
                  <td className={`px-4 py-2 font-semibold ${row.drift > 0.1 ? 'text-red-600' : 'text-gray-800'}`}>
                    {row.drift.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">Risk Diagnostic</p>
            <h3 className="text-xl font-semibold">Scenario P&L Shocks</h3>
          </div>
          <TrendingDown className="text-rose-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarioPnL.map((row) => (
            <div key={row.label} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium capitalize">{row.label}</span>
                <span className="text-sm text-gray-500">Prob: {formatPct(row.probability)}</span>
              </div>
              <p className={`text-lg font-semibold ${row.expectedShock < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                Expected P&L: {formatPct(row.expectedShock)}
              </p>
              <p className="text-sm text-gray-600">Assumes shocks calibrated to factor betas.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RegimeMonitor;
