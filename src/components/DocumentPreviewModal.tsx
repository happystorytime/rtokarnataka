import React, { useState } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut, FileText, AlertTriangle, Calendar, User, Car } from 'lucide-react';
import { DocumentItem, DOCUMENT_CATEGORY_LABELS } from '../types';
import { api } from '../api';

interface DocumentPreviewModalProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ document: doc, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!doc) return null;

  const fileUrl = api.getDocumentFileUrl(doc.id, false);
  const downloadUrl = api.getDocumentFileUrl(doc.id, true);
  const isPdf = doc.mime_type === 'application/pdf' || doc.file_name.toLowerCase().endsWith('.pdf');
  const isImage = doc.mime_type.startsWith('image/');

  const handlePrint = () => {
    window.print();
  };

  const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="flex flex-col w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white truncate">{doc.title}</h3>
              <p className="text-xs text-slate-400 truncate">
                {DOCUMENT_CATEGORY_LABELS[doc.category] || doc.category} • {doc.original_name} ({(doc.file_size / 1024).toFixed(1)} KB)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isImage && (
              <>
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={handlePrint}
              title="Print Document"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <a
              href={downloadUrl}
              download={doc.original_name}
              title="Download Document"
              className="p-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2 bg-slate-950 border-b border-slate-800/80 text-xs text-slate-300 shrink-0">
          {doc.client_name && (
            <div className="flex items-center gap-1 text-slate-400">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Client: <strong className="text-slate-200">{doc.client_name}</strong></span>
            </div>
          )}
          {doc.vehicle_reg && (
            <div className="flex items-center gap-1 text-slate-400">
              <Car className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vehicle: <strong className="text-slate-200">{doc.vehicle_reg}</strong></span>
            </div>
          )}
          {doc.case_number && (
            <div className="flex items-center gap-1 text-slate-400">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Case: <strong className="text-slate-200">{doc.case_number}</strong></span>
            </div>
          )}
          {doc.expiry_date && (
            <div className={`flex items-center gap-1 ${isExpired ? 'text-rose-400 font-semibold' : 'text-amber-400'}`}>
              {isExpired ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> : <Calendar className="w-3.5 h-3.5" />}
              <span>{isExpired ? 'EXPIRED ON: ' : 'Expires: '} {doc.expiry_date}</span>
            </div>
          )}
        </div>

        {/* Content Preview Container */}
        <div className="relative flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-2 sm:p-4">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={doc.title}
              className="w-full h-full rounded-xl border border-slate-800 bg-white"
            />
          ) : isImage ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center">
              <img
                src={fileUrl}
                alt={doc.title}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out'
                }}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg select-none"
              />
            </div>
          ) : (
            <div className="text-center p-8 text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-3 text-slate-600" />
              <p className="text-sm font-medium text-slate-300">File preview not directly supported in browser</p>
              <a
                href={downloadUrl}
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-semibold transition-all"
              >
                <Download className="w-4 h-4" /> Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
