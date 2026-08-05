import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Search, Server, Layers, FileCode, ExternalLink, HelpCircle } from 'lucide-react';
import { AddGraphView } from './components/AddGraphView';
import { SearchGraphView } from './components/SearchGraphView';
import { GraphDetailView } from './components/GraphDetailView';
import { EditGraphView } from './components/EditGraphView';
import { EditTokenVerifyView } from './components/EditTokenVerifyView';
import { PhpExportModal } from './components/PhpExportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'add' | 'search' | 'detail' | 'verify_token' | 'edit_form'>('search');
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [activeEditToken, setActiveEditToken] = useState<string | undefined>(undefined);
  const [editOrigin, setEditOrigin] = useState<'search' | 'detail'>('search');
  const [isPhpModalOpen, setIsPhpModalOpen] = useState<boolean>(false);
  const [isAddGraphDirty, setIsAddGraphDirty] = useState<boolean>(false);

  const activeTabRef = useRef(activeTab);
  const isAddGraphDirtyRef = useRef(isAddGraphDirty);

  useEffect(() => {
    activeTabRef.current = activeTab;
    isAddGraphDirtyRef.current = isAddGraphDirty;
  }, [activeTab, isAddGraphDirty]);

  const confirmLeaveAddGraph = (): boolean => {
    if (activeTabRef.current === 'add' && isAddGraphDirtyRef.current) {
      const confirmed = window.confirm("You have unsaved modifications to your graph record. Are you sure you want to exit without saving?");
      if (confirmed) {
        setIsAddGraphDirty(false);
        isAddGraphDirtyRef.current = false;
        return true;
      }
      return false;
    }
    return true;
  };

  // Hash-based routing to support emailed token links e.g. #edit/graph-123?token=tok_xyz
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (activeTabRef.current === 'add' && hash !== 'add') {
        if (!confirmLeaveAddGraph()) {
          window.location.hash = 'add';
          return;
        }
      }

      if (hash.startsWith('edit/')) {
        const parts = hash.split('?');
        const id = parts[0].replace(/^edit\//, '');
        const params = new URLSearchParams(parts[1] || '');
        const token = params.get('token') || undefined;

        setSelectedGraphId(id);
        if (token) {
          setActiveEditToken(token);
          setActiveTab('edit_form');
        } else {
          setActiveEditToken(undefined);
          setActiveTab('verify_token');
        }
      } else if (hash.startsWith('detail/')) {
        const parts = hash.split('?');
        const id = parts[0].replace(/^detail\//, '');
        const params = new URLSearchParams(parts[1] || '');
        const token = params.get('token') || undefined;

        setSelectedGraphId(id);
        if (token) setActiveEditToken(token);
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
    setIsAddGraphDirty(false);
    isAddGraphDirtyRef.current = false;
    setSelectedGraphId(graphId);
    setActiveEditToken(token);
    setActiveTab('detail');
    window.location.hash = `detail/${graphId}?token=${token}`;
  };

  const handleSelectGraph = (graphId: string) => {
    setSelectedGraphId(graphId);
    setActiveTab('detail');
    window.location.hash = `detail/${graphId}`;
  };

  const handleStartEdit = (graphId: string, origin: 'search' | 'detail') => {
    setEditOrigin(origin);
    const tokenToUse = (selectedGraphId === graphId && activeEditToken) ? activeEditToken : undefined;
    setSelectedGraphId(graphId);
    if (tokenToUse) {
      setActiveTab('edit_form');
      window.location.hash = `edit/${graphId}?token=${tokenToUse}`;
    } else {
      setActiveEditToken(undefined);
      setActiveTab('verify_token');
      window.location.hash = `edit/${graphId}`;
    }
  };

  const handleCancelEdit = () => {
    if (editOrigin === 'detail' && selectedGraphId) {
      setActiveTab('detail');
      window.location.hash = `detail/${selectedGraphId}`;
    } else {
      setActiveTab('search');
      window.location.hash = 'search';
    }
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
              onClick={(e) => {
                if (!confirmLeaveAddGraph()) {
                  e.preventDefault();
                  return;
                }
                setActiveTab('search');
                window.location.hash = 'search';
              }}
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
              onClick={(e) => {
                if (!confirmLeaveAddGraph()) {
                  e.preventDefault();
                  return;
                }
                setActiveTab('search');
                window.location.hash = 'search';
              }}
              className={`px-3 py-2 border border-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'search' || activeTab === 'verify_token' || activeTab === 'edit_form'
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
        {activeTab === 'add' && <AddGraphView onGraphSaved={handleGraphSaved} onDirtyChange={setIsAddGraphDirty} />}
        
        <div className={activeTab === 'search' ? '' : 'hidden'}>
          <SearchGraphView
            onSelectGraph={handleSelectGraph}
            onEditGraph={id => handleStartEdit(id, 'search')}
          />
        </div>

        {activeTab === 'detail' && selectedGraphId && (
          <GraphDetailView
            graphId={selectedGraphId}
            initialToken={activeEditToken}
            onBack={() => {
              setActiveTab('search');
              window.location.hash = 'search';
            }}
            onEditGraph={id => handleStartEdit(id, 'detail')}
          />
        )}

        {activeTab === 'verify_token' && selectedGraphId && (
          <EditTokenVerifyView
            graphId={selectedGraphId}
            origin={editOrigin}
            onSuccess={token => {
              setActiveEditToken(token);
              setActiveTab('edit_form');
              window.location.hash = `edit/${selectedGraphId}?token=${token}`;
            }}
            onBack={handleCancelEdit}
          />
        )}

        {activeTab === 'edit_form' && selectedGraphId && (
          <EditGraphView
            graphId={selectedGraphId}
            editToken={activeEditToken || ''}
            onViewGraph={id => {
              setSelectedGraphId(id);
              setActiveTab('detail');
              window.location.hash = `detail/${id}`;
            }}
            onReturnToSearch={() => {
              setActiveTab('search');
              window.location.hash = 'search';
            }}
            onCancel={handleCancelEdit}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 border-t border-black bg-white flex flex-wrap justify-between items-center text-[9px] uppercase font-bold tracking-[0.2em] text-neutral-500 gap-4 mt-12">
        <span></span>
        <span>Created by Patrick Kreitzberg</span>
        <span></span>
      </footer>

      {/* PHP Export Modal */}
      <PhpExportModal
        isOpen={isPhpModalOpen}
        onClose={() => setIsPhpModalOpen(false)}
      />
    </div>
  );
}
