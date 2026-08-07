import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { HomologyRow, HomologyTerm } from '../types';
import { MathView } from './MathView';

interface HomologyEditorProps {
  initialHomology?: Record<string, string>;
  onChange: (homology: Record<string, string>) => void;
  title?: string;
  readOnly?: boolean;
}

// Convert a LaTeX string back into terms if possible, or fallback to raw
function parseLatexToRow(degree: string, latexStr: string): HomologyRow {
  if (!latexStr || latexStr.trim() === '0') {
    return { degree, terms: [{ type: 'integer', exponent: 0 }] };
  }

  const parts = latexStr.split('\\oplus').map(s => s.trim());
  const terms: HomologyTerm[] = [];
  let hasInteger = false;

  for (const part of parts) {
    // Check torsion with subscript and optional exponent e.g. \mathbb{Z}_2 or \mathbb{Z}_{12}^3
    const torMatch = part.match(/\\mathbb\{Z\}_(\{?(\d+)\}?)(\^\{?(\d+)\}?)?/);
    // Check integer with exponent e.g. \mathbb{Z}^3 or \mathbb{Z}
    const intMatch = part.match(/\\mathbb\{Z\}(\^\{?(\d+)\}?)?/);

    if (torMatch && torMatch[2]) {
      const sub = parseInt(torMatch[2], 10);
      const exp = torMatch[4] ? parseInt(torMatch[4], 10) : 1;
      terms.push({ type: 'torsion', subscript: sub, exponent: exp });
    } else if (intMatch) {
      const exp = intMatch[2] ? parseInt(intMatch[2], 10) : 1;
      terms.push({ type: 'integer', exponent: exp });
      hasInteger = true;
    } else if (part === '0') {
      // zero gets ignored here since we enforce a default structure later
    } else {
      // Fallback
      if (part !== '') {
        terms.push({ type: 'integer', exponent: 1 });
        hasInteger = true;
      }
    }
  }

  // Enforce exactly one integer term
  const finalTerms = terms.filter(t => t.type === 'torsion');
  const intTerm = terms.find(t => t.type === 'integer');
  finalTerms.unshift(intTerm || { type: 'integer', exponent: 0 });

  return { degree, terms: finalTerms };
}

function rowToLatex(row: HomologyRow): string {
  const intTerm = row.terms.find(t => t.type === 'integer');
  const torTerms = row.terms.filter(t => t.type === 'torsion');

  const rendered: string[] = [];

  if (intTerm && intTerm.exponent && intTerm.exponent > 0) {
    if (intTerm.exponent === 1) {
      rendered.push('\\mathbb{Z}');
    } else {
      rendered.push(`\\mathbb{Z}^{${intTerm.exponent}}`);
    }
  }

  for (const t of torTerms) {
    const sub = t.subscript ?? 2;
    const exp = t.exponent ?? 1;
    if (exp > 0) {
      if (exp === 1) {
        rendered.push(`\\mathbb{Z}_{${sub}}`);
      } else {
        rendered.push(`\\mathbb{Z}_{${sub}}^{${exp}}`);
      }
    }
  }

  if (rendered.length === 0) return '0';
  return rendered.join(' \\oplus ');
}

export const HomologyEditor: React.FC<HomologyEditorProps> = ({
  initialHomology,
  onChange,
  title = 'Homology Signature Editor',
  readOnly = false
}) => {
  const [rows, setRows] = useState<HomologyRow[]>(() => {
    if (initialHomology && Object.keys(initialHomology).length > 0) {
      return Object.entries(initialHomology).map(([deg, latex]: [string, string]) => parseLatexToRow(deg, latex));
    }
    return [];
  });

  useEffect(() => {
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.degree] = rowToLatex(r);
    }
    onChange(result);
  }, [rows]);

  const addRow = () => {
    const nextDegree = `H${rows.length}`;
    setRows([...rows, { degree: nextDegree, terms: [{ type: 'integer', exponent: 0 }] }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const addTorsionGroup = (rowIndex: number) => {
    const updated = [...rows];
    updated[rowIndex].terms.push({ type: 'torsion', subscript: 2, exponent: 1 });
    setRows(updated);
  };

  const updateTermField = (rowIndex: number, termIndex: number, field: 'exponent' | 'subscript', rawVal: string | number) => {
    const updated = [...rows];
    const term = updated[rowIndex].terms[termIndex];

    const rawStr = String(rawVal).replace(/\D/g, '');
    let val = 0;
    
    // For integer exponent, we allow 0. For torsion subscript/exponent, min is 1.
    if (field === 'exponent' && term.type === 'integer') {
       val = rawStr === '' ? 0 : parseInt(rawStr, 10);
    } else {
       val = rawStr === '' ? 1 : Math.max(1, parseInt(rawStr, 10));
    }

    if (field === 'exponent') {
      term.exponent = val;
    } else if (field === 'subscript' && term.type === 'torsion') {
      term.subscript = val;
    }
    setRows(updated);
  };

  const removeTerm = (rowIndex: number, termIndex: number) => {
    const updated = [...rows];
    updated[rowIndex].terms = updated[rowIndex].terms.filter((_, i) => i !== termIndex);
    setRows(updated);
  };

  const resetRowToZero = (rowIndex: number) => {
    const updated = [...rows];
    updated[rowIndex].terms = [{ type: 'integer', exponent: 0 }];
    setRows(updated);
  };

  return (
    <div className={`font-sans space-y-4 ${title ? 'border border-black bg-white p-6 rounded-none' : ''}`}>
      <div className={`flex flex-wrap items-center gap-2 ${rows.length > 0 && title ? 'pb-3 border-b border-black' : ''} ${title ? 'justify-between' : ''}`}>
        {title && (
          <div>
            <h3 className="font-bold text-xs uppercase tracking-widest text-black">{title}</h3>
          </div>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-black bg-black text-white hover:bg-neutral-800 px-3 py-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Next Homology Group
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          {rows.map((row, rIdx) => {
            const currentLatex = rowToLatex(row);
            return (
              <div key={row.degree + rIdx} className="p-4 border border-black bg-[#fafafa]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-base min-w-[120px]">
                      <MathView math={`${row.degree} \\cong ${currentLatex}`} />
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addTorsionGroup(rIdx)}
                        className="text-[10px] font-bold uppercase tracking-widest border border-black bg-white hover:bg-black hover:text-white px-2.5 py-1 text-black transition-colors"
                      >
                        + <MathView math="\mathbb{Z}_n" />
                      </button>
                      <button
                        type="button"
                        onClick={() => resetRowToZero(rIdx)}
                        title="Set to 0"
                        className="text-[10px] border border-black hover:bg-neutral-200 p-1.5 text-black"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(rIdx)}
                        className="text-[10px] border border-black text-neutral-500 hover:text-black hover:bg-neutral-100 p-1.5 cursor-pointer"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

              {/* Term Controls */}
              {!readOnly && row.terms.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-neutral-300">
                  {/* Free term */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Free term:</span>
                    <div className="flex items-center gap-1.5 bg-white border border-black px-2 py-1 text-xs">
                      <MathView math={`\\mathbb{Z}^{${row.terms[0].exponent ?? 0}}`} />
                      <label className="text-[10px] text-neutral-500 font-mono ml-1">exp:</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={row.terms[0].exponent ?? 0}
                        onFocus={e => e.target.select()}
                        onClick={e => (e.target as HTMLInputElement).select()}
                        onChange={e => updateTermField(rIdx, 0, 'exponent', e.target.value)}
                        className="w-10 border border-black px-1 py-0.5 text-center font-mono text-xs focus:border-black focus:outline-none rounded-none"
                      />
                    </div>
                  </div>

                  {/* Torsion terms */}
                  {row.terms.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-2">Torsion terms:</span>
                      {row.terms.slice(1).map((term, tIdxOffset) => {
                        const tIdx = tIdxOffset + 1;
                        return (
                          <div
                            key={tIdx}
                            className="flex items-center gap-1.5 bg-white border border-black px-2 py-1 text-xs"
                          >
                            <MathView
                              math={`\\mathbb{Z}_{${term.subscript ?? 2}}^{${term.exponent ?? 1}}`}
                            />
                            <label className="text-[10px] text-neutral-500 font-mono ml-1">sub:</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={term.subscript ?? 2}
                              onFocus={e => e.target.select()}
                              onClick={e => (e.target as HTMLInputElement).select()}
                              onChange={e => updateTermField(rIdx, tIdx, 'subscript', e.target.value)}
                              className="w-10 border border-black px-1 py-0.5 text-center font-mono text-xs focus:border-black focus:outline-none rounded-none"
                            />
                            <label className="text-[10px] text-neutral-500 font-mono ml-1">exp:</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={term.exponent ?? 1}
                              onFocus={e => e.target.select()}
                              onClick={e => (e.target as HTMLInputElement).select()}
                              onChange={e => updateTermField(rIdx, tIdx, 'exponent', e.target.value)}
                              className="w-10 border border-black px-1 py-0.5 text-center font-mono text-xs focus:border-black focus:outline-none rounded-none"
                            />
                            <button
                              type="button"
                              onClick={() => removeTerm(rIdx, tIdx)}
                              className="text-neutral-400 hover:text-black font-bold ml-1 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
