import React, { useState, useMemo, useRef } from 'react';
import { CommutingPath } from '../types';
import { RefreshCw, Move } from 'lucide-react';

interface KGraphVisualizerProps {
  vertices: string[];
  edges: Record<string, [string, string, string][]>;
  commutingSquares?: CommutingPath[];
  commutingCubes?: CommutingPath[];
  hideCommuting?: boolean;
}

const COLOR_PALETTE = [
  '#2563eb', // Color 1: Blue
  '#dc2626', // Color 2: Red
  '#16a34a', // Color 3: Green
  '#9333ea', // Color 4: Purple
  '#d97706', // Color 5: Amber
  '#0891b2', // Color 6: Teal
  '#4f46e5', // Color 7: Indigo
  '#ea580c', // Color 8: Orange
  '#059669', // Color 9: Emerald
  '#c026d3', // Color 10: Fuchsia
  '#0284c7', // Color 11: Sky
  '#b91c1c', // Color 12: Dark Red
  '#15803d', // Color 13: Dark Green
  '#7e22ce', // Color 14: Dark Purple
  '#a16207', // Color 15: Dark Yellow
  '#0f766e', // Color 16: Dark Teal
  '#4338ca', // Color 17: Dark Indigo
  '#c2410c', // Color 18: Dark Orange
  '#047857', // Color 19: Deep Emerald
  '#a21caf'  // Color 20: Deep Magenta
];

export const KGraphVisualizer: React.FC<KGraphVisualizerProps> = ({
  vertices,
  edges,
  commutingSquares = [],
  commutingCubes = [],
  hideCommuting = false
}) => {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredVertex, setHoveredVertex] = useState<string | null>(null);
  const [highlightedSquareIdx, setHighlightedSquareIdx] = useState<number | null>(null);

  // Drag and Drop State
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [customNodePositions, setCustomNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [customEdgeOffsets, setCustomEdgeOffsets] = useState<Record<string, number>>({});
  const [dragState, setDragState] = useState<
    { type: 'node'; id: string } | { type: 'edge'; id: string; startY: number; startOffset: number } | null
  >(null);

  // Compute circular initial vertex coordinates
  const radius = 120;
  const centerX = 200;
  const centerY = 160;

  const nodePositions = useMemo(() => {
    const coords: Record<string, { x: number; y: number }> = {};
    const n = vertices.length;
    if (n === 0) return coords;

    for (let i = 0; i < n; i++) {
      const v = vertices[i];
      if (customNodePositions[v]) {
        coords[v] = customNodePositions[v];
      } else {
        const angle = (2 * Math.PI * i) / n - Math.PI / 2;
        coords[v] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      }
    }
    return coords;
  }, [vertices, customNodePositions]);

  // Color label helper for k > 6
  const getColorLabel = (idx: number) => {
    const named = ['Color 1 (Blue)', 'Color 2 (Red)', 'Color 3 (Green)', 'Color 4 (Purple)', 'Color 5 (Amber)', 'Color 6 (Teal)'];
    if (idx < 6) return named[idx];
    return `COLOR ${idx + 1}`;
  };

  // Flatten all edges with color index
  const flattenedEdges = useMemo(() => {
    const list: { id: string; src: string; tgt: string; colorIdx: number; colorHex: string; colorKey: string }[] = [];
    const keys = Object.keys(edges).sort();

    keys.forEach((colorKey, cIdx) => {
      const hex = COLOR_PALETTE[cIdx % COLOR_PALETTE.length];
      const edgeTuples = edges[colorKey] || [];
      for (const [eId, src, tgt] of edgeTuples) {
        list.push({
          id: eId,
          src,
          tgt,
          colorIdx: cIdx + 1,
          colorHex: hex,
          colorKey
        });
      }
    });
    return list;
  }, [edges]);

  // Check if edge is in highlighted square
  const activeSquareEdges = useMemo(() => {
    if (highlightedSquareIdx === null || !commutingSquares[highlightedSquareIdx]) {
      return new Set<string>();
    }
    const sq = commutingSquares[highlightedSquareIdx];
    return new Set<string>([...sq.path_a, ...sq.path_b]);
  }, [highlightedSquareIdx, commutingSquares]);

  // SVG Mouse Dragging Handlers
  const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (ctm) {
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
    return { x: 0, y: 0 };
  };

  const handleMouseDownNode = (vName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDragState({ type: 'node', id: vName });
  };

  const handleMouseDownEdge = (eId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentOff = customEdgeOffsets[eId] ?? 0;
    setDragState({ type: 'edge', id: eId, startY: e.clientY, startOffset: currentOff });
  };

  const handleMouseMoveSVG = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragState) return;

    if (dragState.type === 'node') {
      const pt = getSVGPoint(e);
      // Constrain inside bounding canvas [20..380, 20..300]
      const boundedX = Math.max(25, Math.min(375, pt.x));
      const boundedY = Math.max(25, Math.min(295, pt.y));

      setCustomNodePositions(prev => ({
        ...prev,
        [dragState.id]: { x: boundedX, y: boundedY }
      }));
    } else if (dragState.type === 'edge') {
      const deltaY = e.clientY - dragState.startY;
      setCustomEdgeOffsets(prev => ({
        ...prev,
        [dragState.id]: dragState.startOffset + deltaY * 0.5
      }));
    }
  };

  const handleMouseUpSVG = () => {
    setDragState(null);
  };

  const handleResetLayout = () => {
    setCustomNodePositions({});
    setCustomEdgeOffsets({});
  };

  return (
    <div className="border border-black bg-white p-6 font-sans shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-3 mb-4">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-black flex items-center gap-1.5">
            Interactive k-Graph Visualizer
            <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded-none font-normal tracking-normal flex items-center gap-1">
              <Move className="w-3 h-3 inline" /> Drag Nodes &amp; Edges
            </span>
          </h4>
          <p className="text-[10px] uppercase text-neutral-500 tracking-wider mt-0.5">
            Node layout depicting {vertices.length} vertices and {flattenedEdges.length} colored directed edges. Click &amp; drag any node or edge to reposition.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(Object.keys(customNodePositions).length > 0 || Object.keys(customEdgeOffsets).length > 0) && (
            <button
              type="button"
              onClick={handleResetLayout}
              className="text-[10px] font-bold uppercase tracking-widest border border-black px-2.5 py-1 hover:bg-black hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Reset Layout
            </button>
          )}

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider font-bold">
            {Object.keys(edges).map((key, idx) => {
              const hex = COLOR_PALETTE[idx % COLOR_PALETTE.length];
              return (
                <div key={key} className="flex items-center gap-1.5 border border-black bg-neutral-50 px-2 py-0.5">
                  <span className="w-2.5 h-2.5 inline-block border border-black" style={{ backgroundColor: hex }} />
                  <span className="text-black">{getColorLabel(idx)} ({edges[key]?.length || 0})</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${hideCommuting ? '' : 'lg:grid-cols-3'} gap-4`}>
        {/* SVG Diagram Canvas */}
        <div className={`${hideCommuting ? 'col-span-1' : 'lg:col-span-2'} bg-[#fafafa] border border-black p-4 flex items-center justify-center relative min-h-[340px] select-none`}>
          <svg
            ref={svgRef}
            viewBox="0 0 400 320"
            onMouseMove={handleMouseMoveSVG}
            onMouseUp={handleMouseUpSVG}
            onMouseLeave={handleMouseUpSVG}
            className="w-full h-auto max-h-[380px] overflow-visible cursor-crosshair"
          >
            <defs>
              {COLOR_PALETTE.map((hex, idx) => (
                <marker
                  key={idx}
                  id={`arrow-${idx}`}
                  viewBox="0 0 10 10"
                  refX="20"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={hex} />
                </marker>
              ))}
            </defs>

            {/* Render Edges */}
            {flattenedEdges.map((e, idx) => {
              const srcPos = nodePositions[e.src];
              const tgtPos = nodePositions[e.tgt];
              if (!srcPos || !tgtPos) return null;

              const isSelfLoop = e.src === e.tgt;
              const isHovered = hoveredEdgeId === e.id;
              const isVertexConnected = hoveredVertex && (e.src === hoveredVertex || e.tgt === hoveredVertex);
              const isInSquare = activeSquareEdges.has(e.id);

              const strokeWidth = isHovered || isInSquare ? 3.5 : isVertexConnected ? 2.5 : 1.5;
              const strokeOpacity = hoveredEdgeId && !isHovered ? 0.25 : activeSquareEdges.size > 0 && !isInSquare ? 0.2 : 0.85;

              const userEdgeOffset = customEdgeOffsets[e.id] ?? 0;

              if (isSelfLoop) {
                // Draw self-loop arc
                const loopYOffset = -42 + userEdgeOffset;
                return (
                  <g key={e.id + idx}>
                    <path
                      d={`M ${srcPos.x} ${srcPos.y - 12} C ${srcPos.x - 30} ${srcPos.y - 50 + userEdgeOffset}, ${srcPos.x + 30} ${srcPos.y - 50 + userEdgeOffset}, ${srcPos.x + 12} ${srcPos.y - 10}`}
                      fill="none"
                      stroke={e.colorHex}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      markerEnd={`url(#arrow-${(e.colorIdx - 1) % COLOR_PALETTE.length})`}
                      onMouseEnter={() => setHoveredEdgeId(e.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      onMouseDown={ev => handleMouseDownEdge(e.id, ev)}
                      className="cursor-grab active:cursor-grabbing transition-all"
                    />
                    <text
                      x={srcPos.x}
                      y={srcPos.y + loopYOffset}
                      textAnchor="middle"
                      fill={e.colorHex}
                      onMouseDown={ev => handleMouseDownEdge(e.id, ev)}
                      className="text-[10px] font-mono font-bold select-none cursor-grab active:cursor-grabbing"
                    >
                      {e.id}
                    </text>
                  </g>
                );
              }

              // Compute curved or straight line
              const dx = tgtPos.x - srcPos.x;
              const dy = tgtPos.y - srcPos.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;

              // Base curvature offset plus user drag offset
              const baseOffset = (idx % 2 === 0 ? 1 : -1) * 12 + userEdgeOffset;
              const midX = (srcPos.x + tgtPos.x) / 2 + (-dy / dist) * baseOffset;
              const midY = (srcPos.y + tgtPos.y) / 2 + (dx / dist) * baseOffset;

              const pathD = `M ${srcPos.x} ${srcPos.y} Q ${midX} ${midY} ${tgtPos.x} ${tgtPos.y}`;

              return (
                <g key={e.id + idx}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={e.colorHex}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    markerEnd={`url(#arrow-${(e.colorIdx - 1) % COLOR_PALETTE.length})`}
                    onMouseEnter={() => setHoveredEdgeId(e.id)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                    onMouseDown={ev => handleMouseDownEdge(e.id, ev)}
                    className="cursor-grab active:cursor-grabbing transition-all"
                  />
                  {/* Edge ID badge */}
                  <rect
                    x={midX - 10}
                    y={midY - 8}
                    width="20"
                    height="14"
                    fill="white"
                    stroke={e.colorHex}
                    strokeWidth="1"
                    rx="0"
                    onMouseDown={ev => handleMouseDownEdge(e.id, ev)}
                    className="cursor-grab active:cursor-grabbing"
                  />
                  <text
                    x={midX}
                    y={midY + 2.5}
                    textAnchor="middle"
                    fill={e.colorHex}
                    onMouseDown={ev => handleMouseDownEdge(e.id, ev)}
                    className="text-[9px] font-mono font-bold select-none cursor-grab active:cursor-grabbing"
                  >
                    {e.id}
                  </text>
                </g>
              );
            })}

            {/* Render Vertex Nodes */}
            {vertices.map(vName => {
              const pos = nodePositions[vName];
              if (!pos) return null;
              const isHovered = hoveredVertex === vName;
              const isBeingDragged = dragState?.type === 'node' && dragState.id === vName;

              return (
                <g
                  key={vName}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseEnter={() => setHoveredVertex(vName)}
                  onMouseLeave={() => setHoveredVertex(null)}
                  onMouseDown={ev => handleMouseDownNode(vName, ev)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <circle
                    r={isBeingDragged ? 20 : isHovered ? 18 : 15}
                    fill={isBeingDragged ? '#000000' : 'white'}
                    stroke="black"
                    strokeWidth={isHovered || isBeingDragged ? 2.5 : 1.5}
                    className="transition-all"
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill={isBeingDragged ? 'white' : 'black'}
                    className="text-xs font-mono font-bold select-none pointer-events-none"
                  >
                    {vName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Commuting Relations Panel */}
        {!hideCommuting && (
          <div className="border border-black bg-[#fafafa] p-4 space-y-4 font-mono text-xs">
            <div>
              <h5 className="font-bold uppercase tracking-wider text-black border-b border-black pb-1 mb-2 text-[10px]">
                Commuting Squares ({commutingSquares.length})
              </h5>
              {commutingSquares.length === 0 ? (
                <p className="text-neutral-400 text-[10px] uppercase">No commuting squares recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {commutingSquares.map((sq, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHighlightedSquareIdx(idx)}
                      onMouseLeave={() => setHighlightedSquareIdx(null)}
                      className={`p-2 border transition-colors cursor-pointer ${
                        highlightedSquareIdx === idx
                          ? 'bg-black text-white border-black font-bold'
                          : 'bg-white text-neutral-800 border-black hover:bg-black hover:text-white'
                      }`}
                    >
                      <div className="text-[10px] tracking-wider">
                        <span className="font-bold">{sq.path_a.join(' ')}</span>
                        <span className="mx-1 text-neutral-400">~</span>
                        <span className="font-bold">{sq.path_b.join(' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h5 className="font-bold uppercase tracking-wider text-black border-b border-black pb-1 mb-2 text-[10px]">
                Commuting Cubes ({commutingCubes.length})
              </h5>
              {commutingCubes.length === 0 ? (
                <p className="text-neutral-400 text-[10px] uppercase">No commuting cubes recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {commutingCubes.map((cb, idx) => (
                    <div key={idx} className="p-2 bg-white border border-black text-[10px] tracking-wider">
                      <span className="font-bold">{cb.path_a.join(' ')}</span>
                      <span className="mx-1 text-neutral-400">~</span>
                      <span className="font-bold">{cb.path_b.join(' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
