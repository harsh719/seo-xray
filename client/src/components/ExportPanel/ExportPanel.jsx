import React from 'react';
import useAuditStore from '../../store/audit-store';
import { getExportJsonUrl } from '../../utils/api';
import { Download, FileSpreadsheet, FileText, FileJson } from 'lucide-react';

export default function ExportPanel() {
  const auditId = useAuditStore(s => s.auditId);

  if (!auditId) return null;

  return (
    <div className="flex items-center gap-2">
      <a
        href={getExportJsonUrl(auditId)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition"
        title="Download JSON"
      >
        <FileJson className="w-4 h-4" />
        <span className="hidden sm:inline">JSON</span>
      </a>
      <button
        onClick={() => alert('XLSX export coming soon')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition"
        title="Download XLSX"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span className="hidden sm:inline">XLSX</span>
      </button>
      <button
        onClick={() => alert('DOCX export coming soon')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition"
        title="Download DOCX"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">DOCX</span>
      </button>
    </div>
  );
}
