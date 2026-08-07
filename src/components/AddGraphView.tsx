import React, { useState, useEffect } from 'react';
import { Layers, FileText, Upload, CheckCircle, Copy, Link, Mail, ArrowLeft, Send, Image as ImageIcon, X } from 'lucide-react';
import { MatrixBuilder } from './MatrixBuilder';
import { TextBlockEditor } from './TextBlockEditor';
import { HomologyEditor } from './HomologyEditor';
import { TextParseResult, KGraphProperties, CommutingPath } from '../types';
import { api } from '../lib/api';
import { draftToTextBlock } from '../lib/parser';

interface AddGraphViewProps {
  onGraphSaved: (graphId: string, token: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const AddGraphView: React.FC<AddGraphViewProps> = ({ onGraphSaved, onDirtyChange }) => {
  const [entryMethod, setEntryMethod] = useState<'matrix' | 'text' | 'file'>('matrix');
  const [isModified, setIsModified] = useState<boolean>(false);

  // Step 1: Draft Data state
  const [draftData, setDraftData] = useState<{
    k: number;
    vertices: string[];
    edges: Record<string, [string, string, string][]>;
    commuting_squares: CommutingPath[];
    commuting_cubes: CommutingPath[];
  } | null>(null);
  const [draftText, setDraftText] = useState<string>('');

  // Step 2: Properties & Submitter Email state
  const [step, setStep] = useState<'input' | 'properties' | 'completed'>('input');
  const [graphName, setGraphName] = useState('');
  const [graphDescription, setGraphDescription] = useState('');
  const [paperCitation, setPaperCitation] = useState('');
  const [homologyMap, setHomologyMap] = useState<Record<string, string>>({});
  const [ownerEmail, setOwnerEmail] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [sameAsEdit, setSameAsEdit] = useState(false);
  const [submitterName, setSubmitterName] = useState('');
  const [sourceFree, setSourceFree] = useState(false);
  const [sinkFree, setSinkFree] = useState(false);
  const [aperiodic, setAperiodic] = useState(false);
  const [cofinal, setCofinal] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const [showExistingUserModal, setShowExistingUserModal] = useState<boolean>(false);
  const [existingUserEmail, setExistingUserEmail] = useState<string>('');
  const [emailRequestStatus, setEmailRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const dirty = (step !== 'completed') && (
      isModified ||
      step === 'properties' ||
      graphName !== '' ||
      graphDescription !== '' ||
      paperCitation !== '' ||
      ownerEmail !== '' ||
      contactEmail !== '' ||
      submitterName !== '' ||
      sourceFree ||
      sinkFree ||
      aperiodic ||
      cofinal ||
      customTags.length > 0 ||
      Object.keys(homologyMap).length > 0
    );
    onDirtyChange?.(dirty);
  }, [isModified, step, graphName, graphDescription, paperCitation, ownerEmail, contactEmail, submitterName, sourceFree, sinkFree, aperiodic, cofinal, customTags, homologyMap, onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step !== 'completed' && (isModified || step === 'properties')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step, isModified]);

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

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

      if (res.graph.properties?.name) setGraphName(res.graph.properties.name);
      if (res.graph.properties?.description) setGraphDescription(res.graph.properties.description);
      if (res.graph.properties?.paper) setPaperCitation(res.graph.properties.paper);
      if (res.graph.properties?.submitter_name) setSubmitterName(res.graph.properties.submitter_name);
      if (res.graph.properties?.contact_email) {
        setOwnerEmail(res.graph.properties.contact_email);
        setContactEmail(res.graph.properties.contact_email);
        setSameAsEdit(true);
      }
      if (res.graph.properties?.homology) setHomologyMap(res.graph.properties.homology);
      if (res.graph.properties?.tags) setCustomTags(res.graph.properties.tags);
      if (res.graph.properties?.source_free !== undefined) setSourceFree(!!res.graph.properties.source_free);
      if (res.graph.properties?.sink_free !== undefined) setSinkFree(!!res.graph.properties.sink_free);
      if (res.graph.properties?.aperiodic !== undefined) setAperiodic(!!res.graph.properties.aperiodic);
      if (res.graph.properties?.cofinal !== undefined) setCofinal(!!res.graph.properties.cofinal);

      setStep('properties');
    }
  };

  // Final Save handler
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftData) return;

    if (!submitterName.trim()) {
      setErrorMessage('Please enter your contributor name (Required).');
      return;
    }

    if (!ownerEmail || !ownerEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address for edit token delivery (Required).');
      return;
    }

    if (!graphName.trim()) {
      setErrorMessage('Please enter a graph name (Required).');
      return;
    }

    const finalContactEmail = sameAsEdit ? ownerEmail.trim() : contactEmail.trim();

    setIsSubmitting(true);
    setErrorMessage('');
    setUploadStatus('');

    try {
      let uploadedImageUrl: string | undefined = undefined;
      if (selectedImage) {
        setUploadStatus('Uploading diagram image to storage...');
        uploadedImageUrl = await api.uploadImage(selectedImage);
        setUploadStatus('Saving graph record to database...');
      }

      const payload = {
        k: draftData.k,
        vertices: draftData.vertices,
        edges: draftData.edges,
        commuting_squares: draftData.commuting_squares,
        commuting_cubes: draftData.commuting_cubes,
        owner_email: ownerEmail.trim(),
        properties: {
          name: graphName.trim() || undefined,
          description: graphDescription.trim() || undefined,
          paper: paperCitation.trim() || undefined,
          submitter_name: submitterName.trim() || undefined,
          contact_email: finalContactEmail || undefined,
          image_url: uploadedImageUrl,
          homology: homologyMap,
          tags: customTags.length > 0 ? customTags : undefined,
          source_free: sourceFree,
          sink_free: sinkFree,
          aperiodic: aperiodic,
          cofinal: cofinal
        }
      };

      const res = await api.createGraph({
        owner_email: payload.owner_email,
        k: payload.k,
        vertices: payload.vertices,
        edges: payload.edges,
        commuting_squares: payload.commuting_squares,
        commuting_cubes: payload.commuting_cubes,
        properties: payload.properties
      });

      if (!res || !res.success) {
        throw new Error('Failed to create graph');
      }

      if (res.is_existing_user) {
        setExistingUserEmail(payload.owner_email);
        setShowExistingUserModal(true);
      }

      setCreatedResult({
        id: res.id,
        token: res.raw_token,
        editUrl: `${window.location.origin}/#edit/${res.id}?token=${res.raw_token}`
      });
      setStep('completed');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving the graph.');
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
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
          {entryMethod === 'matrix' && (
            <MatrixBuilder
              initialK={draftData?.k}
              initialVertices={draftData?.vertices}
              initialEdges={draftData?.edges}
              initialSquares={draftData?.commuting_squares}
              initialCubes={draftData?.commuting_cubes}
              onDirty={() => setIsModified(true)}
              onMatrixSubmit={handleMatrixComplete}
            />
          )}
          {(entryMethod === 'text' || entryMethod === 'file') && (
            <TextBlockEditor
              initialText={draftText || (draftData ? draftToTextBlock(draftData) : '')}
              onDirty={() => setIsModified(true)}
              onParsedSubmit={handleTextComplete}
            />
          )}
        </div>
      )}

      {step === 'properties' && draftData && (
        <form onSubmit={handleFinalSubmit} className="space-y-6 border border-black p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between border-b border-black pb-3">
            <button
              type="button"
              onClick={() => setStep('input')}
              className="text-xs font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white flex items-center gap-1 border border-black px-3 py-1 transition-colors">

              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">Step 2 of 2</span>
            </div>

          </div>

          {/* SECTION 1: CONTRIBUTOR INFORMATION */}
          <div className="space-y-4">
            <div className="border-b border-black pb-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-black">1. Contributor Information</h4>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Contributor identification and edit token delivery details</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-black" />
                  Edit Token Email Address (Required) <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={e => {
                    setOwnerEmail(e.target.value);
                    if (sameAsEdit) setContactEmail(e.target.value);
                  }}
                  placeholder="researcher@university.edu"
                  className="w-full font-mono text-xs border border-black p-2.5 focus:border-black focus:outline-none rounded-none transition-colors"
                />
                <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">
                  Email address to which the edit token will be sent and associated.
                </p>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-black" />
                    Public Contact Email (Optional)
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold uppercase tracking-wider text-neutral-700 select-none">
                    <input
                      type="checkbox"
                      checked={sameAsEdit}
                      onChange={e => {
                        const checked = e.target.checked;
                        setSameAsEdit(checked);
                        if (checked) setContactEmail(ownerEmail);
                      }}
                      className="w-3.5 h-3.5 accent-black"
                    />
                    Same as edit email
                  </label>
                </div>
                <input
                  type="email"
                  disabled={sameAsEdit}
                  value={sameAsEdit ? ownerEmail : contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="public.contact@university.edu"
                  className="w-full font-mono text-xs border border-black p-2.5 bg-white disabled:bg-neutral-100 disabled:text-neutral-600 focus:border-black focus:outline-none rounded-none transition-colors"
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
                <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">
                  Summary description explaining properties, motivations, or mathematical context of this graph.
                </p>
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
              <span className="block text-[11px] font-bold uppercase tracking-wider text-black">
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
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                Add additional custom properties or descriptive tags (e.g., &quot;Row-Finite&quot;, &quot;Rank-3 Basic&quot;). Press Enter or click Add Tag to attach.
              </p>
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
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500">Image will be hosted securely on server storage</span>
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
                    <div>
                      <div className="text-xs font-mono font-bold text-black">{selectedImage?.name}</div>
                      <div className="text-[10px] font-mono text-neutral-500">{selectedImage ? Math.round(selectedImage.size / 1024) + ' KB' : ''}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-xs font-bold uppercase tracking-wider bg-black text-white px-3 py-2 hover:bg-red-700 transition-colors flex items-center gap-1 cursor-pointer rounded-none"
                  >
                    <X className="w-3.5 h-3.5" /> Remove Image
                  </button>
                </div>
              )}
            </div>
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
              {isSubmitting ? (uploadStatus || 'Saving Graph Record...') : 'Validate & Save'}
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
                setGraphName('');
                setGraphDescription('');
                setPaperCitation('');
                setSubmitterName('');
                setOwnerEmail('');
                setContactEmail('');
                setSameAsEdit(false);
                setHomologyMap({});
                setCustomTags([]);
                setNewTagInput('');
                setCreatedResult(null);
                setSourceFree(false);
                setSinkFree(false);
                setAperiodic(false);
                setCofinal(false);
                setIsModified(false);
                handleRemoveImage();
              }}
              className="border border-black px-4 py-3 font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors rounded-none"
            >
              Add Another Graph
            </button>
          </div>
        </div>
      )}

      {/* Existing User Modal */}
      {showExistingUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-w-md w-full">
            <h3 className="text-lg font-bold uppercase tracking-tight mb-2">Previous Submitter Detected</h3>
            <p className="text-xs mb-4 text-neutral-600 font-mono">
              You have submitted before. Do you want another email with your edit token?
            </p>
            {emailRequestStatus === 'error' && <p className="text-red-600 text-xs font-bold mb-4">Error sending email.</p>}
            {emailRequestStatus === 'sent' && <p className="text-emerald-600 text-xs font-bold mb-4">Email request processed!</p>}
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => {
                  setShowExistingUserModal(false);
                  setEmailRequestStatus('idle');
                }}
                disabled={emailRequestStatus === 'sending'}
                className="px-4 py-2 border border-black text-xs font-bold uppercase hover:bg-neutral-100 disabled:opacity-50 cursor-pointer"
              >
                No
              </button>
              <button 
                onClick={async () => {
                  if (emailRequestStatus === 'sent') return;
                  setEmailRequestStatus('sending');
                  try {
                    await api.requestTokenEmail(existingUserEmail);
                    setEmailRequestStatus('sent');
                    setTimeout(() => {
                      setShowExistingUserModal(false);
                      setEmailRequestStatus('idle');
                    }, 2000);
                  } catch (e) {
                    setEmailRequestStatus('error');
                  }
                }}
                disabled={emailRequestStatus === 'sending' || emailRequestStatus === 'sent'}
                className="px-4 py-2 bg-black text-white text-xs font-bold uppercase hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
              >
                {emailRequestStatus === 'sending' ? 'Sending...' : emailRequestStatus === 'sent' ? 'Sent' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
