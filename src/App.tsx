/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator, Table as TableIcon, Activity, AlertCircle, Save, History, Trash2, Lightbulb, ChevronDown, ChevronUp, Image as ImageIcon, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { compileFormula } from './lib/parser';

export default function App() {
  const [chartTitle, setChartTitle] = useState('My Formula Plot');
  const [formula, setFormula] = useState('y = 17e-0,2x');
  const [xStart, setXStart] = useState(10);
  const [xEnd, setXEnd] = useState(50);
  const [step, setStep] = useState(1);
  const [stepMode, setStepMode] = useState('1');
  const [savedFormulas, setSavedFormulas] = useState<string[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Load saved formulas on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('excel-formula-history');
      if (saved) {
        setSavedFormulas(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  const saveFormula = () => {
    if (!formula.trim()) return;
    const newHistory = [formula, ...savedFormulas.filter(f => f !== formula)].slice(0, 10);
    setSavedFormulas(newHistory);
    localStorage.setItem('excel-formula-history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSavedFormulas([]);
    localStorage.removeItem('excel-formula-history');
  };

  const exportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "x,y\n" 
      + data.map(row => `${row.x},${row.y !== null ? row.y : 'NaN'}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = chartTitle ? chartTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'formula_data';
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.setAttribute("href", image);
      const filename = chartTitle ? chartTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'formula_chart';
      link.setAttribute("download", `${filename}.png`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export PNG", err);
    }
  };

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
    <div className="h-screen flex flex-col bg-neutral-50 text-neutral-900 font-sans overflow-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-neutral-200 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 w-1/4">
          <Activity className="w-5 h-5 text-blue-600" />
          <h1 className="font-semibold hidden sm:block">Formula Plotter</h1>
        </div>
        
        <div className="flex-1 flex justify-center">
          <input
            type="text"
            value={chartTitle}
            onChange={(e) => setChartTitle(e.target.value)}
            className="w-full max-w-md px-2 py-1 text-center font-medium bg-transparent border border-transparent hover:border-neutral-200 focus:border-blue-500 rounded transition-colors outline-none"
            placeholder="Chart Title"
          />
        </div>

        <div className="flex items-center justify-end gap-2 w-1/4">
          <button 
            onClick={() => setShowExamples(!showExamples)}
            className={`text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${showExamples ? 'bg-blue-100 text-blue-700' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <Lightbulb className="w-4 h-4" />
            <span className="hidden lg:inline">Examples</span>
          </button>
          <button
            onClick={exportPNG}
            className="text-sm font-medium text-neutral-600 hover:text-blue-600 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
            title="Export Chart as PNG"
          >
            <ImageIcon className="w-4 h-4" />
            <span className="hidden lg:inline">PNG</span>
          </button>
          <button
            onClick={exportCSV}
            className="text-sm font-medium text-neutral-600 hover:text-blue-600 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
            title="Export Data as CSV"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden lg:inline">CSV</span>
          </button>
        </div>
      </header>

      {/* Controls Toolbar */}
      <div className="bg-white border-b border-neutral-200 px-4 py-2 flex flex-wrap items-center gap-4 shrink-0 text-sm z-10 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[300px]">
          <span className="font-medium text-neutral-500 italic">f(x) =</span>
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            className="flex-1 px-3 py-1.5 border border-neutral-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
            placeholder="17e-0,2x"
          />
          <button
            onClick={saveFormula}
            title="Save Formula"
            className="p-1.5 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Save className="w-4 h-4" />
          </button>
          {savedFormulas.length > 0 && (
            <div className="flex items-center gap-1 border-l border-neutral-200 pl-2">
              <History className="w-4 h-4 text-neutral-400" />
              <select
                onChange={(e) => {
                  if (e.target.value) setFormula(e.target.value);
                  e.target.value = "";
                }}
                className="w-24 px-1 py-1.5 bg-transparent border-none text-neutral-600 outline-none cursor-pointer"
                value=""
              >
                <option value="" disabled>History...</option>
                {savedFormulas.map((f, i) => (
                  <option key={i} value={f}>{f}</option>
                ))}
              </select>
              <button onClick={clearHistory} title="Clear History" className="p-1 text-neutral-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 bg-neutral-50 px-3 py-1.5 rounded-md border border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-medium">X:</span>
            <input
              type="number"
              value={xStart}
              onChange={(e) => setXStart(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-neutral-300 rounded text-center outline-none focus:border-blue-500"
            />
            <span className="text-neutral-400">to</span>
            <input
              type="number"
              value={xEnd}
              onChange={(e) => setXEnd(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-neutral-300 rounded text-center outline-none focus:border-blue-500"
            />
          </div>
          <div className="w-px h-4 bg-neutral-300"></div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-medium">Step:</span>
            <select
              value={stepMode}
              onChange={(e) => {
                const val = e.target.value;
                setStepMode(val);
                if (val === '1') setStep(1);
                if (val === '0.1') setStep(0.1);
              }}
              className="px-2 py-1 border border-neutral-300 rounded outline-none focus:border-blue-500 bg-white"
            >
              <option value="1">1</option>
              <option value="0.1">0.1</option>
              <option value="custom">Custom</option>
            </select>
            {stepMode === 'custom' && (
              <input
                type="number"
                step="0.1"
                min="0.001"
                value={step}
                onChange={(e) => setStep(Number(e.target.value))}
                className="w-16 px-2 py-1 border border-neutral-300 rounded text-center outline-none focus:border-blue-500"
              />
            )}
          </div>
        </div>
      </div>

      {/* Examples Panel */}
      {showExamples && (
        <div className="bg-blue-50 border-b border-blue-100 p-3 shrink-0 text-sm animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4 overflow-x-auto pb-1">
            <span className="font-medium text-blue-800 flex items-center gap-1.5 whitespace-nowrap">
              <Lightbulb className="w-4 h-4" /> Try:
            </span>
            <button onClick={() => setFormula('y = 17e-0,2x')} className="whitespace-nowrap px-3 py-1 bg-white rounded border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-xs transition-colors">y = 17e-0,2x</button>
            <button onClick={() => setFormula('y = -1E-02x3 + 0,31x2 - 0,13x + 12')} className="whitespace-nowrap px-3 py-1 bg-white rounded border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-xs transition-colors">y = -1E-02x3 + 0,31x2 - 0,13x + 12</button>
            <button onClick={() => setFormula('y = 7e-1E-03x')} className="whitespace-nowrap px-3 py-1 bg-white rounded border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-xs transition-colors">y = 7e-1E-03x</button>
            <button onClick={() => setFormula('y = -2,5ln(x) + 14,45')} className="whitespace-nowrap px-3 py-1 bg-white rounded border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-xs transition-colors">y = -2,5ln(x) + 14,45</button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0">
        {/* Chart Area */}
        <div className="flex-1 flex flex-col p-4 relative bg-neutral-50">
          {error ? (
            <div className="m-auto bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 max-w-md">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-medium">Error parsing formula</h3>
                <p className="text-sm opacity-80 mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-xl border border-neutral-200 shadow-sm p-4 flex flex-col min-h-0 relative" ref={chartRef}>
              {parsed && (
                <div className="absolute top-4 left-6 text-xs text-neutral-400 font-mono bg-white/80 px-2 py-1 rounded pointer-events-none z-10">
                  JS: {parsed}
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="x" 
                    type="number" 
                    domain={['dataMin', 'dataMax']} 
                    tickFormatter={(val) => val.toFixed(1)}
                    stroke="#888888"
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tickFormatter={(val) => val.toFixed(2)}
                    stroke="#888888"
                  />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(4), 'y']}
                    labelFormatter={(label: number) => `x = ${label}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="y" 
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    dot={data.length < 50 ? { r: 3, fill: '#2563eb', strokeWidth: 0 } : false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={300}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Data Table Sidebar */}
        <div className="w-72 bg-white border-l border-neutral-200 flex flex-col shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center gap-2 shrink-0 bg-neutral-50/50">
            <TableIcon className="w-4 h-4 text-neutral-500" />
            <h2 className="font-medium text-sm">Data Points</h2>
            <span className="ml-auto text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">{data.length}</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-500 uppercase bg-white sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-2 font-medium border-b border-neutral-200">x</th>
                  <th className="px-4 py-2 font-medium border-b border-neutral-200">y</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((point, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-2 font-mono text-neutral-500 text-xs">{point.x}</td>
                    <td className="px-4 py-2 font-mono font-medium text-neutral-700 text-xs">{point.y !== null ? point.y : 'NaN'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
