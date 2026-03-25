/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calculator, Table as TableIcon, Activity, AlertCircle, Save, History, Trash2, Lightbulb, ChevronDown, ChevronUp, Image as ImageIcon, FileText, Plus, Eye, EyeOff } from 'lucide-react';
import { toPng } from 'html-to-image';
import * as XLSX from 'xlsx';
import { compileFormula } from './lib/parser';

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0d9488', '#db2777'];

interface Formula {
  id: string;
  expression: string;
  color: string;
}

export default function App() {
  const [chartTitle, setChartTitle] = useState('My Formula Plot');
  const [formulas, setFormulas] = useState<Formula[]>([
    { id: '1', expression: 'y = 17e-0,2x', color: COLORS[0] }
  ]);
  const [hiddenFormulas, setHiddenFormulas] = useState<string[]>([]);
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

  const saveFormulas = () => {
    const newHistory = [...savedFormulas];
    formulas.forEach(f => {
      const expr = f.expression.trim();
      if (expr && !newHistory.includes(expr)) {
        newHistory.unshift(expr);
      }
    });
    const limitedHistory = newHistory.slice(0, 15);
    setSavedFormulas(limitedHistory);
    localStorage.setItem('excel-formula-history', JSON.stringify(limitedHistory));
  };

  const clearHistory = () => {
    setSavedFormulas([]);
    localStorage.removeItem('excel-formula-history');
  };

  const addFormula = (expr: string = '') => {
    if (formulas.length >= 7) return; // Limit to 7 formulas
    setFormulas([...formulas, { 
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5), 
      expression: expr, 
      color: COLORS[formulas.length % COLORS.length] 
    }]);
  };

  const updateFormula = (id: string, expression: string) => {
    setFormulas(formulas.map(f => f.id === id ? { ...f, expression } : f));
  };

  const updateFormulaColor = (id: string, color: string) => {
    setFormulas(formulas.map(f => f.id === id ? { ...f, color } : f));
  };

  const removeFormula = (id: string) => {
    if (formulas.length <= 1) return;
    setFormulas(formulas.filter(f => f.id !== id));
    setHiddenFormulas(hiddenFormulas.filter(hiddenId => hiddenId !== id));
  };

  const toggleVisibility = (id: string) => {
    setHiddenFormulas(prev => 
      prev.includes(id) ? prev.filter(hiddenId => hiddenId !== id) : [...prev, id]
    );
  };

  const loadExample = (expr: string) => {
    if (formulas.length === 1 && formulas[0].expression === 'y = 17e-0,2x') {
      updateFormula(formulas[0].id, expr);
    } else {
      addFormula(expr);
    }
  };

  const exportExcel = () => {
    const visibleFormulas = formulas.filter(f => !hiddenFormulas.includes(f.id));
    
    // Prepare data with proper headers
    const exportData = data.map(row => {
      const rowData: any = { x: row.x };
      visibleFormulas.forEach((f) => {
        const header = `f${formulas.indexOf(f)+1}(x): ${f.expression}`;
        rowData[header] = row[f.id] !== undefined && row[f.id] !== null ? row[f.id] : 'NaN';
      });
      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    const filename = chartTitle ? chartTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'formula_data';
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2, // Higher resolution
      });
      const link = document.createElement("a");
      link.setAttribute("href", dataUrl);
      const filename = chartTitle ? chartTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'formula_chart';
      link.setAttribute("download", `${filename}.png`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export PNG", err);
    }
  };

  const { data, compiledFormulas } = useMemo(() => {
    const compiled = formulas.map(f => {
      const { fn, error, parsed } = compileFormula(f.expression);
      return { ...f, fn, error, parsed };
    });

    const dataPoints = [];
    const safeStep = Math.max(0.001, step); // Prevent infinite loops
    const safeStart = Math.min(xStart, xEnd);
    const safeEnd = Math.max(xStart, xEnd);

    for (let x = safeStart; x <= safeEnd; x += safeStep) {
      // Round x to avoid floating point precision issues in display
      const roundedX = Math.round(x * 1000) / 1000;
      const pt: any = { x: roundedX };
      
      compiled.forEach(c => {
        if (c.fn && !c.error) {
          const y = c.fn(roundedX);
          pt[c.id] = isNaN(y) ? null : Number(y.toFixed(4));
        }
      });
      
      dataPoints.push(pt);
    }

    return { data: dataPoints, compiledFormulas: compiled };
  }, [formulas, xStart, xEnd, step]);

  const hasErrors = compiledFormulas.some(c => c.error);
  const allErrors = compiledFormulas.filter(c => c.error).map(c => c.error);

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
            onClick={exportExcel}
            className="text-sm font-medium text-neutral-600 hover:text-blue-600 flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
            title="Export Data as Excel"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden lg:inline">Excel</span>
          </button>
        </div>
      </header>

      {/* Controls Toolbar */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex flex-col md:flex-row gap-6 shrink-0 text-sm z-10 shadow-sm overflow-y-auto max-h-64">
        {/* Formulas List */}
        <div className="flex-1 space-y-2 min-w-[300px]">
          {compiledFormulas.map((c, index) => {
            const isHidden = hiddenFormulas.includes(c.id);
            return (
              <div key={c.id} className={`flex items-center gap-2 transition-opacity ${isHidden ? 'opacity-60' : 'opacity-100'}`}>
                <input
                  type="color"
                  value={c.color}
                  onChange={(e) => updateFormulaColor(c.id, e.target.value)}
                  disabled={isHidden}
                  className="w-4 h-4 p-0 border-0 rounded-full cursor-pointer shrink-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none [&::-moz-color-swatch]:rounded-full"
                  style={{ opacity: isHidden ? 0.5 : 1 }}
                  title="Change color"
                />
                <span className="font-medium text-neutral-500 italic hidden sm:inline w-12">f{index + 1}(x) =</span>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={c.expression}
                    onChange={(e) => updateFormula(c.id, e.target.value)}
                    className={`w-full px-3 py-1.5 border ${c.error ? 'border-red-300 focus:ring-red-500' : 'border-neutral-300 focus:ring-blue-500'} rounded-md focus:ring-2 outline-none font-mono text-sm pr-8`}
                    placeholder="e.g. 17e-0,2x"
                  />
                  {c.error && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500" title={c.error}>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => toggleVisibility(c.id)} 
                  className="p-1.5 text-neutral-400 hover:text-blue-600 rounded-md transition-colors" 
                  title={isHidden ? "Show formula" : "Hide formula"}
                >
                  {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {formulas.length > 1 && (
                  <button onClick={() => removeFormula(c.id)} className="p-1.5 text-neutral-400 hover:text-red-500 rounded-md transition-colors" title="Remove formula">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
          
          <div className="flex flex-wrap items-center gap-3 pl-0 sm:pl-16 pt-1">
            <button 
              onClick={() => addFormula()} 
              disabled={formulas.length >= 7}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Formula
            </button>
            
            <div className="w-px h-4 bg-neutral-300 hidden sm:block"></div>
            
            <button
              onClick={saveFormulas}
              title="Save all valid formulas to history"
              className="text-xs font-medium text-neutral-600 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save to History
            </button>

            {savedFormulas.length > 0 && (
              <div className="flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-neutral-400" />
                <select
                  onChange={(e) => {
                    if (e.target.value) addFormula(e.target.value);
                    e.target.value = "";
                  }}
                  className="w-28 px-1 py-1 bg-transparent border-none text-neutral-600 outline-none cursor-pointer text-xs"
                  value=""
                >
                  <option value="" disabled>Load from history...</option>
                  {savedFormulas.map((f, i) => (
                    <option key={i} value={f}>{f}</option>
                  ))}
                </select>
                <button onClick={clearHistory} title="Clear History" className="p-1 text-neutral-400 hover:text-red-500">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* X and Step Controls */}
        <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-neutral-200 pt-3 md:pt-0 md:pl-6 shrink-0">
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-md border border-neutral-200">
            <span className="text-neutral-500 font-medium w-10">X Axis:</span>
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
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-md border border-neutral-200">
            <span className="text-neutral-500 font-medium w-10">Step:</span>
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
            <button onClick={() => loadExample('y = 17e-0,2x')} className="whitespace-nowrap px-3 py-1 bg-white rounded border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-xs transition-colors">y = 17e-0,2x</button>
            <button onClick={() => loadExample('y = -1E-02x3 + 0,31x2 - 0,13x + 12')} className="whitespace-nowrap px-3 py-1 bg-white rounded border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-xs transition-colors">y = -1E-02x3 + 0,31x2 - 0,13x + 12</button>
            <button onClick={() => loadExample('y = 7e-1E-03x')} className="whitespace-nowrap px-3 py-1 bg-white rounded border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-xs transition-colors">y = 7e-1E-03x</button>
            <button onClick={() => loadExample('y = -2,5ln(x) + 14,45')} className="whitespace-nowrap px-3 py-1 bg-white rounded border border-blue-200 hover:border-blue-400 text-blue-700 font-mono text-xs transition-colors">y = -2,5ln(x) + 14,45</button>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0">
        {/* Chart Area */}
        <div className="flex-1 flex flex-col p-4 relative bg-neutral-50">
          <div className="flex-1 bg-white rounded-xl border border-neutral-200 shadow-sm p-4 flex flex-col min-h-0 relative" ref={chartRef}>
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
                  formatter={(value: number, name: string) => {
                    const formula = compiledFormulas.find(c => c.id === name);
                    return [value.toFixed(4), formula ? `f${compiledFormulas.indexOf(formula) + 1}(x)` : name];
                  }}
                  labelFormatter={(label: number) => `x = ${label}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  iconType="circle" 
                  formatter={(value, entry, index) => {
                    const formula = compiledFormulas.find(c => c.id === value);
                    const isHidden = hiddenFormulas.includes(value);
                    return <span className={`font-medium cursor-pointer transition-colors ${isHidden ? 'text-neutral-400 line-through' : 'text-neutral-600'}`}>f{formula ? compiledFormulas.indexOf(formula) + 1 : index + 1}(x)</span>;
                  }} 
                  onClick={(e) => {
                    if (e.dataKey && typeof e.dataKey === 'string') {
                      toggleVisibility(e.dataKey);
                    }
                  }}
                />
                
                {compiledFormulas.map((c, i) => (
                  c.fn && !c.error && !hiddenFormulas.includes(c.id) && (
                    <Line 
                      key={c.id}
                      type="monotone" 
                      dataKey={c.id} 
                      name={c.id}
                      stroke={c.color} 
                      strokeWidth={2.5} 
                      dot={data.length < 50 ? { r: 3, fill: c.color, strokeWidth: 0 } : false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      animationDuration={300}
                    />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table Sidebar */}
        <div className="w-80 bg-white border-l border-neutral-200 flex flex-col shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10">
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
                  {formulas.map((f, i) => {
                    if (hiddenFormulas.includes(f.id)) return null;
                    return (
                      <th key={f.id} className="px-4 py-2 font-medium border-b border-neutral-200" style={{ color: f.color }}>
                        f{i + 1}(y)
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.map((point, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-2 font-mono text-neutral-500 text-xs">{point.x}</td>
                    {formulas.map(f => {
                      if (hiddenFormulas.includes(f.id)) return null;
                      return (
                        <td key={f.id} className="px-4 py-2 font-mono font-medium text-neutral-700 text-xs">
                          {point[f.id] !== undefined && point[f.id] !== null ? point[f.id] : 'NaN'}
                        </td>
                      );
                    })}
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

