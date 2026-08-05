import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Server, Layers, FileCode, ExternalLink, HelpCircle } from 'lucide-react';
import { AddGraphView } from './components/AddGraphView';
import { SearchGraphView } from './components/SearchGraphView';
import { GraphDetailView } from './components/GraphDetailView';
import { PhpExportModal } from './components/PhpExportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'add' | 'search' | 'detail'>('search');
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [activeEditToken, setActiveEditToken] = useState<string | undefined>(undefined);
  const [isPhpModalOpen, setIsPhpModalOpen] = useState<boolean>(false);

  // Hash-based routing to support emailed token links e.g. #edit/graph-123?token=tok_xyz
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash.startsWith('edit/') || hash.startsWith('detail/')) {
        const parts = hash.split('?');
        const pathPart = parts[0];
        const queryPart = parts[1] || '';

        const id = pathPart.replace(/^(edit|detail)\//, '');
        const params = new URLSearchParams(queryPart);
        const token = params.get('token') || undefined;

        setSelectedGraphId(id);
        setActiveEditToken(token);
        setActiveTab('detail');
      } else if (hash === 'add') {
        setActiveTab('add');
      } else {
        setActiveTab('search');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleGraphSaved = (graphId: string, token: string) => {
    setSelectedGraphId(graphId);
    setActiveEditToken(token);
    setActiveTab('detail');
    window.location.hash = `edit/${graphId}?token=${token}`;
  };

  const handleSelectGraph = (graphId: string) => {
    setSelectedGraphId(graphId);
    setActiveEditToken(undefined);
    setActiveTab('detail');
    window.location.hash = `detail/${graphId}`;
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col border-0 sm:border-8 border-black">
      {/* Top Header */}
      <header className="border-b border-black bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex flex-col">
            <a
              href="#search"
              onClick={() => setActiveTab('search')}
              className="text-2xl font-bold tracking-tighter uppercase text-black flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="bg-black text-white px-2 py-0.5 text-lg font-mono font-bold">K</span>
              K-Graph Database
            </a>
            <span className="text-[10px] tracking-widest text-neutral-500 uppercase font-mono">
              Mathematical Structure Repository • JSON Storage (graphs.json)
            </span>
          </div>

          {/* Navigation Controls */}
          <nav className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest">
            <button
              onClick={() => {
                setActiveTab('add');
                window.location.hash = 'add';
              }}
              className={`px-3 py-2 border border-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-black text-white font-bold'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Graph
            </button>

            <button
              onClick={() => {
                setActiveTab('search');
                window.location.hash = 'search';
              }}
              className={`px-3 py-2 border border-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-black text-white font-bold'
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Search Registry
            </button>

            <button
              onClick={() => setIsPhpModalOpen(true)}
              className="px-3 py-2 border border-black bg-neutral-100 hover:bg-black hover:text-white transition-all text-black flex items-center gap-1.5 cursor-pointer"
              title="View Namecheap cPanel PHP export bundle"
            >
              <Server className="w-3.5 h-3.5" />
              cPanel PHP Bundle
            </button>
          </nav>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'add' && <AddGraphView onGraphSaved={handleGraphSaved} />}
        {activeTab === 'search' && <SearchGraphView onSelectGraph={handleSelectGraph} />}
        {activeTab === 'detail' && selectedGraphId && (
          <GraphDetailView
            graphId={selectedGraphId}
            initialToken={activeEditToken}
            onBack={() => {
              setActiveTab('search');
              window.location.hash = 'search';
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 border-t border-black bg-white flex flex-wrap justify-between items-center text-[9px] uppercase font-bold tracking-[0.2em] text-neutral-500 gap-4 mt-12">
        <span>Flat JSON Storage (graphs.json)</span>
        <span>v1.0.4 Pre-Alpha</span>
        <span>Validator Status: <span className="text-black underline font-bold">Python &amp; PHP Ready</span></span>
      </footer>

      {/* PHP Export Modal */}
      <PhpExportModal
        isOpen={isPhpModalOpen}
        onClose={() => setIsPhpModalOpen(false)}
      />
    </div>
  );
}
