import React, { useState, useEffect, useMemo } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, FileCode, Layers } from 'lucide-react';
import { parseKGraphText } from '../lib/parser';
import { TextParseResult } from '../types';

interface TextBlockEditorProps {
  onParsedSubmit: (result: TextParseResult) => void;
  onDirty?: () => void;
}

const SCAFFOLD_TEXT_BLOCK = `# Vertices

# Color One Edges

# Color Two Edges

# Commuting Squares
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
`;

export const TextBlockEditor: React.FC<TextBlockEditorProps> = ({ onParsedSubmit, onDirty }) => {
  const [k, setK] = useState<number>(2);
  const [kInput, setKInput] = useState<string>('2');
  const [verticesText, setVerticesText] = useState<string>('');
  const [edgesText, setEdgesText] = useState<Record<number, string>>({});
  const [squaresText, setSquaresText] = useState<string>('');
  const [cubesText, setCubesText] = useState<string>('');

  const [showExample, setShowExample] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<TextParseResult | null>(null);

  const combinedText = useMemo(() => {
    let text = `# Vertices\n${verticesText.trim()}\n\n`;
    for (let i = 1; i <= k; i++) {
      text += `# Color ${i} Edges\n${(edgesText[i] || '').trim()}\n\n`;
    }
    text += `# Commuting Squares\n${squaresText.trim()}\n\n`;
    if (k > 2) {
      text += `# Commuting Cubes\n${cubesText.trim()}\n\n`;
    }
    return text;
  }, [k, verticesText, edgesText, squaresText, cubesText]);

  // Live validation on combined text change
  useEffect(() => {
    const isEmpty = !verticesText.trim() && !Object.values(edgesText).some(v => v.trim()) && !squaresText.trim() && !cubesText.trim();
    if (isEmpty) {
      setParseResult(null);
      return;
    }
    const res = parseKGraphText(combinedText);
    setParseResult(res);
  }, [combinedText]);

  const loadFromTextBlock = (content: string) => {
    const lines = content.split(/\r?\n/);
    let currentSection = '';
    let maxColorIdx = 2;
    let currentColorIdx = 1;
    const vLines: string[] = [];
    const eLines: Record<number, string[]> = {};
    const sqLines: string[] = [];
    const cbLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        const headerText = trimmed.replace(/^#+\s*/, '').trim().toLowerCase();
        if (headerText.includes('vertic')) {
          currentSection = 'vertices';
        } else if (headerText.includes('square')) {
          currentSection = 'squares';
        } else if (headerText.includes('cube')) {
          currentSection = 'cubes';
        } else if (headerText.includes('propert')) {
          currentSection = 'properties';
        } else if (headerText.includes('color') || headerText.includes('edge')) {
          currentSection = 'edges';
          const matchNumber = headerText.match(/color\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
          if (matchNumber) {
            const rawNum = matchNumber[1].toLowerCase();
            const wordToNum: Record<string, number> = {
              one: 1, two: 2, three: 3, four: 4, five: 5,
              six: 6, seven: 7, eight: 8, nine: 9, ten: 10
            };
            const colorNum = wordToNum[rawNum] || parseInt(rawNum, 10) || 1;
            currentColorIdx = colorNum;
            maxColorIdx = Math.max(maxColorIdx, colorNum);
          } else {
            currentColorIdx = maxColorIdx;
          }
          if (!eLines[currentColorIdx]) eLines[currentColorIdx] = [];
        }
        continue;
      }
      if (!trimmed) continue;
      if (currentSection === 'vertices') vLines.push(line);
      else if (currentSection === 'edges') {
        if (!eLines[currentColorIdx]) eLines[currentColorIdx] = [];
        eLines[currentColorIdx].push(line);
      }
      else if (currentSection === 'squares') sqLines.push(line);
      else if (currentSection === 'cubes') {
        cbLines.push(line);
        maxColorIdx = Math.max(maxColorIdx, 3);
      }
    }

    setK(maxColorIdx);
    setKInput(String(maxColorIdx));
    setVerticesText(vLines.join('\n'));
    const newEdges: Record<number, string> = {};
    for (const idx in eLines) {
      newEdges[Number(idx)] = eLines[idx].join('\n');
    }
    setEdgesText(newEdges);
    setSquaresText(sqLines.join('\n'));
    setCubesText(cbLines.join('\n'));
    onDirty?.();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        loadFromTextBlock(content);
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
          loadFromTextBlock(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = parseKGraphText(combinedText);
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  loadFromTextBlock(SAMPLE_TEXT_BLOCK);
                  setShowExample(false);
                }}
                className="text-xs font-bold uppercase tracking-wider border border-black bg-black text-white px-3 py-1 hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Insert Example Data
              </button>
              <button
                type="button"
                onClick={() => setShowExample(false)}
                className="text-xs font-bold uppercase tracking-wider border border-black bg-white px-3 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                Close ✕
              </button>
            </div>
          </div>
          <pre className="bg-black text-white p-4 text-[11px] leading-relaxed overflow-x-auto select-text font-mono border border-black rounded-none">
            <code>{SAMPLE_TEXT_BLOCK}</code>
          </pre>
        </div>
      )}

      {/* Config Bar for Number of Colors (k) */}
      <div className="border border-black bg-[#fafafa] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-black mb-1 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-black" />
              NUMBER OF COLORS (k)
            </label>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
              Controls dynamic immutable header sections for edge colors and commuting cubes.
            </p>
          </div>
          <div className="w-full md:w-48">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={kInput}
              onChange={e => {
                const valStr = e.target.value.replace(/\D/g, '');
                setKInput(valStr);
                onDirty?.();
                const valNum = parseInt(valStr, 10);
                if (!isNaN(valNum) && valNum >= 1) {
                  setK(valNum);
                }
              }}
              onBlur={() => {
                if (!kInput || parseInt(kInput, 10) < 1) {
                  setK(1);
                  setKInput('1');
                }
              }}
              onFocus={e => e.target.select()}
              onMouseUp={e => e.preventDefault()}
              onClick={e => (e.target as HTMLInputElement).select()}
              className="w-full border border-black bg-white p-2.5 text-sm font-mono focus:border-black focus:outline-none rounded-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Manual Structured Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-widest text-black flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-black" />
            Structured Section Entry
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
              onClick={() => {
                setK(2);
                setKInput('2');
                setVerticesText('');
                setEdgesText({});
                setSquaresText('');
                setCubesText('');
                onDirty?.();
              }}
              className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 hover:text-black underline cursor-pointer"
            >
              Clear All Sections
            </button>
          </div>
        </div>

        {/* Vertices Section */}
        <div className="border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="bg-black text-white px-4 py-2 font-mono text-xs font-bold flex items-center justify-between border-b border-black select-none">
            <span># Vertices</span>
            <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-sans font-normal"></span>
          </div>
          <textarea
            rows={2}
            value={verticesText}
            onChange={e => { setVerticesText(e.target.value); onDirty?.(); }}
            placeholder="v0 v1 v2 v3"
            className="w-full font-mono text-[11px] p-4 border-0 focus:outline-none leading-relaxed rounded-none transition-colors bg-white text-black placeholder:text-neutral-400"
          />
        </div>

        {/* Dynamic Edge Sections for Colors 1 to k */}
        {Array.from({ length: k }, (_, idx) => idx + 1).map(c => (
          <div key={c} className="border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black text-white px-4 py-2 font-mono text-xs font-bold flex items-center justify-between border-b border-black select-none">
              <span># Color {c} Edges</span>
              <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-sans font-normal"></span>
            </div>
            <textarea
              rows={3}
              value={edgesText[c] || ''}
              onChange={e => {
                setEdgesText(prev => ({ ...prev, [c]: e.target.value }));
                onDirty?.();
              }}
              placeholder={`e${(c-1)*2} v0 v1\ne${(c-1)*2 + 1} v2 v3`}
              className="w-full font-mono text-[11px] p-4 border-0 focus:outline-none leading-relaxed rounded-none transition-colors bg-white text-black placeholder:text-neutral-400"
            />
          </div>
        ))}

        {/* Commuting Squares Section */}
        <div className="border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="bg-black text-white px-4 py-2 font-mono text-xs font-bold flex items-center justify-between border-b border-black select-none">
            <span># Commuting Squares</span>
            <span className="text-[9px] text-neutral-400 uppercase tracking-widest font-sans font-normal"></span>
          </div>
          <textarea
            rows={3}
            value={squaresText}
            onChange={e => { setSquaresText(e.target.value); onDirty?.(); }}
            placeholder="e0 e3 ~ e2 e1"
            className="w-full font-mono text-[11px] p-4 border-0 focus:outline-none leading-relaxed rounded-none transition-colors bg-white text-black placeholder:text-neutral-400"
          />
        </div>

        {/* Commuting Cubes Section (Only when k > 2) */}
        {k > 2 && (
          <div className="border border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black text-white px-4 py-2 font-mono text-xs font-bold flex items-center justify-between border-b border-black select-none">
              <span># Commuting Cubes</span>
              <span className="text-[9px] text-amber-400 uppercase tracking-widest font-sans font-bold">Required for k &gt; 2 • Immutable Header</span>
            </div>
            <textarea
              rows={3}
              value={cubesText}
              onChange={e => { setCubesText(e.target.value); onDirty?.(); }}
              placeholder="e0 e1 e2 ~ e3 e4 e5"
              className="w-full font-mono text-[11px] p-4 border-0 focus:outline-none leading-relaxed rounded-none transition-colors bg-white text-black placeholder:text-neutral-400"
            />
          </div>
        )}
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
