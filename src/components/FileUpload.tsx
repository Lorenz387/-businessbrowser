import { useState, useRef } from 'react';
import { Paperclip, X, FileText, Image, FileSpreadsheet, File } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  selectedFile: File | null;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="w-3.5 h-3.5" />;
  if (mimeType.includes('pdf')) return <FileText className="w-3.5 h-3.5" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('xlsx'))
    return <FileSpreadsheet className="w-3.5 h-3.5" />;
  return <File className="w-3.5 h-3.5" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ onFileSelect, onFileClear, selectedFile }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  if (selectedFile) {
    return (
      <div className="flex items-center gap-2 glass rounded-lg px-3 py-2 text-sm border border-violet-500/30 animate-fade-in">
        <span className="text-violet-400">{getFileIcon(selectedFile.type)}</span>
        <span className="text-slate-300 truncate max-w-[140px]">{selectedFile.name}</span>
        <span className="text-slate-600 text-xs flex-shrink-0">{formatFileSize(selectedFile.size)}</span>
        <button
          onClick={onFileClear}
          className="text-slate-500 hover:text-slate-200 transition-colors ml-1 flex-shrink-0"
          title="Datei entfernen"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.txt,.md"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
          isDragging
            ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
            : 'border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:border-white/20'
        }`}
        title="Datei hochladen (PDF, Word, Excel, Bild, Text)"
      >
        <Paperclip className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Datei</span>
      </button>
    </>
  );
}

export default FileUpload;
