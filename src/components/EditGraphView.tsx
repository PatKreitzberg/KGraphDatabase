import React, { useState, useEffect } from 'react';
import { Layers, FileText, Upload, CheckCircle, ArrowLeft, Send, Image as ImageIcon, X, Loader2, Eye, Search } from 'lucide-react';
import { MatrixBuilder } from './MatrixBuilder';
import { TextBlockEditor } from './TextBlockEditor';
import { HomologyEditor } from './HomologyEditor';
import { TextParseResult, KGraphProperties, CommutingPath, KGraph } from '../types';
import { api } from '../lib/api';
import { draftToTextBlock } from '../lib/parser';

interface EditGraphViewProps {
  graphId: string;
  editToken: string;
  onViewGraph: (graphId: string) => void;
  onReturnToSearch: () => void;
  onCancel: () => void;
}

export const EditGraphView: React.FC<EditGraphViewProps> = ({
  graphId,
  editToken,
  onViewGraph,
  onReturnToSearch,
  onCancel
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string>('');
  const [entryMethod, setEntryMethod] = useState<'matrix' | 'text' | 'file'>('matrix');

  // Step 1: Draft Data state
  const [draftData, setDraftData] = useState<{
    k: number;
    vertices: string[];
    edges: Record<string, [string, string, string][]>;
    commuting_squares: CommutingPath[];
    commuting_cubes: CommutingPath[];
  } | null>(null);
  const [draftText, setDraftText] = useState<string>('');

  // Step 2: Properties & Metadata state
  const [step, setStep] = useState<'input' | 'properties' | 'completed'>('input');
  const [graphName, setGraphName] = useState('');
  const [graphDescription, setGraphDescription] = useState('');
  const [paperCitation, setPaperCitation] = useState('');
  const [homologyMap, setHomologyMap] = useState<Record<string, string>>({});
  const [contactEmail, setContactEmail] = useState('');
  const [submitterName, setSubmitterName] = useState('');
  const [sourceFree, setSourceFree] = useState(false);
  const [sinkFree, setSinkFree] = useState(false);
  const [aperiodic, setAperiodic] = useState(false);
  const [cofinal, setCofinal] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Image states
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load initial graph data
  useEffect(() => {
    const fetchGraphToEdit = async () => {
      setLoading(true);
      setFetchError('');
      try {
        const data = await api.getGraphById(graphId);

        if (!data) {
          throw new Error('Could not load graph record from database.');
        }

        const g = data as KGraph;
        const draftObj = {
          k: g.k,
          vertices: g.vertices || [],
          edges: g.edges || {},
          commuting_squares: g.commuting_squares || [],
          commuting_cubes: g.commuting_cubes || []
        };
        setDraftData(draftObj);
        setDraftText(draftToTextBlock(draftObj));

        const props = g.properties || {};
        setGraphName(props.name || '');
        setGraphDescription(props.description || '');
        setPaperCitation(props.paper || '');
        setHomologyMap(props.homology || {});
        setSubmitterName(props.submitter_name || '');
        setContactEmail(props.contact_email || '');
        setSourceFree(!!props.source_free);
        setSinkFree(!!props.sink_free);
        setAperiodic(!!props.aperiodic);
        setCofinal(!!props.cofinal);
        setCustomTags(props.tags && Array.isArray(props.tags) ? props.tags : []);
        
        if (props.image_url) {
          setExistingImageUrl(props.image_url);
          setImagePreview(props.image_url);
        }
      } catch (err: any) {
        setFetchError(err.message || 'Failed to fetch graph details.');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphToEdit();
  }, [graphId]);

  useEffect(() => {
    if (step === 'properties') {
      const fetchTags = async () => {
        try {
          const data = await api.getAllProperties();
          if (data) {
            const tagSet = new Set<string>();
            data.forEach((item: any) => {
              if (item.properties && Array.isArray(item.properties.tags)) {
                item.properties.tags.forEach((t: string) => tagSet.add(t));
              }
            });
            setExistingTags(Array.from(tagSet).sort());
          }
        } catch (err) {
          console.error('Error fetching tags:', err);
        }
      };
      fetchTags();
    }
  }, [step]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setExistingImageUrl(null);
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
  };

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
    setDraftText(draftToTextBlock(data));
    setStep('properties');
  };

  // Handler for Text / File parser completion
  const handleTextComplete = (res: TextParseResult, submittedText: string) => {
    setDraftText(submittedText);
    if (res.graph) {
      setDraftData({
        k: res.graph.k,
        vertices: res.graph.vertices,
        edges: res.graph.edges,
        commuting_squares: res.graph.commuting_squares,
        commuting_cubes: res.graph.commuting_cubes
      });
      if (res.graph.properties) {
        if (res.graph.properties.name) setGraphName(res.graph.properties.name);
        if (res.graph.properties.description) setGraphDescription(res.graph.properties.description);
        if (res.graph.properties.paper) setPaperCitation(res.graph.properties.paper);
        if (res.graph.properties.homology) setHomologyMap(res.graph.properties.homology);
      }
      setStep('properties');
    }
  };

  const handleSaveEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftData || !graphName.trim()) {
      setErrorMessage('Please provide a valid graph structure and name.');
      return;
    }

    if (!submitterName.trim()) {
      setErrorMessage('Please provide your name as contributor.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setUploadStatus('');

    try {
      let finalImageUrl = existingImageUrl;
      if (selectedImage) {
        setUploadStatus('Uploading diagram image to storage...');
        finalImageUrl = await api.uploadImage(selectedImage);
        setUploadStatus('Saving graph updates to database...');
      }

      const updatedProperties = {
        name: graphName.trim() || undefined,
        description: graphDescription.trim() || undefined,
        paper: paperCitation.trim() || undefined,
        submitter_name: submitterName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        image_url: finalImageUrl || undefined,
        homology: homologyMap,
        tags: customTags.length > 0 ? customTags : undefined,
        source_free: sourceFree,
        sink_free: sinkFree,
        aperiodic: aperiodic,
        cofinal: cofinal
      };

      const res = await api.updateGraph({
        target_id: graphId,
        token: editToken,
        updated_k: draftData.k,
        updated_vertices: draftData.vertices,
        updated_edges: draftData.edges,
        updated_squares: draftData.commuting_squares,
        updated_cubes: draftData.commuting_cubes,
        updated_properties: updatedProperties
      });

      if (!res || !res.success) {
        throw new Error(res?.message || 'Failed to update graph. Invalid token or missing permissions.');
      }

      setStep('completed');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving updates to the graph.');
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center font-mono space-y-4 border border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-black" />
        <p className="text-sm font-bold uppercase tracking-wider text-black">Loading existing graph structure for editing...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-4xl mx-auto p-8 border border-red-700 bg-red-50 text-red-900 font-mono space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-base font-bold uppercase tracking-widest">Error Loading Graph</h3>
        <p className="text-xs">{fetchError}</p>
        <button
          onClick={onCancel}
          className="bg-black text-white px-4 py-2 font-bold text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors cursor-pointer rounded-none"
        >
          &larr; Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest bg-amber-200 text-amber-950 px-2 py-0.5 border border-amber-400 mr-2">
            Edit Mode Activated
          </span>
          <h2 className="text-xl font-bold uppercase tracking-tight text-black inline-block mt-2 sm:mt-0">
            Edit k-Graph: {graphName || `Graph ${graphId}`}
          </h2>
          <p className="text-xs text-neutral-600 mt-1 uppercase tracking-wider font-mono">
            Modifying existing structural matrices and metadata properties. All fields have been populated.
          </p>
        </div>
        <button
          onClick={onCancel}
          type="button"
          className="bg-white border border-black text-black text-xs font-bold uppercase tracking-widest px-4 py-2 hover:bg-neutral-100 transition-colors cursor-pointer rounded-none"
        >
          &larr; Cancel Editing
        </button>
      </div>

      {step === 'input' && draftData && (
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
              2. Block Syntax Editor
            </button>
            <button
              type="button"
              onClick={() => setEntryMethod('file')}
              className={`p-4 text-center flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                entryMethod === 'file' ? 'bg-black text-white font-bold' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              3. Text File Parser
            </button>
          </div>

          <div className="border border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            {entryMethod === 'matrix' ? (
              <MatrixBuilder
                initialK={draftData.k}
                initialVertices={draftData.vertices}
                initialEdges={draftData.edges}
                initialSquares={draftData.commuting_squares}
                initialCubes={draftData.commuting_cubes}
                onMatrixSubmit={handleMatrixComplete}
              />
            ) : (
              <div className="space-y-4">
                <p className="font-mono text-xs text-neutral-600">
                  Note: Switching to Block Syntax or Text File Parser allows you to overwrite the graph structure completely using raw text syntax.
                </p>
                <TextBlockEditor
                  initialText={draftText || (draftData ? draftToTextBlock(draftData) : '')}
                  onParsedSubmit={handleTextComplete}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'properties' && draftData && (
        <form onSubmit={handleSaveEdits} className="border border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-8">
          {/* SECTION 1: CONTRIBUTOR INFORMATION */}
          <div className="space-y-4">
            <div className="border-b border-black pb-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-black">1. Contributor Information</h4>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Your authorship identification and contact details</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  Your Name / Contributor Name (Required) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={submitterName}
                  onChange={e => setSubmitterName(e.target.value)}
                  placeholder="e.g. Prof. Jane Doe, Dr. Alex Vance"
                  className="w-full font-mono text-xs border border-black p-2.5 focus:border-black focus:outline-none rounded-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  Public Contact Email (Optional)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="public.contact@university.edu"
                  className="w-full font-mono text-xs border border-black p-2.5 focus:border-black focus:outline-none rounded-none transition-colors"
                />
                <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">
                  Displayed publicly on the graph record as a contact address.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: GRAPH INFORMATION */}
          <div className="border-t border-black pt-6 space-y-4">
            <div className="border-b border-black pb-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-black">2. Graph Information</h4>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Identification, summary description, and academic reference details</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  Graph Name (Required) <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={graphName}
                  onChange={e => setGraphName(e.target.value)}
                  placeholder="e.g. Higher Rank C*-Algebra Generator"
                  className="w-full font-mono text-xs border border-black p-2.5 focus:border-black focus:outline-none rounded-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
                  Graph Description (Optional)
                </label>
                <textarea
                  value={graphDescription}
                  onChange={e => setGraphDescription(e.target.value)}
                  rows={3}
                  placeholder="Provide a brief description of the graph, its mathematical significance, or construction details..."
                  className="w-full font-mono text-xs border border-black p-2.5 focus:border-black focus:outline-none rounded-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-1">
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
          </div>

          {/* SECTION 3: GRAPH PROPERTIES */}
          <div className="border-t border-black pt-6 space-y-6">
            <div className="border-b border-black pb-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-black">3. Graph Properties</h4>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Structural metrics, invariants, custom tags, and visual diagrams</p>
            </div>

            {/* Basic Information */}
            <div>
              <div className="bg-[#fafafa] border border-black p-4 font-mono text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-black col-span-2 md:col-span-4 mb-1">
                  Basic Information 
                </span>
                <div>Colors (k): <span className="font-bold text-black">{draftData.k}</span></div>
                <div>Vertices: <span className="font-bold text-black">{draftData.vertices.length}</span></div>
                <div>Commuting Squares: <span className="font-bold text-black">{draftData.commuting_squares.length}</span></div>
                <div>Commuting Cubes: <span className="font-bold text-black">{draftData.commuting_cubes.length}</span></div>
              </div>
            </div>

            {/* Structural Algebraic Properties Checkboxes */}
            <div className="border border-black bg-[#fafafa] p-4 space-y-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-black">
                Structural Properties (Check all that apply)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold uppercase text-black bg-white p-2.5 border border-black hover:bg-neutral-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={sourceFree}
                    onChange={e => setSourceFree(e.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  Source Free
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold uppercase text-black bg-white p-2.5 border border-black hover:bg-neutral-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={sinkFree}
                    onChange={e => setSinkFree(e.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  Sink Free
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold uppercase text-black bg-white p-2.5 border border-black hover:bg-neutral-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={aperiodic}
                    onChange={e => setAperiodic(e.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  Aperiodic
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold uppercase text-black bg-white p-2.5 border border-black hover:bg-neutral-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={cofinal}
                    onChange={e => setCofinal(e.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  Cofinal
                </label>
              </div>
            </div>

            {/* Groupoid Homology */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-black mb-2">
                Groupoid Homology Invariants
              </span>
              <HomologyEditor
                initialHomology={homologyMap}
                onChange={setHomologyMap}
                title="Groupoid Homology"
              />
            </div>

            {/* Custom Tags / Classifications */}
            <div className="border border-black bg-[#fafafa] p-4 space-y-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-black">
                Custom Tags &amp; Classifications (Optional)
              </span>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={e => {
                      setNewTagInput(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTagInput.trim() && !customTags.includes(newTagInput.trim())) {
                          setCustomTags([...customTags, newTagInput.trim()]);
                          setNewTagInput('');
                          setShowSuggestions(false);
                        }
                      }
                    }}
                    placeholder="e.g. Row-Finite, Strongly Connected"
                    className="flex-1 font-mono text-xs border border-black bg-white p-2.5 focus:border-black focus:outline-none rounded-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTagInput.trim() && !customTags.includes(newTagInput.trim())) {
                        setCustomTags([...customTags, newTagInput.trim()]);
                        setNewTagInput('');
                        setShowSuggestions(false);
                      }
                    }}
                    className="bg-black text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 hover:bg-neutral-800 transition-colors rounded-none cursor-pointer"
                  >
                    Add Tag
                  </button>
                </div>
                {showSuggestions && newTagInput.trim() && existingTags.some(t => t.toLowerCase().includes(newTagInput.trim().toLowerCase()) && !customTags.includes(t)) && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-48 overflow-y-auto">
                    {existingTags
                      .filter(t => t.toLowerCase().includes(newTagInput.trim().toLowerCase()) && !customTags.includes(t))
                      .map((tag, idx) => (
                        <div
                          key={idx}
                          onMouseDown={e => {
                            e.preventDefault();
                            setCustomTags([...customTags, tag]);
                            setNewTagInput('');
                            setShowSuggestions(false);
                          }}
                          className="px-3 py-2 font-mono text-xs font-bold uppercase cursor-pointer hover:bg-black hover:text-white transition-colors flex items-center justify-between border-b border-neutral-200 last:border-0"
                        >
                          <span>{tag}</span>
                          <span className="text-[10px] uppercase opacity-60">Existing Tag</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              {customTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {customTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-neutral-200 border border-neutral-400 text-neutral-900 font-mono text-xs font-bold uppercase px-2.5 py-1 flex items-center gap-1.5"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setCustomTags(customTags.filter((_, i) => i !== idx))}
                        className="text-neutral-500 hover:text-red-700 font-bold cursor-pointer"
                        title="Remove Tag"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Graph Diagram / Illustration Upload */}
            <div className="border-t border-black pt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-black" />
                Graph Diagram Selector / Illustration Image (Optional)
              </label>
              {!imagePreview ? (
                <label className="border border-dashed border-black bg-[#fafafa] p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-neutral-100 transition-colors">
                  <Upload className="w-6 h-6 text-neutral-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-black">Click to select an image (.PNG, .JPG, .SVG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="border border-black bg-[#fafafa] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={imagePreview} alt="Graph preview" className="w-20 h-20 object-contain border border-neutral-300 bg-white" />
                    <div className="font-mono">
                      <span className="block text-xs font-bold text-black uppercase">
                        {selectedImage ? selectedImage.name : 'Existing Diagram Attached'}
                      </span>
                      {selectedImage && (
                        <span className="block text-[10px] text-neutral-600">
                          {(selectedImage.size / 1024).toFixed(1)} KB - Ready for Upload
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="bg-white border border-black px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-black hover:bg-neutral-100 transition-colors cursor-pointer rounded-none">
                      Replace Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="bg-neutral-200 border border-black p-1.5 hover:bg-red-600 hover:text-white transition-colors text-black rounded-none cursor-pointer"
                      title="Remove Image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="border border-red-700 bg-red-100 text-red-900 px-4 py-3 font-mono text-xs uppercase font-bold">
              Error: {errorMessage}
            </div>
          )}

          {uploadStatus && (
            <div className="border border-blue-700 bg-blue-50 text-blue-950 px-4 py-3 font-mono text-xs uppercase font-bold flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadStatus}
            </div>
          )}

          <div className="flex justify-between items-center border-t border-black pt-6">
            <button
              type="button"
              onClick={() => setStep('input')}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-white border border-black px-6 py-3 font-bold text-xs uppercase tracking-widest text-black hover:bg-neutral-100 transition-colors rounded-none cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back: Edit Structure
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-black text-white px-8 py-3 font-bold text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-none cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Saving Updates...' : 'Save Graph Updates'}
            </button>
          </div>
        </form>
      )}

      {step === 'completed' && (
        <div className="border border-black bg-white p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6 text-center font-mono">
          <div className="inline-flex p-3 bg-emerald-100 border border-emerald-500 rounded-full text-emerald-700">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold uppercase tracking-tight text-black font-sans">
              Graph Successfully Updated!
            </h3>
            <p className="text-xs text-neutral-600 max-w-md mx-auto">
              Your modifications to graph <span className="font-bold text-black">{graphName}</span> have been permanently recorded and verified in the registry.
            </p>
          </div>

          <div className="pt-6 border-t border-black flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onViewGraph(graphId)}
              className="flex items-center gap-2 bg-black text-white px-6 py-3 font-bold text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-none cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              View Updated Graph
            </button>
            <button
              type="button"
              onClick={onReturnToSearch}
              className="flex items-center gap-2 bg-white border border-black text-black px-6 py-3 font-bold text-xs uppercase tracking-widest hover:bg-neutral-100 transition-colors rounded-none cursor-pointer"
            >
              <Search className="w-4 h-4" />
              Return to Search Registry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
