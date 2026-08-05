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
    return { degree, terms: [{ type: 'zero' }] };
  }

  const parts = latexStr.split('\\oplus').map(s => s.trim());
  const terms: HomologyTerm[] = [];

  for (const part of parts) {
    // Check integer with exponent e.g. \mathbb{Z}^3 or \mathbb{Z}
    const intMatch = part.match(/\\mathbb\{Z\}(\^\{?(\d+)\}?)?/);
    // Check torsion with subscript e.g. \mathbb{Z}_2 or \mathbb{Z}_{12}
    const torMatch = part.match(/\\mathbb\{Z\}_(\{?(\d+)\}?)/);

    if (torMatch && torMatch[2]) {
      terms.push({ type: 'torsion', subscript: parseInt(torMatch[2], 10) });
    } else if (intMatch) {
      const exp = intMatch[2] ? parseInt(intMatch[2], 10) : 1;
      terms.push({ type: 'integer', exponent: exp });
    } else if (part === '0') {
      terms.push({ type: 'zero' });
    } else {
      // Fallback
      terms.push({ type: 'integer', exponent: 1 });
    }
  }

  return { degree, terms: terms.length > 0 ? terms : [{ type: 'zero' }] };
}

function rowToLatex(row: HomologyRow): string {
  if (row.terms.length === 0 || (row.terms.length === 1 && row.terms[0].type === 'zero')) {
    return '0';
  }

  const nonZeroTerms = row.terms.filter(t => t.type !== 'zero');
  if (nonZeroTerms.length === 0) return '0';

  return nonZeroTerms
    .map(t => {
      if (t.type === 'integer') {
        const exp = t.exponent ?? 1;
        if (exp === 1) return '\\mathbb{Z}';
        return `\\mathbb{Z}^{${exp}}`;
      } else if (t.type === 'torsion') {
        const sub = t.subscript ?? 2;
        return `\\mathbb{Z}_{${sub}}`;
      }
      return '0';
    })
    .join(' \\oplus ');
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
    setRows([...rows, { degree: nextDegree, terms: [{ type: 'zero' }] }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const addIntegerGroup = (rowIndex: number) => {
    const updated = [...rows];
    const terms = updated[rowIndex].terms.filter(t => t.type !== 'zero');
    terms.push({ type: 'integer', exponent: 1 });
    updated[rowIndex].terms = terms;
    setRows(updated);
  };

  const addTorsionGroup = (rowIndex: number) => {
    const updated = [...rows];
    const terms = updated[rowIndex].terms.filter(t => t.type !== 'zero');
    terms.push({ type: 'torsion', subscript: 2 });
    updated[rowIndex].terms = terms;
    setRows(updated);
  };

  const updateTermValue = (rowIndex: number, termIndex: number, rawVal: string | number) => {
    const rawStr = String(rawVal).replace(/\D/g, '');
    const val = rawStr === '' ? 1 : Math.max(1, parseInt(rawStr, 10));
    const updated = [...rows];
    const term = updated[rowIndex].terms[termIndex];
    if (term.type === 'integer') {
      term.exponent = val;
    } else if (term.type === 'torsion') {
      term.subscript = val;
    }
    setRows(updated);
  };

  const removeTerm = (rowIndex: number, termIndex: number) => {
    const updated = [...rows];
    updated[rowIndex].terms = updated[rowIndex].terms.filter((_, i) => i !== termIndex);
    if (updated[rowIndex].terms.length === 0) {
      updated[rowIndex].terms = [{ type: 'zero' }];
    }
    setRows(updated);
  };

  const resetRowToZero = (rowIndex: number) => {
    const updated = [...rows];
    updated[rowIndex].terms = [{ type: 'zero' }];
    setRows(updated);
  };

  return (
    <div className="border border-black bg-white p-6 rounded-none font-sans space-y-4">
      <div className={`flex flex-wrap items-center justify-between gap-2 ${rows.length > 0 ? 'pb-3 border-b border-black' : ''}`}>
        <div>
          <h3 className="font-bold text-xs uppercase tracking-widest text-black">{title}</h3>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-black bg-black text-white hover:bg-neutral-800 px-3 py-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Homology Group
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
                    <span className="font-serif italic text-lg font-bold">
                      {row.degree}
                    </span>
                    <div className="text-base px-3 py-1 bg-white border border-black min-w-[120px]">
                      <MathView math={`${row.degree} \\cong ${currentLatex}`} />
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addIntegerGroup(rIdx)}
                        className="text-[10px] font-bold uppercase tracking-widest border border-black bg-white hover:bg-black hover:text-white px-2.5 py-1 text-black transition-colors"
                      >
                        + <MathView math="\mathbb{Z}^n" />
                      </button>
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
              {!readOnly && row.terms.length > 0 && row.terms[0].type !== 'zero' && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-neutral-300">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Direct Sum Terms:</span>
                  {row.terms.map((term, tIdx) => (
                    <div
                      key={tIdx}
                      className="flex items-center gap-1.5 bg-white border border-black px-2 py-1 text-xs"
                    >
                      <MathView
                        math={
                          term.type === 'integer'
                            ? `\\mathbb{Z}^{${term.exponent || 1}}`
                            : `\\mathbb{Z}_{${term.subscript || 2}}`
                        }
                      />
                      <label className="text-[10px] text-neutral-500 font-mono">
                        {term.type === 'integer' ? 'exp:' : 'tors:'}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={term.type === 'integer' ? term.exponent ?? 1 : term.subscript ?? 2}
                        onFocus={e => e.target.select()}
                        onClick={e => (e.target as HTMLInputElement).select()}
                        onChange={e => updateTermValue(rIdx, tIdx, e.target.value)}
                        className="w-16 border border-black px-1 py-0.5 text-center font-mono text-xs focus:border-black focus:outline-none rounded-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeTerm(rIdx, tIdx)}
                        className="text-neutral-400 hover:text-black font-bold ml-1 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
