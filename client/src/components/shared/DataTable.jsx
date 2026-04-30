import React, { useState, useMemo, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Download, CheckSquare, Square, MinusSquare } from 'lucide-react';

function exportToCSV(columns, rows, filename = 'export.csv') {
  const headers = columns.map(c => c.label).join(',');
  const csvRows = rows.map(row =>
    columns.map(c => {
      const val = row[c.key];
      const str = Array.isArray(val) ? val.join('; ') : String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  const blob = new Blob([headers + '\n' + csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DataTable({
  columns,
  data,
  defaultSort,
  pageSize = 25,
  selectable = false,
  exportFilename = 'export.csv',
  regexFilter = false,
}) {
  const [sortKey, setSortKey] = useState(defaultSort?.key || '');
  const [sortDir, setSortDir] = useState(defaultSort?.dir || 'desc');
  const [search, setSearch] = useState('');
  const [regexSearch, setRegexSearch] = useState('');
  const [regexError, setRegexError] = useState('');
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(new Set());

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let items = [...(data || [])];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(row =>
        columns.some(col => {
          const val = row[col.key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }
    // Regex filter (applied on keyword column)
    if (regexFilter && regexSearch) {
      try {
        const rx = new RegExp(regexSearch, 'i');
        setRegexError('');
        items = items.filter(row => {
          const kw = row.keyword || '';
          return rx.test(kw);
        });
      } catch (e) {
        setRegexError('Invalid regex');
      }
    }
    for (const [key, val] of Object.entries(filters)) {
      if (val) {
        items = items.filter(row => String(row[key]).toLowerCase().includes(val.toLowerCase()));
      }
    }
    return items;
  }, [data, search, regexSearch, filters, columns, regexFilter]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  // Selection helpers
  const allPageSelected = selectable && paged.length > 0 && paged.every((_, i) => selected.has(page * pageSize + i));
  const somePageSelected = selectable && paged.some((_, i) => selected.has(page * pageSize + i));

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        paged.forEach((_, i) => next.delete(page * pageSize + i));
      } else {
        paged.forEach((_, i) => next.add(page * pageSize + i));
      }
      return next;
    });
  }, [allPageSelected, paged, page, pageSize]);

  const toggleRow = useCallback((globalIndex) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(globalIndex) ? next.delete(globalIndex) : next.add(globalIndex);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelected(new Set(sorted.map((_, i) => i)));
  }, [sorted]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const handleExport = useCallback(() => {
    const exportCols = columns.filter(c => c.key !== '__select');
    if (selected.size > 0) {
      const selectedRows = sorted.filter((_, i) => selected.has(i));
      exportToCSV(exportCols, selectedRows, exportFilename);
    } else {
      exportToCSV(exportCols, sorted, exportFilename);
    }
  }, [columns, sorted, selected, exportFilename]);

  return (
    <div>
      {/* Search + Actions Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
          />
        </div>
        {regexFilter && (
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">/</span>
            <input
              type="text"
              value={regexSearch}
              onChange={e => { setRegexSearch(e.target.value); setPage(0); }}
              placeholder="regex filter on keyword..."
              className={`w-full bg-slate-900 border rounded-lg pl-6 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition font-mono ${
                regexError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-brand-500'
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">/i</span>
          </div>
        )}
        <span className="text-xs text-slate-500">{sorted.length} results</span>
        {selectable && (
          <div className="flex items-center gap-2 ml-auto">
            {selected.size > 0 && (
              <>
                <span className="text-xs text-brand-400">{selected.size} selected</span>
                <button onClick={selectAllFiltered} className="text-xs text-slate-400 hover:text-white transition">Select all {sorted.length}</button>
                <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-white transition">Clear</button>
              </>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              {selected.size > 0 ? `Export ${selected.size}` : 'Export CSV'}
            </button>
          </div>
        )}
      </div>
      {regexError && <p className="text-xs text-rose-400 mb-2">{regexError}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/80">
              {selectable && (
                <th className="px-3 py-3 w-10">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-white">
                    {allPageSelected ? <CheckSquare className="w-4 h-4 text-brand-400" /> :
                     somePageSelected ? <MinusSquare className="w-4 h-4 text-brand-400" /> :
                     <Square className="w-4 h-4" />}
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-3 text-left font-medium text-slate-400 whitespace-nowrap ${
                    col.sortable !== false ? 'cursor-pointer hover:text-white select-none' : ''
                  } ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {col.sortable !== false && (
                      sortKey === col.key
                        ? sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        : <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">No data available</td></tr>
            ) : (
              paged.map((row, i) => {
                const globalIndex = page * pageSize + i;
                const isSelected = selected.has(globalIndex);
                return (
                  <tr
                    key={i}
                    className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-brand-500/10' : ''}`}
                    onClick={selectable ? () => toggleRow(globalIndex) : undefined}
                    style={selectable ? { cursor: 'pointer' } : undefined}
                  >
                    {selectable && (
                      <td className="px-3 py-2.5">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-brand-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={col.key} className={`px-4 py-2.5 text-slate-300 ${col.align === 'right' ? 'text-right font-mono' : ''} ${col.className || ''}`}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { exportToCSV };
export default DataTable;
