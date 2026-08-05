import React, { useState } from 'react';
import { Layers, FileText, Upload, CheckCircle, Copy, Link, Mail, ArrowLeft, Send } from 'lucide-react';
import { MatrixBuilder } from './MatrixBuilder';
import { TextBlockEditor } from './TextBlockEditor';
import { HomologyEditor } from './HomologyEditor';
import { TextParseResult, KGraphProperties, CommutingPath } from '../types';
import { supabase } from '../lib/supabase';

interface AddGraphViewProps {
  onGraphSaved: (graphId: string, token: string) => void;
}

export const AddGraphView: React.FC<AddGraphViewProps> = ({ onGraphSaved }) => {
  const [entryMethod, setEntryMethod] = useState<'matrix' | 'text' | 'file'>('matrix');

  // Step 1: Draft Data state
  const [draftData, setDraftData] = useState<{
    k: number;
    vertices: string[];
    edges: Record<string, [string, string, string][]>;
    commuting_squares: CommutingPath[];
    commuting_cubes: CommutingPath[];
  } | null>(null);

  // Step 2: Properties & Submitter Email state
  const [step, setStep] = useState<'input' | 'properties' | 'completed'>('input');
  const [graphName, setGraphName] = useState('');
  const [paperCitation, setPaperCitation] = useState('');
  const [homologyMap, setHomologyMap] = useState<Record<string, string>>({
    H0: '0',
    H1: '\\mathbb{Z}'
  });
  const [ownerEmail, setOwnerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Result state
  const [createdResult, setCreatedResult] = useState<{
    id: string;
    token: string;
    editUrl: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Handler for Matrix Builder submission
  const handleMatrixComplete = (data: {
    k: number;
    vertices: string[];
    edges: Record<string, [string, string, string][]>;
    commuting_squares: CommutingPath[];
    commuting_cubes: CommutingPath[];
  }) => {
    setDraftData({
      k: data.k,
      vertices: data.vertices,
      edges: data.edges,
      commuting_squares: data.commuting_squares,
      commuting_cubes: data.commuting_cubes
    });
    setStep('properties');
  };

  // Handler for Text / File parser completion
  const handleTextComplete = (res: TextParseResult) => {
    if (res.graph) {
      setDraftData({
        k: res.graph.k,
        vertices: res.graph.vertices,
        edges: res.graph.edges,
        commuting_squares: res.graph.commuting_squares,
        commuting_cubes: res.graph.commuting_cubes
      });

      if (res.graph.properties?.name) setGraphName(res.graph.properties.name);
      if (res.graph.properties?.paper) setPaperCitation(res.graph.properties.paper);
      if (res.graph.properties?.homology) setHomologyMap(res.graph.properties.homology);

      setStep('properties');
    }
  };

  // Final Save handler
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftData) return;

    if (!ownerEmail || !ownerEmail.includes('@')) {
      setErrorMessage('Please enter a valid submitter email address. The edit token link will be associated with this address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      k: draftData.k,
      vertices: draftData.vertices,
      edges: draftData.edges,
      commuting_squares: draftData.commuting_squares,
      commuting_cubes: draftData.commuting_cubes,
      owner_email: ownerEmail.trim(),
      properties: {
        name: graphName.trim() || undefined,
        paper: paperCitation.trim() || undefined,
        homology: homologyMap
      }
    };

    try {
      const { data, error } = await supabase.rpc('create_graph', {
        owner_email: payload.owner_email,
        k: payload.k,
        vertices: payload.vertices,
        edges: payload.edges,
        commuting_squares: payload.commuting_squares,
        commuting_cubes: payload.commuting_cubes,
        properties: payload.properties
      });

      if (error) {
        throw new Error(error.message || 'Failed to create graph');
      }

      if (!data || !data.success) {
        throw new Error('Failed to create graph');
      }

      setCreatedResult({
        id: data.id,
        token: data.raw_token,
        editUrl: `${window.location.origin}/#edit/${data.id}?token=${data.raw_token}`
      });
      setStep('completed');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving the graph.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdResult) return;
    navigator.clipboard.writeText(createdResult.editUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Title Header */}
      <div className="border-b border-black pb-4">
        <h2 className="text-xl font-bold uppercase tracking-tight text-black">Submit New k-Graph</h2>
        <p className="text-xs text-neutral-600 mt-1 uppercase tracking-wider">
          Construct higher-rank graph architectures via adjacency matrices, block syntax, or plain text uploads.
        </p>
      </div>

      {step === 'input' && (
        <div className="space-y-6">
          {/* Entry Method Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 border border-black bg-neutral-100 text-xs font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setEntryMethod('matrix')}
              className={`p-4 text-center border-b md:border-b-0 md:border-r border-black flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                entryMethod === 'matrix' ? 'bg-black text-white font-bold' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              1. Adjacency Matrix Builder
            </button>
            <button
              type="button"
              onClick={() => setEntryMethod('text')}
              className={`p-4 text-center border-b md:border-b-0 md:border-r border-black flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                entryMethod === 'text' ? 'bg-black text-white font-bold' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              2. Manual Text Block
            </button>
            <button
              type="button"
              onClick={() => setEntryMethod('file')}
              className={`p-4 text-center flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                entryMethod === 'file' ? 'bg-black text-white font-bold' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              3. .txt File Upload
            </button>
          </div>

          {/* Render Active Entry Mode */}
          {entryMethod === 'matrix' && <MatrixBuilder onMatrixSubmit={handleMatrixComplete} />}
          {(entryMethod === 'text' || entryMethod === 'file') && (
            <TextBlockEditor onParsedSubmit={handleTextComplete} />
          )}
        </div>
      )}

      {step === 'properties' && draftData && (
        <form onSubmit={handleFinalSubmit} className="space-y-6 border border-black p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between border-b border-black pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">Step 2 of 2</span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">Graph Properties &amp; Submitter Contact</h3>
            </div>
            <button
              type="button"
              onClick={() => setStep('input')}
              className="text-xs font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white flex items-center gap-1 border border-black px-3 py-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          {/* Graph Data Summary Badge */}
          <div className="bg-[#fafafa] border border-black p-4 font-mono text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>Colors (k): <span className="font-bold text-black">{draftData.k}</span></div>
            <div>Vertices: <span className="font-bold text-black">{draftData.vertices.length}</span></div>
            <div>Commuting Squares: <span className="font-bold text-black">{draftData.commuting_squares.length}</span></div>
            <div>Commuting Cubes: <span className="font-bold text-black">{draftData.commuting_cubes.length}</span></div>
          </div>

          {/* Homology Signature Editor */}
          <HomologyEditor
            initialHomology={homologyMap}
            onChange={setHomologyMap}
            title="Graph Homology Group Signature"
          />

          {/* Meta Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                Graph Name (Optional)
              </label>
              <input
                type="text"
                value={graphName}
                onChange={e => setGraphName(e.target.value)}
                placeholder="e.g. Higher Rank C*-Algebra Generator"
                className="w-full font-mono text-xs border border-black p-2.5 focus:border-black focus:outline-none rounded-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                Paper Citation (Optional)
              </label>
              <input
                type="text"
                value={paperCitation}
                onChange={e => setPaperCitation(e.target.value)}
                placeholder="e.g. ArXiv:2026.12345, J. Topology 2025"
                className="w-full font-mono text-xs border border-black p-2.5 focus:border-black focus:outline-none rounded-none transition-colors"
              />
            </div>
          </div>

          {/* Required Submitter Email */}
          <div className="border-t border-black pt-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-black" />
              Submitter Email (Required) <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              required
              value={ownerEmail}
              onChange={e => setOwnerEmail(e.target.value)}
              placeholder="researcher@university.edu"
              className="w-full font-mono text-xs border border-black p-2.5 focus:border-black focus:outline-none rounded-none transition-colors"
            />
            <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">
              An edit token will be generated and sent to this address upon successful validation.
            </p>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-black text-red-900 font-mono text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white text-xs font-bold uppercase tracking-widest py-4 px-4 hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center gap-2 rounded-none"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Saving Graph Record...' : 'Validate & Save'}
            </button>
          </div>
        </form>
      )}

      {step === 'completed' && createdResult && (
        <div className="border border-black p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 text-xs font-sans">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm uppercase tracking-wider">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            Graph Successfully Stored in Database!
          </div>

          <div className="bg-[#fafafa] border border-black p-4 space-y-3 font-mono">
            <div>
              <span className="text-neutral-500 block uppercase text-[10px]">Assigned Graph ID:</span>
              <span className="font-bold text-black text-sm">{createdResult.id}</span>
            </div>

            <div>
              <span className="text-neutral-500 block uppercase text-[10px]">Raw Edit Token:</span>
              <span className="font-bold text-black bg-white px-2 py-0.5 border border-black">
                {createdResult.token}
              </span>
            </div>

            <div>
              <span className="text-neutral-500 block uppercase text-[10px] mb-1">Direct Structure Edit Link:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdResult.editUrl}
                  className="flex-1 border border-black p-2 bg-white font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="bg-black text-white px-4 py-2 font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-neutral-800 transition-colors cursor-pointer rounded-none"
                >
                  <Copy className="w-4 h-4" />
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onGraphSaved(createdResult.id, createdResult.token)}
              className="bg-black text-white font-bold uppercase tracking-wider px-4 py-3 hover:bg-neutral-800 transition-colors rounded-none"
            >
              View Graph Details &amp; Visualizer
            </button>
            <button
              onClick={() => {
                setStep('input');
                setDraftData(null);
                setCreatedResult(null);
              }}
              className="border border-black px-4 py-3 font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors rounded-none"
            >
              Add Another Graph
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
