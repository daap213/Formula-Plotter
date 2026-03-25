/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator, Table as TableIcon, Activity, AlertCircle } from 'lucide-react';
import { compileFormula } from './lib/parser';

export default function App() {
  const [formula, setFormula] = useState('y = 17e-0,2x');
  const [xStart, setXStart] = useState(10);
  const [xEnd, setXEnd] = useState(50);
  const [step, setStep] = useState(1);

  const { data, error, parsed } = useMemo(() => {
    const { fn, error, parsed } = compileFormula(formula);
    if (error || !fn) {
      return { data: [], error: error || 'Invalid formula', parsed };
    }

    const dataPoints = [];
    const safeStep = Math.max(0.001, step); // Prevent infinite loops
    const safeStart = Math.min(xStart, xEnd);
    const safeEnd = Math.max(xStart, xEnd);

    for (let x = safeStart; x <= safeEnd; x += safeStep) {
      // Round x to avoid floating point precision issues in display
      const roundedX = Math.round(x * 1000) / 1000;
      const y = fn(roundedX);
      dataPoints.push({ x: roundedX, y: isNaN(y) ? null : Number(y.toFixed(4)) });
    }

    return { data: dataPoints, error: null, parsed };
  }, [formula, xStart, xEnd, step]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center gap-3">
        <Activity className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-semibold">Excel Formula Plotter</h1>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Controls */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Parameters
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Formula
                </label>
                <input
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. y = 17e-0,2x"
                />
                {parsed && !error && (
                  <p className="text-xs text-neutral-500 mt-1 font-mono bg-neutral-100 p-1 rounded overflow-x-auto">
                    JS: {parsed}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    X Start
                  </label>
                  <input
                    type="number"
                    value={xStart}
                    onChange={(e) => setXStart(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    X End
                  </label>
                  <input
                    type="number"
                    value={xEnd}
                    onChange={(e) => setXEnd(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Step Size
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.001"
                  value={step}
                  onChange={(e) => setStep(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
            <p className="font-medium mb-1">Examples:</p>
            <ul className="list-disc pl-4 space-y-1 opacity-80">
              <li>y = 17e-0,2x</li>
              <li>y = -1E-02x3 + 0,31x2 - 0,13x + 12</li>
              <li>y = 7e-1E-03x</li>
              <li>y = -2,5ln(x) + 14,45</li>
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-6">
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium">Error parsing formula</h3>
                <p className="text-sm opacity-80 mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis 
                      dataKey="x" 
                      type="number" 
                      domain={['dataMin', 'dataMax']} 
                      tickFormatter={(val) => val.toFixed(1)}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      tickFormatter={(val) => val.toFixed(2)}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value.toFixed(4), 'y']}
                      labelFormatter={(label: number) => `x = ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="y" 
                      stroke="#2563eb" 
                      strokeWidth={2} 
                      dot={data.length < 50 ? { r: 3, fill: '#2563eb' } : false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200 flex items-center gap-2">
                  <TableIcon className="w-5 h-5 text-neutral-500" />
                  <h2 className="font-medium">Data Points</h2>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-neutral-500 uppercase bg-neutral-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 font-medium">x</th>
                        <th className="px-6 py-3 font-medium">y</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {data.map((point, i) => (
                        <tr key={i} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-3 font-mono text-neutral-600">{point.x}</td>
                          <td className="px-6 py-3 font-mono font-medium">{point.y !== null ? point.y : 'NaN'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
