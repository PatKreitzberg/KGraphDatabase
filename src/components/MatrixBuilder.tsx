import React, { useState, useEffect, useMemo } from 'react';
import { Layers, HelpCircle, Code } from 'lucide-react';
import { CommutingPath } from '../types';

interface MatrixBuilderProps {
  initialK?: number;
  initialVertices?: string[];
  initialEdges?: Record<string, [string, string, string][]>;
  initialSquares?: CommutingPath[];
  initialCubes?: CommutingPath[];
  onMatrixSubmit: (data: {
    k: number;
    vertices: string[];
    edges: Record<string, [string, string, string][]>;
    commuting_squares: CommutingPath[];
    commuting_cubes: CommutingPath[];
  }) => void;
}

function parseRelationsText(text: string): { relations: CommutingPath[]; errors: string[] } {
  const lines = text.split('\n');
  const relations: CommutingPath[] = [];
  const errors: string[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const splitChar = trimmed.includes('~') ? '~' : trimmed.includes('=') ? '=' : null;
    if (!splitChar) {
      errors.push(`Line ${idx + 1}: Missing "~" or "=" separator (e.g. "e0 e1 ~ e2 e3").`);
      return;
    }

    const parts = trimmed.split(splitChar);
    const pathA = parts[0].trim().split(/\s+/).filter(Boolean);
    const pathB = parts[1].trim().split(/\s+/).filter(Boolean);

    if (pathA.length === 0 || pathB.length === 0) {
      errors.push(`Line ${idx + 1}: Both sides of relation must contain edge names (e.g. "e0 e1 ~ e2 e3").`);
      return;
    }

    relations.push({ path_a: pathA, path_b: pathB });
  });

  return { relations, errors };
}

export const MatrixBuilder: React.FC<MatrixBuilderProps> = ({
  initialK,
  initialVertices,
  initialEdges,
  initialSquares,
  initialCubes,
  onMatrixSubmit
}) => {
  const [k, setK] = useState<number>(initialK ?? 2);
  const [numVertices, setNumVertices] = useState<number>(initialVertices?.length ?? 3);
  const [vertices, setVertices] = useState<string[]>(initialVertices ?? ['v0', 'v1', 'v2']);

  // matrices[colorIndex][row][col] = number
  const [matrices, setMatrices] = useState<number[][][]>([]);

  // Commuting Relations text
  const [squaresText, setSquaresText] = useState<string>(
    initialSquares ? initialSquares.map(s => `${s.path_a.join(' ')} ~ ${s.path_b.join(' ')}`).join('\n') : ''
  );
  const [cubesText, setCubesText] = useState<string>(
    initialCubes ? initialCubes.map(c => `${c.path_a.join(' ')} ~ ${c.path_b.join(' ')}`).join('\n') : ''
  );

  const [validationError, setValidationError] = useState<string>('');

  // Initialize/adjust matrices when k or numVertices change
  useEffect(() => {
    // Sync vertices array length
    const updatedVertices: string[] = [];
    for (let i = 0; i < numVertices; i++) {
      updatedVertices.push(vertices[i] || `v${i}`);
    }
    setVertices(updatedVertices);

    // Build k matrices of dimension numVertices x numVertices
    const newMatrices: number[][][] = [];
    for (let c = 0; c < k; c++) {
      const mat: number[][] = [];
      const colorKey = `color_${c + 1}`;
      const initColorEdges = initialEdges?.[colorKey];

      for (let r = 0; r < numVertices; r++) {
        const row: number[] = [];
        for (let col = 0; col < numVertices; col++) {
          const existingVal = matrices[c]?.[r]?.[col];
          if (typeof existingVal === 'number') {
            row.push(existingVal);
          } else if (initColorEdges && initialVertices) {
            const srcName = updatedVertices[r];
            const tgtName = updatedVertices[col];
            const count = initColorEdges.filter(([_, s, t]) => s === srcName && t === tgtName).length;
            row.push(count);
          } else {
            row.push(0);
          }
        }
        mat.push(row);
      }
      newMatrices.push(mat);
    }
    setMatrices(newMatrices);
  }, [k, numVertices]);

  // Compute generated edge list dynamically
  const generatedEdges = useMemo(() => {
    const list: { id: string; colorKey: string; colorIdx: number; src: string; tgt: string }[] = [];
    let globalEdgeCounter = 0;
    for (let c = 0; c < k; c++) {
      const colorKey = `color_${c + 1}`;
      const mat = matrices[c] || [];
      for (let r = 0; r < numVertices; r++) {
        for (let col = 0; col < numVertices; col++) {
          const val = mat[r]?.[col] || 0;
          const src = vertices[r] || `v${r}`;
          const tgt = vertices[col] || `v${col}`;
          for (let m = 0; m < val; m++) {
            list.push({
              id: `e${globalEdgeCounter++}`,
              colorKey,
              colorIdx: c + 1,
              src,
              tgt
            });
          }
        }
      }
    }
    return list;
  }, [k, numVertices, vertices, matrices]);

  const handleVertexNameChange = (index: number, newName: string) => {
    const cleanName = newName.trim() || `v${index}`;
    const updated = [...vertices];
    updated[index] = cleanName;
    setVertices(updated);
  };

  const handleCellValueChange = (colorIndex: number, row: number, col: number, rawVal: string) => {
    const digitsOnly = rawVal.replace(/\D/g, '');
    let numVal = 0;
    if (digitsOnly !== '') {
      const existingVal = matrices[colorIndex]?.[row]?.[col] ?? 0;
      if (existingVal === 0 && digitsOnly.length > 1) {
        const trimmed = digitsOnly.replace(/^0+/, '');
        numVal = trimmed === '' ? 0 : parseInt(trimmed, 10);
      } else {
        numVal = parseInt(digitsOnly, 10);
      }
    }

    const updated = [...matrices];
    if (!updated[colorIndex]) return;
    updated[colorIndex] = updated[colorIndex].map((r, rIdx) => {
      if (rIdx !== row) return r;
      return r.map((c, cIdx) => (cIdx === col ? numVal : c));
    });
    setMatrices(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete'];
    if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Convert matrices to edges structure
    const edgesByColor: Record<string, [string, string, string][]> = {};
    const availableEdges = new Set<string>();
    let globalEdgeCounter = 0;

    for (let c = 0; c < k; c++) {
      const colorKey = `color_${c + 1}`;
      const edgeList: [string, string, string][] = [];
      const mat = matrices[c] || [];

      for (let r = 0; r < numVertices; r++) {
        for (let col = 0; col < numVertices; col++) {
          const val = mat[r]?.[col] || 0;
          const src = vertices[r];
          const tgt = vertices[col];

          for (let m = 0; m < val; m++) {
            const edgeId = `e${globalEdgeCounter++}`;
            edgeList.push([edgeId, src, tgt]);
            availableEdges.add(edgeId);
          }
        }
      }
      edgesByColor[colorKey] = edgeList;
    }

    let parsedSquares: CommutingPath[] = [];
    let parsedCubes: CommutingPath[] = [];

    // Validate Commuting Squares if k > 1
    if (k > 1) {
      const { relations, errors } = parseRelationsText(squaresText);
      if (errors.length > 0) {
        setValidationError(`Commuting Squares Error: ${errors[0]}`);
        return;
      }
      if (relations.length === 0) {
        setValidationError('Commuting squares are required when k > 1. Example: e0 e1 ~ e2 e3');
        return;
      }
      if (availableEdges.size > 0) {
        for (const rel of relations) {
          for (const edge of [...rel.path_a, ...rel.path_b]) {
            if (!availableEdges.has(edge)) {
              setValidationError(`Commuting square references unknown edge "${edge}". Generated edges are: ${Array.from(availableEdges).join(', ')}.`);
              return;
            }
          }
        }
      }
      parsedSquares = relations;
    }

    // Validate Commuting Cubes if k > 2
    if (k > 2) {
      const { relations, errors } = parseRelationsText(cubesText);
      if (errors.length > 0) {
        setValidationError(`Commuting Cubes Error: ${errors[0]}`);
        return;
      }
      if (relations.length === 0) {
        setValidationError('Commuting cubes are required when k > 2. Example: e0 e1 e2 ~ e3 e4 e5');
        return;
      }
      if (availableEdges.size > 0) {
        for (const rel of relations) {
          for (const edge of [...rel.path_a, ...rel.path_b]) {
            if (!availableEdges.has(edge)) {
              setValidationError(`Commuting cube references unknown edge "${edge}". Generated edges are: ${Array.from(availableEdges).join(', ')}.`);
              return;
            }
          }
        }
      }
      parsedCubes = relations;
    }

    onMatrixSubmit({
      k,
      vertices,
      edges: edgesByColor,
      commuting_squares: parsedSquares,
      commuting_cubes: parsedCubes
    });
  };

  const getColorLabel = (index: number) => {
    const namedColors = ['Color 1 (Blue)', 'Color 2 (Red)', 'Color 3 (Green)', 'Color 4 (Purple)', 'Color 5 (Amber)', 'Color 6 (Teal)'];
    if (index < 6) return namedColors[index];
    return `COLOR ${index + 1}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 font-sans">
      {/* Config Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-black bg-[#fafafa] p-6">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
            NUMBER OF COLORS (k)
          </label>
          <input
            type="number"
            min="1"
            max="20"
            value={k}
            onChange={e => setK(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))}
            onFocus={e => e.target.select()}
            onMouseUp={e => e.preventDefault()}
            onClick={e => (e.target as HTMLInputElement).select()}
            className="w-full border border-black bg-white p-2 text-sm font-mono focus:border-black focus:outline-none rounded-none transition-colors"
          />
          <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Number of distinct edge colors in higher-rank graph.</p>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
            VERTICES COUNT
          </label>
          <input
            type="number"
            min="2"
            max="20"
            value={numVertices}
            onChange={e => setNumVertices(Math.max(2, Math.min(20, parseInt(e.target.value, 10) || 2)))}
            onFocus={e => e.target.select()}
            onMouseUp={e => e.preventDefault()}
            onClick={e => (e.target as HTMLInputElement).select()}
            className="w-full border border-black bg-white p-2 text-sm font-mono focus:border-black focus:outline-none rounded-none transition-colors"
          />
          <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Shared vertex set across all adjacency matrices.</p>
        </div>
      </div>

      {/* Vertex Renaming Bar */}
      <div className="border border-black p-6 bg-white">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 italic flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-black" />
          Editable Vertex Labels
        </h4>
        <p className="text-[11px] text-neutral-500 mb-3">
          Renaming a vertex label here updates row and column headers in all {k} color matrices simultaneously.
        </p>
        <div className="flex flex-wrap gap-2">
          {vertices.map((vName, idx) => (
            <div key={idx} className="flex items-center border border-black bg-neutral-50 px-2 py-1">
              <span className="text-[10px] font-mono font-bold text-neutral-400 mr-1.5 uppercase">v{idx}:</span>
              <input
                type="text"
                value={vName}
                onChange={e => handleVertexNameChange(idx, e.target.value)}
                onFocus={e => e.target.select()}
                onMouseUp={e => e.preventDefault()}
                onClick={e => (e.target as HTMLInputElement).select()}
                className="w-16 font-mono text-xs bg-white border border-neutral-300 p-1 focus:border-black focus:outline-none rounded-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Matrices Display */}
      <div className="space-y-8">
        {Array.from({ length: k }).map((_, cIdx) => (
          <div key={cIdx} className="bg-white border border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between pb-3 border-b border-black mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-black">
                Adjacency Matrix: {getColorLabel(cIdx)}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase">
                {numVertices} × {numVertices} GRID
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs text-center">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    {vertices.map((vCol, colIdx) => (
                      <th key={colIdx} className="p-2 text-[10px] font-bold uppercase text-neutral-400">
                        {vCol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vertices.map((vRow, rIdx) => (
                    <tr key={rIdx}>
                      <th className="p-2 text-[10px] font-bold uppercase text-neutral-400 text-left">
                        {vRow}
                      </th>
                      {vertices.map((_, colIdx) => {
                        const cellVal = matrices[cIdx]?.[rIdx]?.[colIdx] ?? 0;
                        return (
                          <td key={colIdx} className="p-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={cellVal}
                              onFocus={e => e.target.select()}
                              onMouseUp={e => e.preventDefault()}
                              onClick={e => (e.target as HTMLInputElement).select()}
                              onKeyDown={handleKeyDown}
                              onChange={e => handleCellValueChange(cIdx, rIdx, colIdx, e.target.value)}
                              className={`w-full h-10 border text-center font-mono text-sm focus:border-black focus:outline-none transition-colors rounded-none ${
                                cellVal > 0 ? 'bg-black text-white font-bold border-black' : 'border-neutral-200 bg-white text-neutral-800'
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-neutral-500 mt-3 tracking-wider uppercase">
              Cell value n &gt; 0 generates n directed edge(s) from row vertex to column vertex in color {cIdx + 1}.
            </p>
          </div>
        ))}
      </div>

      {/* Generated Edge IDs Badge */}
      <div className="border border-black bg-neutral-50 p-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-black pb-2 mb-2">
          <span className="font-bold uppercase tracking-wider text-black text-[11px]">
            Generated Edge IDs ({generatedEdges.length})
          </span>
          <span className="text-[10px] text-neutral-500 uppercase">Use these Edge IDs in commuting relations</span>
        </div>
        {generatedEdges.length === 0 ? (
          <p className="text-neutral-400 text-[10px] uppercase">
            No edges generated yet. Fill matrix cells with integers &gt; 0 to create directed edges.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {generatedEdges.map(e => (
              <span key={e.id} className="border border-black bg-white px-2 py-0.5 text-[10px] font-bold">
                {e.id} ({getColorLabel(e.colorIdx - 1)}: {e.src} → {e.tgt})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Commuting Squares Input Section (Required for k > 1) */}
      {k > 1 && (
        <div className="border border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-black pb-2 gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-black flex items-center gap-1.5">
                Commuting Squares <span className="text-red-600 font-bold">* Required for k &gt; 1</span>
              </span>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                Path composition equivalences for 2-paths across distinct edge colors.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-neutral-100 border border-black px-2 py-1 font-bold">
                Example: e0 e1 ~ e2 e3
              </span>
              <button
                type="button"
                onClick={() => {
                  const exampleStr = generatedEdges.length >= 4
                    ? `${generatedEdges[0].id} ${generatedEdges[1].id} ~ ${generatedEdges[2].id} ${generatedEdges[3].id}`
                    : 'e0 e1 ~ e2 e3';
                  setSquaresText(exampleStr);
                }}
                className="text-[10px] font-bold uppercase tracking-wider border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                Insert Example
              </button>
            </div>
          </div>

          <textarea
            rows={3}
            value={squaresText}
            onChange={e => setSquaresText(e.target.value)}
            placeholder="e0 e1 ~ e2 e3"
            className="w-full font-mono text-xs border border-black p-3 bg-white focus:border-black focus:outline-none rounded-none transition-colors"
          />
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
            Enter one relation per line using ~ or = separator. Example: <code className="font-bold text-black bg-neutral-100 px-1">e0 e1 ~ e2 e3</code>
          </p>
        </div>
      )}

      {/* Commuting Cubes Input Section (Required for k > 2) */}
      {k > 2 && (
        <div className="border border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-3">
          <div className="flex flex-wrap items-center justify-between border-b border-black pb-2 gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-black flex items-center gap-1.5">
                Commuting Cubes <span className="text-red-600 font-bold">* Required for k &gt; 2</span>
              </span>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                3-path equivalences across 3 distinct edge colors.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-neutral-100 border border-black px-2 py-1 font-bold">
                Example: e0 e1 e2 ~ e3 e4 e5
              </span>
              <button
                type="button"
                onClick={() => setCubesText('e0 e1 e2 ~ e3 e4 e5')}
                className="text-[10px] font-bold uppercase tracking-wider border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                Insert Example
              </button>
            </div>
          </div>

          <textarea
            rows={3}
            value={cubesText}
            onChange={e => setCubesText(e.target.value)}
            placeholder="e0 e1 e2 ~ e3 e4 e5"
            className="w-full font-mono text-xs border border-black p-3 bg-white focus:border-black focus:outline-none rounded-none transition-colors"
          />
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
            Enter one relation per line using ~ or = separator. Example: <code className="font-bold text-black bg-neutral-100 px-1">e0 e1 e2 ~ e3 e4 e5</code>
          </p>
        </div>
      )}

      {validationError && (
        <div className="p-4 bg-red-50 border border-black text-red-900 font-mono text-xs font-bold">
          {validationError}
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          className="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 rounded-none transition-colors cursor-pointer"
        >
          Proceed to Properties Step &amp; Save
        </button>
      </div>
    </form>
  );
};

