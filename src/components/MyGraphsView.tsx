import React, { useState, useEffect } from 'react';
import { Eye, ShieldAlert, Edit, Key } from 'lucide-react';
import { KGraph } from '../types';
import { MathView } from './MathView';
import { KGraphVisualizer } from './KGraphVisualizer';
import { api } from '../lib/api';

interface MyGraphsViewProps {
  onSelectGraph: (graphId: string) => void;
  onEditGraph: (graphId: string, token: string) => void;
}

export const MyGraphsView: React.FC<MyGraphsViewProps> = ({ onSelectGraph, onEditGraph }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [activeToken, setActiveToken] = useState<string | null>(null);
  
  const [graphs, setGraphs] = useState<KGraph[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [tokenEmail, setTokenEmail] = useState('');
  const [tokenStatus, setTokenStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle');

  const handleRequestToken = async () => {
    if (!tokenEmail || !tokenEmail.includes('@')) return;
    setTokenStatus('sending');
    try {
      await api.requestTokenEmail(tokenEmail);
      setTokenStatus('sent');
      setTimeout(() => {
        setTokenStatus('idle');
        setTokenEmail('');
      }, 3000);
    } catch {
      setTokenStatus('error');
    }
  };

  const handleFetchMyGraphs = async () => {
    if (!tokenInput.trim()) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.getMyGraphs(tokenInput.trim());
      if (data.length === 0) {
        setErrorMsg('This token is not associated with any graphs.');
        setActiveToken(null);
      } else {
        setGraphs(data);
        setActiveToken(tokenInput.trim());
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid token or failed to fetch graphs.');
      setActiveToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeToken) {
    return (
      <div className="max-w-2xl mx-auto font-sans mt-8">
        <div className="border border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-xl font-bold uppercase tracking-tight mb-4">Edit My Graphs</h2>
          <p className="text-xs text-neutral-600 font-mono mb-6">
            Enter your edit token to view and manage the graphs you have submitted.
          </p>
          
          <div className="flex gap-2 mb-2">
            <input 
              type="text" 
              value={tokenInput} 
              onChange={e => setTokenInput(e.target.value)} 
              placeholder="Paste your edit token here"
              className="flex-1 border border-black p-2 font-mono text-xs"
            />
            <button 
              onClick={handleFetchMyGraphs}
              disabled={isLoading}
              className="px-6 py-2 bg-black text-white text-xs font-bold uppercase hover:bg-neutral-800 disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {isLoading ? 'Loading...' : 'View Graphs'}
            </button>
          </div>
          {errorMsg && <p className="text-red-600 text-xs font-bold mb-6">{errorMsg}</p>}

          <div className="mt-8 pt-6 border-t border-black">
            <h3 className="text-sm font-bold uppercase tracking-tight mb-2 flex items-center gap-2">
              <Key className="w-4 h-4" /> Forgot your token?
            </h3>
            <p className="text-xs text-neutral-600 font-mono mb-4">
              Enter your email address to receive your edit token.
            </p>
            <div className="flex gap-2">
              <input 
                type="email" 
                value={tokenEmail} 
                onChange={e => setTokenEmail(e.target.value)} 
                placeholder="Email address"
                className="flex-1 border border-black p-2 font-mono text-xs"
              />
              <button 
                onClick={handleRequestToken}
                disabled={tokenStatus === 'sending'}
                className="px-4 py-2 border border-black text-xs font-bold uppercase hover:bg-neutral-100 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {tokenStatus === 'sending' ? 'Sending...' : 'Email Token'}
              </button>
            </div>
            {tokenStatus === 'error' && <p className="text-red-600 text-xs font-bold mt-2">Error sending email.</p>}
            {tokenStatus === 'sent' && <p className="text-emerald-600 text-xs font-bold mt-2">Email request processed!</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      <div className="border-b border-black pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-black">
            My Graphs
          </h2>
          <p className="text-xs text-neutral-600 mt-1 uppercase tracking-wider">
            Managing {graphs.length} graph(s) with your edit token.
          </p>
        </div>
        <button
          onClick={() => {
            setActiveToken(null);
            setGraphs([]);
          }}
          className="text-xs font-bold uppercase tracking-widest border border-black bg-white px-3 py-2 hover:bg-neutral-100 transition-all cursor-pointer"
        >
          &larr; Exit
        </button>
      </div>

      {graphs.length === 0 ? (
        <div className="p-8 text-center border border-black font-mono text-xs text-neutral-500 uppercase tracking-wider">
          You haven't submitted any graphs yet.
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
                      onClick={() => onEditGraph(g.id, activeToken)}
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

                {/* Yellowish Contributor & Citation Box */}
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

                  {/* Right Box: Homology Group Invariants */}
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
