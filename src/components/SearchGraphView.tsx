import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, Eye, ShieldAlert, Edit } from 'lucide-react';
import { KGraph, SearchFilters } from '../types';
import { MathView } from './MathView';
import { HomologyEditor } from './HomologyEditor';
import { KGraphVisualizer } from './KGraphVisualizer';
import { api } from '../lib/api';

interface SearchGraphViewProps {
  onSelectGraph: (graphId: string) => void;
  onEditGraph: (graphId: string) => void;
  isActive?: boolean;
}

interface FilterNumericInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

const FilterNumericInput: React.FC<FilterNumericInputProps> = ({ label, value, onChange }) => {
  const isAny = !value || value === 'Any' || value === '0' || parseInt(value, 10) <= 0;
  const displayVal = isAny ? 'Any' : value;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentNum = parseInt(value, 10);
      if (isNaN(currentNum) || currentNum <= 1) {
        onChange('');
      } else {
        onChange(String(currentNum - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentNum = parseInt(value, 10);
      if (isNaN(currentNum) || currentNum < 1) {
        onChange('1');
      } else {
        onChange(String(currentNum + 1));
      }
    } else if (e.key.length === 1 && !/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    } else if (isAny && /^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if (e.key !== '0') {
        onChange(e.key);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    if (!digits || digits === '0') {
      onChange('');
    } else {
      onChange(digits);
    }
  };

  return (
    <div>
      <label className="block text-neutral-500 font-bold uppercase text-[10px] tracking-widest mb-1">
        {label}
      </label>
      <input
        type="text"
        value={displayVal}
        onFocus={e => e.target.select()}
        onMouseUp={e => e.preventDefault()}
        onKeyDown={handleKeyDown}
        onChange={handleInputChange}
        className="w-full border border-black bg-white p-2 text-xs font-mono focus:border-black focus:outline-none rounded-none transition-colors"
      />
    </div>
  );
};

export const SearchGraphView: React.FC<SearchGraphViewProps> = ({ onSelectGraph, onEditGraph, isActive = true }) => {
  const [kFilter, setKFilter] = useState<string>('');
  const [minVertices, setMinVertices] = useState<string>('');
  const [maxVertices, setMaxVertices] = useState<string>('');
  const [exactVertices, setExactVertices] = useState<string>('');
  const [useExactVertices, setUseExactVertices] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [useHomologyFilter, setUseHomologyFilter] = useState<boolean>(false);
  const [homologyFilterMap, setHomologyFilterMap] = useState<Record<string, string>>({});
  const [filterSourceFree, setFilterSourceFree] = useState<boolean>(false);
  const [filterSinkFree, setFilterSinkFree] = useState<boolean>(false);
  const [filterAperiodic, setFilterAperiodic] = useState<boolean>(false);
  const [filterCofinal, setFilterCofinal] = useState<boolean>(false);

  const [graphs, setGraphs] = useState<KGraph[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchGraphs = async () => {
    setIsLoading(true);
    try {
      let kVal: number | undefined = undefined;
      if (kFilter.trim()) {
        const parsed = parseInt(kFilter.trim(), 10);
        if (!isNaN(parsed)) {
          kVal = parsed;
        }
      }

      const data = await api.getGraphs(kVal);

      let filtered: KGraph[] = data || [];

      // Client-side filtering for vertices min/max/exact
      if (useExactVertices) {
        if (exactVertices.trim()) {
          const ev = parseInt(exactVertices.trim(), 10);
          if (!isNaN(ev)) {
            filtered = filtered.filter(g => g.vertices.length === ev);
          }
        }
      } else {
        if (minVertices.trim()) {
          const minV = parseInt(minVertices.trim(), 10);
          if (!isNaN(minV)) {
            filtered = filtered.filter(g => g.vertices.length >= minV);
          }
        }
        if (maxVertices.trim()) {
          const maxV = parseInt(maxVertices.trim(), 10);
          if (!isNaN(maxV)) {
            filtered = filtered.filter(g => g.vertices.length <= maxV);
          }
        }
      }

      // Client-side text search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(g => {
          const nameMatch = g.properties?.name?.toLowerCase().includes(q);
          const descMatch = g.properties?.description?.toLowerCase().includes(q);
          const paperMatch = g.properties?.paper?.toLowerCase().includes(q);
          const contributorMatch = g.properties?.submitter_name?.toLowerCase().includes(q);
          const contactMatch = g.properties?.contact_email?.toLowerCase().includes(q);
          const emailMatch = g.owner_email.toLowerCase().includes(q);
          const idMatch = g.id.toLowerCase().includes(q);
          const tagMatch = g.properties?.tags?.some(t => t.toLowerCase().includes(q)) ?? false;
          return nameMatch || descMatch || paperMatch || contributorMatch || contactMatch || emailMatch || idMatch || tagMatch;
        });
      }

      // Client-side structural properties filtering
      if (filterSourceFree) {
        filtered = filtered.filter(g => g.properties?.source_free === true);
      }
      if (filterSinkFree) {
        filtered = filtered.filter(g => g.properties?.sink_free === true);
      }
      if (filterAperiodic) {
        filtered = filtered.filter(g => g.properties?.aperiodic === true);
      }
      if (filterCofinal) {
        filtered = filtered.filter(g => g.properties?.cofinal === true);
      }

      // Client-side homology signature filtering if enabled
      if (useHomologyFilter && Object.keys(homologyFilterMap).length > 0) {
        filtered = filtered.filter(g => {
          const gHom = g.properties?.homology || {};
          for (const [degree, targetLatex] of Object.entries(homologyFilterMap)) {
            if (targetLatex && targetLatex !== '0') {
              const existing = gHom[degree];
              if (!existing || existing !== targetLatex) {
                return false;
              }
            }
          }
          return true;
        });
      }

      // Sanitize raw tokens for security (they shouldn't be returned in list view)
      const sanitized = filtered.map(g => {
        const { edit_token, ...rest } = g;
        return rest as KGraph;
      });

      setGraphs(sanitized);
    } catch (err) {
      console.error('Failed to fetch graphs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchGraphs();
    }
  }, [isActive, kFilter, minVertices, maxVertices, exactVertices, useExactVertices, searchQuery, useHomologyFilter, homologyFilterMap, filterSourceFree, filterSinkFree, filterAperiodic, filterCofinal]);

  const parsedMin = parseInt(minVertices, 10);
  const parsedMax = parseInt(maxVertices, 10);
  const isVertexRangeError = !useExactVertices && !isNaN(parsedMin) && !isNaN(parsedMax) && parsedMin > parsedMax;

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      {/* Search Header */}
      <div className="border-b border-black pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-black">
            Search Registry
          </h2>
          <p className="text-xs text-neutral-600 mt-1 uppercase tracking-wider">
            Query stored higher-rank graph records by color dimension (k), vertex count, or homology signatures.
          </p>
        </div>
        <button
          onClick={fetchGraphs}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest border border-black bg-white px-3 py-2 hover:bg-black hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="border border-black bg-[#fafafa] p-6 space-y-4 text-xs font-sans">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <FilterNumericInput
            label="Colors (k)"
            value={kFilter}
            onChange={setKFilter}
          />

          {useExactVertices ? (
            <div className="col-span-1 sm:col-span-2 flex items-end gap-2">
              <div className="flex-1">
                <FilterNumericInput
                  label="Exact Vertices"
                  value={exactVertices}
                  onChange={setExactVertices}
                />
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold uppercase tracking-widest text-black bg-neutral-100 px-2 h-[34px] border border-black hover:bg-neutral-200 transition-colors">
                <input type="checkbox" checked={useExactVertices} onChange={e => setUseExactVertices(e.target.checked)} className="w-3 h-3 accent-black" />
                Exact
              </label>
            </div>
          ) : (
            <>
              <FilterNumericInput
                label="Min Vertices"
                value={minVertices}
                onChange={setMinVertices}
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FilterNumericInput
                    label="Max Vertices"
                    value={maxVertices}
                    onChange={setMaxVertices}
                  />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold uppercase tracking-widest text-black bg-neutral-100 px-2 h-[34px] border border-black hover:bg-neutral-200 transition-colors">
                  <input type="checkbox" checked={useExactVertices} onChange={e => setUseExactVertices(e.target.checked)} className="w-3 h-3 accent-black" />
                  Exact
                </label>
              </div>
            </>
          )}

          <div>
            <label className="block text-neutral-500 font-bold uppercase text-[10px] tracking-widest mb-1">
              Keyword Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name, paper, id..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border border-black bg-white p-2 pl-7 text-xs font-mono focus:border-black focus:outline-none rounded-none transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2.5" />
            </div>
          </div>
        </div>

        {/* Structural Properties Checkbox Filter Bar */}
        <div className="border-t border-black pt-3">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
            Filter by Structural Properties (Only show graphs containing ticked properties)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none font-bold uppercase text-black bg-white p-2 border border-black hover:bg-neutral-100 transition-colors">
              <input
                type="checkbox"
                checked={filterSourceFree}
                onChange={e => setFilterSourceFree(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              Source Free
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none font-bold uppercase text-black bg-white p-2 border border-black hover:bg-neutral-100 transition-colors">
              <input
                type="checkbox"
                checked={filterSinkFree}
                onChange={e => setFilterSinkFree(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              Sink Free
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none font-bold uppercase text-black bg-white p-2 border border-black hover:bg-neutral-100 transition-colors">
              <input
                type="checkbox"
                checked={filterAperiodic}
                onChange={e => setFilterAperiodic(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              Aperiodic
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none font-bold uppercase text-black bg-white p-2 border border-black hover:bg-neutral-100 transition-colors">
              <input
                type="checkbox"
                checked={filterCofinal}
                onChange={e => setFilterCofinal(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              Cofinal
            </label>
          </div>
        </div>

        {/* Toggle Homology Signature Search */}
        <div className="border-t border-black pt-3">
          <div className="flex flex-wrap items-start gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none font-bold uppercase text-black bg-white p-2 border border-black hover:bg-neutral-100 transition-colors font-mono text-xs w-fit">
              <input
                type="checkbox"
                checked={useHomologyFilter}
                onChange={e => setUseHomologyFilter(e.target.checked)}
                className="w-4 h-4 accent-black"
              />
              Homology
            </label>

            {useHomologyFilter && (
              <div className="flex-1">
                <HomologyEditor
                  initialHomology={homologyFilterMap}
                  onChange={setHomologyFilterMap}
                  title=""
                />
              </div>
            )}
          </div>
        </div>

        {/* Clear Filters */}
        <div className="border-t border-black pt-4 flex justify-start">
          <button
            onClick={() => {
              setKFilter('');
              setMinVertices('');
              setMaxVertices('');
              setExactVertices('');
              setSearchQuery('');
              setUseHomologyFilter(false);
              setHomologyFilterMap({});
              setFilterSourceFree(false);
              setFilterSinkFree(false);
              setFilterAperiodic(false);
              setFilterCofinal(false);
            }}
            className="text-xs font-bold uppercase tracking-widest bg-white text-black border border-black px-4 py-2 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest">
        <span className="text-neutral-500 font-bold">
          Found <strong className="text-black">{graphs.length}</strong> k-graphs
        </span>
      </div>

      {/* Results List */}
      {isLoading ? (
        <div className="p-8 text-center border border-black font-mono text-xs uppercase text-neutral-400">
          Searching graphs.json...
        </div>
      ) : isVertexRangeError ? (
        <div className="p-8 text-center border border-black font-mono text-xs text-red-500 space-y-2">
          <p className="uppercase tracking-wider font-bold">Error: Min vertices cannot be greater than max vertices.</p>
        </div>
      ) : graphs.length === 0 ? (
        <div className="p-8 text-center border border-black font-mono text-xs text-neutral-500 space-y-2">
          <p className="uppercase tracking-wider">No matching k-graphs found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {graphs.map(g => {
            const homologyEntries = Object.entries(g.properties?.homology || {});
            const totalEdges = Object.values(g.edges || {}).reduce((acc: number, curr: unknown) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
            return (
              <div
                key={g.id}
                className="border border-black bg-white p-6 space-y-4 font-sans shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
              >
                {/* Header line */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-black pb-3">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase bg-black text-white px-2 py-0.5 mr-2">
                      k = {g.k}
                    </span>
                    <h3 className="text-base font-bold text-black uppercase tracking-wider inline-block">
                      {g.properties?.name || `Graph ${g.id}`}
                    </h3>
                    {g.properties?.description && (
                      <p className="text-xs text-neutral-700 font-mono mt-1 line-clamp-2">
                        {g.properties.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onEditGraph(g.id)}
                      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-white border border-black text-black px-4 py-2 hover:bg-neutral-100 transition-colors cursor-pointer rounded-none"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Graph
                    </button>
                    <button
                      onClick={() => onSelectGraph(g.id)}
                      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-black text-white px-4 py-2 hover:bg-neutral-800 transition-colors cursor-pointer rounded-none"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Graph
                    </button>
                  </div>
                </div>

                {/* Yellowish Contributor & Citation Box (Always visible) */}
                <div className="bg-amber-50 border border-amber-300 p-3.5 text-xs font-mono space-y-2 text-amber-950">
                  <div className="flex flex-wrap items-start gap-x-2">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 min-w-[150px] shrink-0 mt-0.5">Contributor Name:</span>
                    <span className="font-sans text-xs text-black font-bold">{g.properties?.submitter_name || 'Anonymous / Community Contributor'}</span>
                  </div>
                  {g.properties?.contact_email && (
                    <div className="flex flex-wrap items-start gap-x-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 min-w-[150px] shrink-0 mt-0.5">Contact Email:</span>
                      <span className="font-sans text-xs text-amber-950 font-medium">{g.properties.contact_email}</span>
                    </div>
                  )}
                  {g.properties?.paper && (
                    <div className="flex flex-wrap items-start gap-x-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 min-w-[150px] shrink-0 mt-0.5">Associated Paper:</span>
                      <span className="font-sans text-xs text-black font-medium">{g.properties.paper}</span>
                    </div>
                  )}
                </div>

                {/* Dispute Flag Banner */}
                {g.disputes && g.disputes.length > 0 && (
                  <div className="bg-amber-100 border border-black p-3 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase text-amber-950 flex items-center gap-1.5 text-xs">
                        <ShieldAlert className="w-4 h-4 text-amber-700" />
                        {g.disputes.length} Community Dispute(s) / Property Error Flagged
                      </span>
                      <button
                        onClick={() => onSelectGraph(g.id)}
                        className="text-[10px] font-bold uppercase underline text-black cursor-pointer"
                      >
                        Read Dispute Comments &rarr;
                      </button>
                    </div>
                    <div className="text-xs text-neutral-800 font-sans italic border-l-2 border-amber-600 pl-2">
                      "{g.disputes[0].comment}"
                      {g.disputes.length > 1 && (
                        <span className="text-[10px] font-mono text-neutral-600 font-normal"> (+{g.disputes.length - 1} additional dispute)</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Structure stats & Homology preview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  {/* Left Box: General Graph Information */}
                  <div className="bg-[#fafafa] p-4 border border-black space-y-3 text-neutral-700 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block mb-1">
                        General Information
                      </span>
                      <div>k Value: <span className="text-black font-bold">{g.k}</span></div>
                      <div>Number of Vertices: <span className="text-black font-bold">{g.vertices.length}</span></div>
                      <div>Number of Edges: <span className="text-black font-bold">{totalEdges}</span></div>
                    </div>
                    {(g.properties?.source_free || g.properties?.sink_free || g.properties?.aperiodic || g.properties?.cofinal || (g.properties?.tags && g.properties.tags.length > 0)) && (
                      <div className="pt-2.5 border-t border-neutral-200 space-y-2">
                        {(g.properties?.source_free || g.properties?.sink_free || g.properties?.aperiodic || g.properties?.cofinal) && (
                          <div>
                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block mb-1">
                              Structural Properties:
                            </span>
                            <div className="flex flex-wrap gap-1.5 text-black font-bold uppercase text-[10px]">
                              {g.properties?.source_free && <span className="bg-black text-white px-2 py-0.5 font-bold tracking-wider">Source Free</span>}
                              {g.properties?.sink_free && <span className="bg-black text-white px-2 py-0.5 font-bold tracking-wider">Sink Free</span>}
                              {g.properties?.aperiodic && <span className="bg-black text-white px-2 py-0.5 font-bold tracking-wider">Aperiodic</span>}
                              {g.properties?.cofinal && <span className="bg-black text-white px-2 py-0.5 font-bold tracking-wider">Cofinal</span>}
                            </div>
                          </div>
                        )}
                        {g.properties?.tags && g.properties.tags.length > 0 && (
                          <div>
                            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block mb-1">
                              Tags:
                            </span>
                            <div className="flex flex-wrap gap-1.5 font-bold uppercase text-[10px]">
                              {g.properties.tags.map((t, i) => (
                                <span key={i} className="bg-neutral-200 border border-neutral-400 text-neutral-900 px-2 py-0.5 font-bold tracking-wider">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Box: Homology Group Invariants (Always visible) */}
                  <div className="bg-[#fafafa] p-4 border border-black space-y-2 flex flex-col">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest block mb-1">
                      Homology Group Invariants
                    </span>
                    {homologyEntries.length === 0 ? (
                      <span className="text-neutral-400 italic mt-1">No homology calculated yet.</span>
                    ) : (
                      <div className="flex flex-wrap gap-2 items-center">
                        {homologyEntries.map(([deg, latex]) => (
                          <div key={deg} className="bg-white border border-black px-3 py-1 font-serif text-sm">
                            <MathView math={`${deg} \\cong ${latex}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Graph Visualizer or Submitted Image in Search Summary */}
                <div className="pt-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-black mb-1.5 font-mono">
                    {g.properties?.image_url ? 'Submitted Graph Diagram' : 'Graph Structure Visualizer'}
                  </div>
                  {g.properties?.image_url ? (
                    <div className="border border-black bg-[#fafafa] p-4 flex items-center justify-center min-h-[200px]">
                      <img
                        src={g.properties.image_url}
                        alt={`Diagram for ${g.properties?.name || `Graph ${g.id}`}`}
                        className="max-h-[380px] w-auto object-contain border border-black bg-white"
                      />
                    </div>
                  ) : (
                    <KGraphVisualizer
                      vertices={g.vertices}
                      edges={g.edges}
                      commutingSquares={g.commuting_squares}
                      commutingCubes={g.commuting_cubes}
                      hideCommuting={true}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
