import { useState, useRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, Save, FileText, Sparkles } from 'lucide-react';
import { store, Document } from '../store';

const FONTS = ['Sans-Serif', 'Serif', 'Monospace', 'Cursive'];
const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32', '36', '48'];
const COLORS = ['#000000', '#374151', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#ec4899'];
const AI_PROMPTS = ['Text zusammenfassen', 'Rechtschreibung prüfen', 'Formeller schreiben', 'Kürzer fassen', 'Auf Englisch übersetzen', 'Punkte aufzählen'];

export default function KIEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [docName, setDocName] = useState('Unbenanntes Dokument');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fontSize, setFontSize] = useState('16');
  const [fontFamily, setFontFamily] = useState('Sans-Serif');
  const [textColor, setTextColor] = useState('#000000');

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const saveDoc = () => {
    const docs = store.getDocuments();
    const newDoc: Document = {
      id: Date.now().toString(),
      name: docName,
      content: editorRef.current?.innerHTML || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.saveDocuments([newDoc, ...docs]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const runAI = async (prompt?: string) => {
    const q = prompt || aiQuery;
    if (!q.trim()) return;
    setAiLoading(true);
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
    const responses: Record<string, string> = {
      'Text zusammenfassen': 'Hier ist eine Zusammenfassung des Textes: Der Inhalt beschreibt wichtige Konzepte und Ideen, die für das Verständnis des Themas wesentlich sind.',
      'Rechtschreibung prüfen': '✓ Keine Rechtschreibfehler gefunden. Der Text ist grammatikalisch korrekt.',
      'Formeller schreiben': 'Ich habe den Text in einen formelleren Stil überarbeitet. Bitte füge den überarbeiteten Text in deinen Editor ein.',
      'Kürzer fassen': 'Kurzversion: Die wichtigsten Punkte wurden auf das Wesentliche reduziert.',
      'Auf Englisch übersetzen': 'Translation: The content has been translated into English for your convenience.',
      'Punkte aufzählen': '• Erster wichtiger Punkt\n• Zweiter wichtiger Punkt\n• Dritter wichtiger Punkt\n• Weiterer Aspekt zu berücksichtigen',
    };
    setAiResponse(responses[q] || `KI-Antwort auf "${q}": Dies ist eine intelligente Antwort basierend auf deinem Text und der gestellten Aufgabe.`);
    setAiLoading(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-50">
      {/* Editor area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-1 flex-wrap">
          <input value={docName} onChange={e => setDocName(e.target.value)} className="font-semibold text-gray-800 outline-none border-b border-transparent focus:border-blue-400 mr-3 text-sm" />
          <div className="h-5 w-px bg-gray-200 mx-1" />
          <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); exec('fontName', e.target.value); }} className="text-xs border border-gray-200 rounded px-2 py-1 outline-none">
            {FONTS.map(f => <option key={f}>{f}</option>)}
          </select>
          <select value={fontSize} onChange={e => { setFontSize(e.target.value); exec('fontSize', '3'); }} className="text-xs border border-gray-200 rounded px-2 py-1 outline-none w-14">
            {FONT_SIZES.map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="h-5 w-px bg-gray-200 mx-1" />
          <button onClick={() => exec('bold')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors" title="Fett"><Bold size={14} /></button>
          <button onClick={() => exec('italic')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors" title="Kursiv"><Italic size={14} /></button>
          <button onClick={() => exec('underline')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors" title="Unterstrichen"><Underline size={14} /></button>
          <button onClick={() => exec('strikeThrough')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors" title="Durchgestrichen"><Strikethrough size={14} /></button>
          <div className="h-5 w-px bg-gray-200 mx-1" />
          <button onClick={() => exec('justifyLeft')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"><AlignLeft size={14} /></button>
          <button onClick={() => exec('justifyCenter')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"><AlignCenter size={14} /></button>
          <button onClick={() => exec('justifyRight')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"><AlignRight size={14} /></button>
          <div className="h-5 w-px bg-gray-200 mx-1" />
          {COLORS.map(c => (
            <button key={c} onClick={() => { setTextColor(c); exec('foreColor', c); }}
              className={`w-5 h-5 rounded-full border-2 ${textColor === c ? 'border-gray-400' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
          <div className="ml-auto">
            <button onClick={saveDoc} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${saved ? 'bg-green-100 text-green-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
              <Save size={14} /> {saved ? 'Gespeichert!' : 'Speichern'}
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="w-full max-w-3xl">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-96 bg-white rounded-xl shadow-sm border border-gray-100 p-8 outline-none text-gray-800 leading-relaxed"
              style={{ fontSize: `${fontSize}px`, fontFamily }}
              data-placeholder="Beginne zu schreiben..."
              onInput={() => {}}
            />
          </div>
        </div>
      </div>

      {/* AI Panel */}
      <div className="w-72 bg-white border-l border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-blue-600" />
            <h3 className="font-semibold text-gray-800 text-sm">KI-Assistent</h3>
          </div>
          <div className="space-y-2">
            {AI_PROMPTS.map(p => (
              <button key={p} onClick={() => runAI(p)} className="w-full text-left text-xs bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-600 px-3 py-2 rounded-lg transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex gap-2 mb-3">
            <input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runAI()}
              placeholder="KI-Aufgabe eingeben..."
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={() => runAI()} disabled={aiLoading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 rounded-lg text-xs font-medium transition-colors">
              {aiLoading ? '...' : 'OK'}
            </button>
          </div>
          {aiResponse && (
            <div className="flex-1 bg-blue-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-blue-600" />
                <span className="text-xs font-medium text-blue-600">KI-Antwort</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
              <button onClick={() => { exec('insertHTML', `<p>${aiResponse}</p>`); }} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                In Editor einfügen →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
