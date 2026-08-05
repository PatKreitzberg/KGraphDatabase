import React, { useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, FileCode } from 'lucide-react';
import { parseKGraphText } from '../lib/parser';
import { TextParseResult } from '../types';

interface TextBlockEditorProps {
  onParsedSubmit: (result: TextParseResult) => void;
}

const SCAFFOLD_TEXT_BLOCK = `# Vertices

# Color One Edges

# Color Two Edges

# Commuting Squares

# Properties
`;

const SAMPLE_TEXT_BLOCK = `# Vertices
v0 v1 v2 v3

# Color One Edges
e0 v0 v1
e1 v2 v3

# Color Two Edges
e2 v0 v2
e3 v1 v3

# Commuting Squares
e0 e3 ~ e2 e1

# Properties
Name: Example 2-Graph Square
Paper: ArXiv 2026 Topology Studies
Homology groups: H0=0, H1=\\mathbb{Z}, H2=\\mathbb{Z}^2
`;

export const TextBlockEditor: React.FC<TextBlockEditorProps> = ({ onParsedSubmit }) => {
  const [rawText, setRawText] = useState<string>(SCAFFOLD_TEXT_BLOCK);
  const [showExample, setShowExample] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<TextParseResult | null>(null);

  // Live validation on text change
  useEffect(() => {
    if (!rawText.trim()) {
      setParseResult(null);
      return;
    }
    const res = parseKGraphText(rawText);
    setParseResult(res);
  }, [rawText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setRawText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (content) {
          setRawText(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = parseKGraphText(rawText);
    if (res.success && res.graph) {
      onParsedSubmit(res);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 font-sans">
      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border border-black bg-neutral-50 p-6 text-center transition-colors cursor-pointer relative hover:bg-neutral-100"
      >
        <input
          type="file"
          accept=".txt,.text"
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <Upload className="w-5 h-5 text-black" />
          <p className="text-xs font-bold uppercase tracking-widest text-black">
            Upload .txt block file or drag &amp; drop here
          </p>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            Supports standard k-graph block file format (# Vertices, # Color Edges, # Commuting Squares)
          </p>
        </div>
      </div>

      {/* Immutable Example Reference Box */}
      {showExample && (
        <div className="border border-black bg-[#fafafa] p-4 space-y-3 font-mono text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <span className="font-bold uppercase tracking-wider text-black text-xs flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-black" />
              Immutable Example Reference
            </span>
            <button
              type="button"
              onClick={() => setShowExample(false)}
              className="text-xs font-bold uppercase tracking-wider border border-black bg-white px-3 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              Close Example ✕
            </button>
          </div>
          <pre className="bg-black text-white p-4 text-[11px] leading-relaxed overflow-x-auto select-text font-mono border border-black rounded-none">
            <code>{SAMPLE_TEXT_BLOCK}</code>
          </pre>
        </div>
      )}

      {/* Manual Textarea */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-widest text-black flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-black" />
            Manual Format Entry
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExample(!showExample)}
              className="text-xs font-bold uppercase tracking-wider border border-black bg-white px-3 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              {showExample ? 'Close Example' : 'See Example'}
            </button>
            <button
              type="button"
              onClick={() => setRawText(SCAFFOLD_TEXT_BLOCK)}
              className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 hover:text-black underline cursor-pointer"
            >
              Reset to Headers Only
            </button>
          </div>
        </div>

        <textarea
          rows={12}
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder="# Vertices&#10;v0 v1 v2&#10;# Color One Edges&#10;e0 v0 v1..."
          className="w-full font-mono text-[11px] border border-black p-4 bg-white focus:border-black focus:outline-none leading-relaxed rounded-none transition-colors"
        />
      </div>

      {/* Parse Feedback Banner */}
      {parseResult && (
        <div className="space-y-3 font-mono text-xs">
          {parseResult.errors.length > 0 ? (
            <div className="border border-red-600 bg-red-50 p-4 text-red-900">
              <div className="flex items-center gap-2 font-bold mb-1 uppercase text-xs">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Parse Errors Found ({parseResult.errors.length}):
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                {parseResult.errors.map((err, idx) => (
                  <li key={idx}>
                    {err.line ? `Line ${err.line}: ` : ''}{err.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="border border-black bg-neutral-100 p-4 text-black">
              <div className="flex items-center gap-2 font-bold text-xs mb-1 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-black" />
                Block parsed successfully!
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-neutral-600 mt-2 font-mono">
                <div>Colors (k): <span className="font-bold text-black">{parseResult.graph?.k}</span></div>
                <div>Vertices: <span className="font-bold text-black">{parseResult.graph?.vertices.length}</span></div>
                <div>Commuting Squares: <span className="font-bold text-black">{parseResult.graph?.commuting_squares.length}</span></div>
                <div>Commuting Cubes: <span className="font-bold text-black">{parseResult.graph?.commuting_cubes.length}</span></div>
              </div>
            </div>
          )}

          {parseResult.warnings.length > 0 && (
            <div className="border border-black bg-amber-50 p-3 text-amber-900 text-[11px]">
              <div className="font-bold mb-1 uppercase tracking-wider">Warnings:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {parseResult.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={!parseResult || !parseResult.success}
          className={`w-full py-4 text-xs font-bold uppercase tracking-widest rounded-none transition-colors cursor-pointer ${
            parseResult?.success
              ? 'bg-black text-white hover:bg-neutral-800'
              : 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300'
          }`}
        >
          Proceed with Parsed Graph Data
        </button>
      </div>
    </form>
  );
};
