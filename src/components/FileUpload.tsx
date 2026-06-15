import { useState, useRef, useEffect } from 'react';
import { Paperclip, X, FileText, FileSpreadsheet, File } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  selectedFile: File | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocFileChip({ file, onClear }: { file: File; onClear: () => void }) {
  const icon = file.type.includes('pdf') ? (
    <FileText className="w-3.5 h-3.5" />
  ) : file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') ? (
    <FileSpreadsheet className="w-3.5 h-3.5" />
  ) : (
    <File className="w-3.5 h-3.5" />
  );

  return (
    <div className="flex items-center gap-2 glass rounded-lg px-3 py-2 text-sm border border-violet-500/30 animate-fade-in">
      <span className="text-violet-400">{icon}</span>
      <span className="text-slate-300 truncate max-w-[140px]">{file.name}</span>
      <span className="text-slate-600 text-xs flex-shrink-0">{formatFileSize(file.size)}</span>
      <button
        onClick={onClear}
        className="text-slate-500 hover:text-slate-200 transition-colors ml-1 flex-shrink-0"
        title="Datei entfernen"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ImagePreview({ file, onClear }: { file: File; onClear: () => void }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative inline-flex animate-fade-in group">
      {src && (
        <img
          src={src}
          alt={file.name}
          className="h-20 w-20 rounded-xl object-cover border border-violet-500/40 shadow-md shadow-violet-500/20"
        />
      )}
      {/* Overlay on hover */}
      <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-colors" />
      {/* Remove button */}
      <button
        onClick={onClear}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow-md"
        title="Bild entfernen"
      >
        <X className="w-3 h-3" />
      </button>
      {/* File size badge */}
      <span className="absolute bottom-1 left-1 right-1 text-center text-[10px] text-white/70 bg-black/50 rounded px-1 py-0.5 truncate">
        {formatFileSize(file.size)}
      </span>
    </div>
  );
}

export function FileUpload({ onFileSelect, onFileClear, selectedFile }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  // Show the selected file preview
  if (selectedFile) {
    if (selectedFile.type.startsWith('image/')) {
      return <ImagePreview file={selectedFile} onClear={onFileClear} />;
    }
    return <DocFileChip file={selectedFile} onClear={onFileClear} />;
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.gif,.txt,.md"
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
        title="Bild oder Dokument hochladen"
      >
        <Paperclip className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Datei</span>
      </button>
    </>
  );
}

export default FileUpload;
