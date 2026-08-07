import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Copy,
  Download,
  Check,
  MessageSquare,
  FileCode,
  ShieldAlert,
  Info,
  Edit
} from 'lucide-react';
import { KGraph } from '../types';
import { MathView } from './MathView';
import { KGraphVisualizer } from './KGraphVisualizer';
import { formatKGraphToText } from '../lib/parser';
import { api } from '../lib/api';

interface GraphDetailViewProps {
  graphId: string;
  initialToken?: string;
  onBack: () => void;
  onEditGraph: (graphId: string) => void;
}

export const GraphDetailView: React.FC<GraphDetailViewProps> = ({
  graphId,
  initialToken,
  onBack,
  onEditGraph
}) => {
  const [graph, setGraph] = useState<KGraph | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Append Property Mode (Any Visitor)
  const [showAppendModal, setShowAppendModal] = useState<boolean>(false);
  const [appendKey, setAppendKey] = useState<string>('H2');
  const [appendValue, setAppendValue] = useState<string>('\\mathbb{Z}');
  const [isAppendHomology, setIsAppendHomology] = useState<boolean>(true);
  const [contributorEmail, setContributorEmail] = useState<string>('');
  const [isSubmittingProperty, setIsSubmittingProperty] = useState<boolean>(false);

  // Dispute System State
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeProperty, setDisputeProperty] = useState<string>('Homology H0');
  const [disputeComment, setDisputeComment] = useState<string>('');
  const [disputeAuthorEmail, setDisputeAuthorEmail] = useState<string>('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);
  const [disputeError, setDisputeError] = useState<string>('');

  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeComment.trim()) {
      setDisputeError('Please enter a comment explaining the dispute.');
      return;
    }
    setIsSubmittingDispute(true);
    setDisputeError('');

    try {
      const res = await api.addDispute({
        target_id: graphId,
        comment: disputeComment.trim(),
        author_email: disputeAuthorEmail.trim() || null,
        property_name: disputeProperty
      });

      if (res && res.success) {
        await fetchGraph();
        setShowDisputeModal(false);
        setDisputeComment('');
        setDisputeAuthorEmail('');
      } else {
        setDisputeError('Failed to submit dispute.');
      }
    } catch (err: any) {
      setDisputeError(err.message || 'Network error while submitting dispute.');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  // Copy feedback
  // Copy feedback
  const [copiedText, setCopiedText] = useState<boolean>(false);

  const fetchGraph = async () => {
    if (!graphId) return;
    setIsLoading(true);
    try {
      const data = await api.getGraphById(graphId);

      if (data) {
        setGraph(data as KGraph);
      }
    } catch (err) {
      console.error('Failed to fetch graph detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [graphId]);

  // Any visitor append property
  const handleAppendProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!graph || !appendKey || !appendValue) return;

    setIsSubmittingProperty(true);
    try {
      const res = await api.addProperty({
        target_id: graphId,
        prop_key: appendKey.trim(),
        prop_value: appendValue.trim(),
        contributor_email: contributorEmail.trim() || null,
        is_homology: isAppendHomology
      });

      if (res && res.success) {
        await fetchGraph();
        setShowAppendModal(false);
        setAppendKey('H2');
        setAppendValue('\\mathbb{Z}');
        setContributorEmail('');
      }
    } catch (err) {
      console.error('Failed to append property:', err);
    } finally {
      setIsSubmittingProperty(false);
    }
  };
  const handleCopyTextFormat = () => {
    if (!graph) return;
    const txt = formatKGraphToText(graph);
    navigator.clipboard.writeText(txt);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleDownloadJson = () => {
    if (!graph) return;
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${graph.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center font-mono text-xs text-neutral-400">
        Loading k-graph detail...
      </div>
    );
  }

  if (!graph) {
    return (
      <div className="p-8 text-center font-mono text-xs text-neutral-600 space-y-2">
        <p>Graph record not found.</p>
        <button onClick={onBack} className="text-black underline font-bold">
          ← Back to Search
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans">
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 font-bold uppercase text-xs tracking-widest border border-black bg-white px-3 py-2 hover:bg-black hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Search List
        </button>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <button
            onClick={() => onEditGraph(graphId)}
            className="bg-white border border-black text-black px-4 py-1.5 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1.5 hover:bg-neutral-100 transition-colors cursor-pointer rounded-none"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Graph
          </button>

          <button
            onClick={handleCopyTextFormat}
            className="border border-black hover:bg-black hover:text-white px-3 py-1.5 text-black font-bold uppercase tracking-widest text-[10px] flex items-center gap-1 transition-colors cursor-pointer rounded-none"
          >
            <FileCode className="w-3.5 h-3.5" />
            {copiedText ? 'Copied Text!' : 'Copy Block Text'}
          </button>

          <button
            onClick={handleDownloadJson}
            className="border border-black hover:bg-black hover:text-white px-3 py-1.5 text-black font-bold uppercase tracking-widest text-[10px] flex items-center gap-1 transition-colors cursor-pointer rounded-none"
          >
            <Download className="w-3.5 h-3.5" />
            Download JSON
          </button>
        </div>
      </div>

      {/* Main Graph Header */}
      <div className="border border-black bg-white p-6 space-y-4 font-sans shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase bg-black text-white px-2 py-0.5 mr-2">
              k = {graph.k}
            </span>
            <h1 className="text-2xl font-bold text-black uppercase tracking-wider inline-block">
              {graph.properties?.name || `Graph ${graph.id}`}
            </h1>
            {graph.properties?.description && (
              <p className="text-xs text-neutral-800 mt-2 font-mono whitespace-pre-line">
                {graph.properties.description}
              </p>
            )}
            {graph.properties?.paper && (
              <p className="text-xs text-neutral-600 italic mt-1 font-mono">
                Citation: {graph.properties.paper}
              </p>
            )}
          </div>

          <div className="text-right font-mono text-[10px] uppercase text-neutral-500 tracking-wider">
            <div>Submitted: {new Date(graph.created_at).toLocaleDateString()}</div>
            {graph.properties?.submitter_name && <div>Contributor: <span className="text-black font-bold">{graph.properties.submitter_name}</span></div>}
            {graph.properties?.contact_email && <div>Contact: <span className="text-neutral-600">{graph.properties.contact_email}</span></div>}
          </div>
        </div>

        {/* Structural Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#fafafa] border border-black p-4 font-mono text-xs">
          <div>Vertices Count: <strong className="text-black font-bold">{graph.vertices.length}</strong></div>
          <div>Color Edge Sets: <strong className="text-black font-bold">{Object.keys(graph.edges).length}</strong></div>
          <div>Commuting Squares: <strong className="text-black font-bold">{graph.commuting_squares.length}</strong></div>
          <div>Commuting Cubes: <strong className="text-black font-bold">{graph.commuting_cubes.length}</strong></div>
        </div>

        {/* Structural Properties Tag Row */}
        <div className="flex flex-wrap gap-2 pt-1 font-mono text-xs">
          <span className={`px-3 py-1.5 font-bold uppercase border ${graph.properties?.source_free ? 'bg-black text-white border-black' : 'bg-neutral-100 text-neutral-400 border-neutral-300'}`}>
            Source Free: {graph.properties?.source_free ? 'YES' : 'NO'}
          </span>
          <span className={`px-3 py-1.5 font-bold uppercase border ${graph.properties?.sink_free ? 'bg-black text-white border-black' : 'bg-neutral-100 text-neutral-400 border-neutral-300'}`}>
            Sink Free: {graph.properties?.sink_free ? 'YES' : 'NO'}
          </span>
          <span className={`px-3 py-1.5 font-bold uppercase border ${graph.properties?.aperiodic ? 'bg-black text-white border-black' : 'bg-neutral-100 text-neutral-400 border-neutral-300'}`}>
            Aperiodic: {graph.properties?.aperiodic ? 'YES' : 'NO'}
          </span>
          <span className={`px-3 py-1.5 font-bold uppercase border ${graph.properties?.cofinal ? 'bg-black text-white border-black' : 'bg-neutral-100 text-neutral-400 border-neutral-300'}`}>
            Cofinal: {graph.properties?.cofinal ? 'YES' : 'NO'}
          </span>
          {graph.properties?.tags && graph.properties.tags.map((tag, idx) => (
            <span key={idx} className="px-3 py-1.5 font-bold uppercase border bg-neutral-200 text-neutral-900 border-neutral-400">
              {tag}
            </span>
          ))}
        </div>

        {/* Attached Diagram / Illustration Image */}
        {graph.properties?.image_url && (
          <div className="border border-black bg-[#fafafa] p-4 mt-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2 font-mono">Attached Diagram / Illustration</h4>
            <div className="bg-white border border-black p-4 max-w-2xl mx-auto flex justify-center">
              <img
                src={graph.properties.image_url}
                alt={graph.properties.name || 'Graph diagram'}
                className="max-h-96 w-auto object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* Interactive k-Graph Canvas */}
      <KGraphVisualizer
        vertices={graph.vertices}
        edges={graph.edges}
        commutingSquares={graph.commuting_squares}
        commutingCubes={graph.commuting_cubes}
      />

      {/* Homology & Invariants Display */}
      <div className="border border-black bg-white p-6 space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between border-b border-black pb-3 gap-2">
          <h3 className="font-bold text-xs uppercase tracking-widest text-black">
            Homology Group Invariants
          </h3>
          <button
            onClick={() => setShowAppendModal(true)}
            className="text-xs font-bold uppercase tracking-widest bg-black text-white px-4 py-2 hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
          >
            <Plus className="w-3.5 h-3.5" />
            Contribute Property / Computation
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {Object.entries(graph.properties?.homology || {}).map(([degree, latex]) => (
            <div key={degree} className="border border-black p-4 bg-[#fafafa]">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest block mb-1">{degree}</span>
              <div className="bg-white border border-black p-3 text-base font-serif">
                <MathView math={`${degree} \\cong ${latex}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Append-Only Property Log History */}
      <div className="border border-black bg-white p-6 space-y-3 font-sans shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h4 className="font-bold text-xs uppercase tracking-widest text-black border-b border-black pb-2">
          Public Property Contribution Log ({graph.property_logs?.length || 0})
        </h4>

        {(!graph.property_logs || graph.property_logs.length === 0) ? (
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-mono py-2">
            No public properties added yet. Any visitor can contribute new computations or citations above.
          </p>
        ) : (
          <div className="space-y-2 font-mono text-xs">
            {graph.property_logs.map((log) => (
              <div key={log.id} className="p-3 border border-black bg-[#fafafa] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-black uppercase tracking-wider mr-2">[{log.key}]:</span>
                  <span className="font-serif text-sm bg-white border border-black px-2 py-0.5 inline-block">
                    <MathView math={log.value} />
                  </span>
                </div>
                <div className="text-[10px] uppercase text-neutral-500 tracking-wider">
                  By: {log.contributor_email || 'Anonymous Visitor'} • {new Date(log.added_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Property Disputes Section */}
      <div className="border border-black bg-white p-6 space-y-4 font-sans shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between border-b border-black pb-3 gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-xs uppercase tracking-widest text-black flex items-center gap-2">
                Property Disputes &amp; Community Flags
                {graph.disputes && graph.disputes.length > 0 && (
                  <span className="bg-amber-500 text-black px-2 py-0.5 text-[10px] font-mono font-bold">
                    {graph.disputes.length} Flagged
                  </span>
                )}
              </h3>
              <p className="text-[10px] uppercase text-neutral-500 tracking-wider mt-0.5">
                Community review system for incorrect properties, homology signatures, or relations.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDisputeModal(true)}
            className="text-xs font-bold uppercase tracking-widest bg-amber-400 text-black border border-black px-4 py-2 hover:bg-amber-500 transition-colors flex items-center gap-1.5 cursor-pointer rounded-none"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Dispute / Flag Property Error
          </button>
        </div>

        {(!graph.disputes || graph.disputes.length === 0) ? (
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-mono py-2">
            No disputes reported for this graph entry. If you suspect a calculation or property is incorrect, hit the dispute button above.
          </p>
        ) : (
          <div className="space-y-3 font-mono text-xs">
            {graph.disputes.map((d) => (
              <div key={d.id} className="p-4 border border-black bg-amber-50/50 space-y-2">
                <div className="flex flex-wrap items-center justify-between border-b border-black/20 pb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-black text-white font-bold text-[10px] uppercase px-2 py-0.5">
                      {d.property_name || 'Property'}
                    </span>
                    <span className="font-bold text-amber-900 text-xs uppercase">
                      Status: {d.status || 'open'}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 uppercase">
                    By: {d.author_email || 'Anonymous Contributor'} • {new Date(d.created_at).toLocaleDateString()}
                  </div>
                </div>
                <p className="font-sans text-xs text-black leading-relaxed whitespace-pre-wrap">
                  {d.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Dispute Submission */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-black p-6 w-full max-w-lg space-y-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="border-b border-black pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-black flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Submit Property Dispute
                </h3>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                  Flag an incorrect property, calculation, or relation for other users to review.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="text-xs font-bold border border-black px-2 py-1 hover:bg-black hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDispute} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  Target Property Under Dispute
                </label>
                <input
                  type="text"
                  required
                  value={disputeProperty}
                  onChange={e => setDisputeProperty(e.target.value)}
                  placeholder="e.g. Homology H1, Commuting Squares, Vertices"
                  className="w-full border border-black p-2.5 font-mono text-xs focus:border-black focus:outline-none rounded-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  Dispute Details &amp; Explanation
                </label>
                <textarea
                  required
                  rows={4}
                  value={disputeComment}
                  onChange={e => setDisputeComment(e.target.value)}
                  placeholder="Explain why you believe this property is incorrect..."
                  className="w-full border border-black p-2.5 font-sans text-xs focus:border-black focus:outline-none rounded-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  Your Email (Optional)
                </label>
                <input
                  type="email"
                  value={disputeAuthorEmail}
                  onChange={e => setDisputeAuthorEmail(e.target.value)}
                  placeholder="reviewer@math.org"
                  className="w-full border border-black p-2.5 font-mono text-xs focus:border-black focus:outline-none rounded-none transition-colors"
                />
              </div>

              {disputeError && (
                <div className="p-2.5 bg-red-50 border border-black text-red-900 text-xs font-mono font-bold">
                  {disputeError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-colors rounded-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute}
                  className="bg-amber-400 text-black border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs hover:bg-amber-500 transition-colors rounded-none cursor-pointer"
                >
                  {isSubmittingDispute ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Append-Only Property (Any Visitor) */}
      {showAppendModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white border border-black p-6 w-full max-w-lg space-y-4 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <div className="border-b border-black pb-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-black">
                Contribute Visitor Property
              </h3>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                Append-only contribution. Does NOT require structure token.
              </p>
            </div>

            <form onSubmit={handleAppendProperty} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  Property Key / Degree (e.g. H2, H3, Torsion, Invariant)
                </label>
                <input
                  type="text"
                  required
                  value={appendKey}
                  onChange={e => setAppendKey(e.target.value)}
                  className="w-full border border-black p-2.5 font-mono text-xs focus:border-black focus:outline-none rounded-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  LaTeX Math Value (e.g. \mathbb&#123;Z&#125;^3 \oplus \mathbb&#123;Z&#125;_5)
                </label>
                <input
                  type="text"
                  required
                  value={appendValue}
                  onChange={e => setAppendValue(e.target.value)}
                  className="w-full border border-black p-2.5 font-mono text-xs focus:border-black focus:outline-none rounded-none transition-colors"
                />
                <div className="mt-2 p-3 bg-[#fafafa] border border-black text-sm font-serif">
                  <MathView math={`${appendKey} \\cong ${appendValue}`} />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  Your Email (Optional, for contributor trace)
                </label>
                <input
                  type="email"
                  value={contributorEmail}
                  onChange={e => setContributorEmail(e.target.value)}
                  placeholder="contributor@math.org"
                  className="w-full border border-black p-2.5 font-mono text-xs focus:border-black focus:outline-none rounded-none transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAppendModal(false)}
                  className="border border-black px-4 py-2 font-bold uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-colors rounded-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProperty}
                  className="bg-black text-white px-4 py-2 font-bold uppercase tracking-widest text-xs hover:bg-neutral-800 transition-colors rounded-none cursor-pointer"
                >
                  {isSubmittingProperty ? 'Submitting...' : 'Append Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
