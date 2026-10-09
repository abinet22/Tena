import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, ShieldAlert, Cpu,
  RefreshCw, Check, Clock, AlertTriangle
} from 'lucide-react';
import {
  Product, Batch, StockBalance, Category
} from '../types/pharmacy';
import { runStockEngineTests, TestCaseResult } from '../utils/stockEngine';

interface StockEngineTestsViewProps {
  products: Product[];
  batches: Batch[];
  balances: StockBalance[];
  categories: Category[];
  onResultsUpdate?: (summary: { passed: number; total: number; failed: number }) => void;
}

export const StockEngineTestsView: React.FC<StockEngineTestsViewProps> = ({
  products,
  batches,
  balances,
  categories,
  onResultsUpdate,
}) => {
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runStockEngineTests(products, batches, balances, categories);
      setTestResults(results);
      setIsRunning(false);
      setLastRunTime(new Date().toLocaleTimeString());

      const passed = results.filter((t) => t.passed).length;
      const total = results.length;
      const failed = total - passed;
      if (onResultsUpdate) {
        onResultsUpdate({ passed, total, failed });
      }
    }, 250);
  };

  useEffect(() => {
    executeTests();
  }, [products, batches, balances, categories]);

  const passedCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;
  const failedCount = totalCount - passedCount;
  const allPassed = passedCount === totalCount && totalCount > 0;

  // Failing specs are expanded at TOP in red
  const sortedResults = [...testResults].sort((a, b) => {
    if (!a.passed && b.passed) return -1;
    if (a.passed && !b.passed) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Test Runner Hero Banner: Red if any test fails, Dark Slate/Emerald if all pass */}
      <div
        className={`p-6 rounded-2xl shadow-md border transition-colors ${
          allPassed
            ? 'bg-slate-900 text-white border-slate-800'
            : 'bg-rose-950 text-white border-rose-800 ring-2 ring-rose-500/30'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                allPassed
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
              }`}
            >
              {allPassed ? <Cpu className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6 text-rose-300" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">Automated Stock Engine & FEFO Test Suite</h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    allPassed
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-rose-900 text-rose-100 border-rose-600 font-extrabold animate-pulse'
                  }`}
                >
                  {allPassed ? `${passedCount}/${totalCount} Automated Specs Passed` : `CRITICAL: ${failedCount} Failed (${passedCount}/${totalCount})`}
                </span>
              </div>
              <p className={`text-xs mt-1 max-w-2xl ${allPassed ? 'text-slate-400' : 'text-rose-200'}`}>
                {allPassed
                  ? 'Validates PostgreSQL Row-Level Security (RLS) isolation, FEFO batch allocations, expired batch blocking, category flag rules, multi-tier unit conversions, and Cashier privacy.'
                  : `Regression detected in stock engine calculations! ${failedCount} test specification(s) failed. Examine details below.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastRunTime && (
              <span className={`text-xs flex items-center gap-1 font-mono ${allPassed ? 'text-slate-400' : 'text-rose-300'}`}>
                <Clock className="w-3.5 h-3.5" />
                Ran at {lastRunTime}
              </span>
            )}
            <button
              onClick={executeTests}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-2 text-white font-bold rounded-xl text-xs transition-colors shadow-xs disabled:opacity-50 cursor-pointer ${
                allPassed ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Running Engine Specs...' : 'Re-Run Test Suite'}</span>
            </button>
          </div>
        </div>

        {/* Scorecard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className={`${allPassed ? 'bg-slate-800/60 border-slate-700' : 'bg-rose-900/60 border-rose-800'} p-3 rounded-xl border`}>
            <span className="text-slate-300 block text-xs">Total Executed Tests</span>
            <span className="text-xl font-bold text-white mt-1 block">{totalCount} Specs</span>
          </div>
          <div className={`${allPassed ? 'bg-slate-800/60 border-slate-700' : 'bg-rose-900/60 border-rose-800'} p-3 rounded-xl border`}>
            <span className="text-slate-300 block text-xs">Passed Verification</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{passedCount} Passed</span>
          </div>
          <div className={`${allPassed ? 'bg-slate-800/60 border-slate-700' : 'bg-rose-900/60 border-rose-800'} p-3 rounded-xl border`}>
            <span className="text-slate-300 block text-xs">Failed Regressions</span>
            <span className={`text-xl font-bold mt-1 block ${failedCount > 0 ? 'text-rose-300 font-extrabold' : 'text-slate-400'}`}>
              {failedCount} Failed
            </span>
          </div>
          <div className={`${allPassed ? 'bg-slate-800/60 border-slate-700' : 'bg-rose-900/60 border-rose-800'} p-3 rounded-xl border`}>
            <span className="text-slate-300 block text-xs">Engine Status</span>
            <span className={`text-xl font-bold mt-1 block flex items-center gap-1.5 ${allPassed ? 'text-emerald-400' : 'text-rose-300'}`}>
              {allPassed ? (
                <>
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>{Math.round((passedCount / (totalCount || 1)) * 100)}% Compliant</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span>{Math.round((passedCount / (totalCount || 1)) * 100)}% Compliant ({failedCount} Failing)</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Test Results Breakdown: Failing specs sorted to TOP in RED */}
      <div className="space-y-3">
        {sortedResults.map((test) => (
          <div
            key={test.id}
            className={`p-4 rounded-xl border transition-all ${
              test.passed
                ? 'bg-white border-slate-200 shadow-2xs hover:border-emerald-300'
                : 'bg-rose-50/90 border-2 border-rose-400 shadow-md ring-2 ring-rose-400/20'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {test.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-bold text-sm ${test.passed ? 'text-slate-900' : 'text-rose-950 font-extrabold'}`}>
                      {test.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700">
                      {test.category}
                    </span>
                    {!test.passed && (
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-rose-200 text-rose-900 border border-rose-300">
                        FAILING SPEC
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${test.passed ? 'text-slate-500' : 'text-rose-800 font-medium'}`}>
                    {test.details}
                  </p>
                </div>
              </div>

              <span
                className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                  test.passed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-600 text-white shadow-xs font-extrabold'
                }`}
              >
                {test.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>

            {/* Test Assertions Comparison Box: Always open and expanded in red for failing specs */}
            <div
              className={`mt-3 pt-3 border-t grid grid-cols-1 md:grid-cols-2 gap-3 text-xs p-3 rounded-lg font-mono ${
                test.passed
                  ? 'border-slate-100 bg-slate-50/80'
                  : 'border-rose-200 bg-rose-100/70 text-rose-950 font-bold'
              }`}
            >
              <div>
                <span className="text-slate-600 font-sans block text-xs uppercase font-bold tracking-wider mb-1">
                  Expected Specification:
                </span>
                <span className="text-slate-900 break-words">{test.expected}</span>
              </div>
              <div>
                <span className="text-slate-600 font-sans block text-xs uppercase font-bold tracking-wider mb-1">
                  Actual Engine Result:
                </span>
                <span className={`break-words ${test.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-extrabold'}`}>
                  {test.actual}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
