import React, { useState } from 'react';
import { Download, Copy, Check, Server, FileCode, Shield } from 'lucide-react';

interface PhpExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PHP_DB_HELPER = `<?php
// db.php - Thread-safe flock() JSON storage helper for Namecheap Stellar cPanel
$DB_FILE = __DIR__ . '/graphs.json';

function get_all_graphs() {
    global $DB_FILE;
    if (!file_exists($DB_FILE)) {
        return [];
    }
    $fp = fopen($DB_FILE, 'r');
    if (!$fp) return [];
    
    // Acquire shared read lock
    flock($fp, LOCK_SH);
    $content = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function save_graph($new_graph) {
    global $DB_FILE;
    $fp = fopen($DB_FILE, 'c+');
    if (!$fp) return false;
    
    // Acquire exclusive write lock to prevent race condition corruption
    if (flock($fp, LOCK_EX)) {
        $content = stream_get_contents($fp);
        $graphs = json_decode($content, true);
        if (!is_array($graphs)) {
            $graphs = [];
        }
        
        // Unshift new graph record
        array_unshift($graphs, $new_graph);
        
        // Truncate and write
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($graphs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
    fclose($fp);
    return false;
}
?>`;

const PHP_ADD_PAGE = `<?php
// add.php - Submitting new k-graphs
require_once 'db.php';

$error = '';
$success_token = '';
$new_id = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw_input = $_POST['text_block'] ?? '';
    $email = trim($_POST['owner_email'] ?? '');
    
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'A valid owner email address is required.';
    } else {
        // Parse block text or matrix data
        $token = 'tok_' . bin2hex(random_bytes(16));
        $edit_hash = hash('sha256', $token);
        $id = 'graph-' . substr(uniqid(), -8);
        
        $new_record = [
            'id' => $id,
            'edit_token_hash' => $edit_hash,
            'owner_email' => $email,
            'created_at' => date('c'),
            'k' => (int)($_POST['k'] ?? 1),
            'vertices' => explode(' ', trim($_POST['vertices_raw'] ?? 'v0 v1')),
            'edges' => json_decode($_POST['edges_json'] ?? '{}', true),
            'commuting_squares' => json_decode($_POST['squares_json'] ?? '[]', true),
            'commuting_cubes' => json_decode($_POST['cubes_json'] ?? '[]', true),
            'properties' => [
                'name' => $_POST['graph_name'] ?? '',
                'paper' => $_POST['paper_citation'] ?? '',
                'homology' => json_decode($_POST['homology_json'] ?? '{}', true)
            ],
            'property_logs' => []
        ];
        
        if (save_graph($new_record)) {
            $new_id = $id;
            $success_token = $token;
        } else {
            $error = 'Failed to write to graphs.json file lock.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Add K-Graph - PHP Version</title>
    <style>
        body { font-family: monospace; background: #ffffff; color: #000000; padding: 2rem; max-width: 800px; margin: 0 auto; }
        .border { border: 1px solid #000; padding: 1rem; margin-bottom: 1rem; }
        input, textarea, button { font-family: inherit; width: 100%; padding: 0.5rem; margin-top: 0.25rem; }
        button { background: #000; color: #fff; border: none; cursor: pointer; }
    </style>
</head>
<body>
    <h1>Add K-Graph (PHP / cPanel)</h1>
    <?php if ($success_token): ?>
        <div class="border" style="background:#e6ffe6;">
            <strong>Graph Saved Successfully!</strong><br>
            Direct Edit URL: <code>edit.php?id=<?= $new_id ?>&token=<?= $success_token ?></code>
        </div>
    <?php endif; ?>
    <?php if ($error): ?>
        <div class="border" style="background:#ffe6e6;"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <!-- Form implementation -->
</body>
</html>`;

export const PhpExportModal: React.FC<PhpExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'db' | 'add'>('db');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = activeTab === 'db' ? PHP_DB_HELPER : PHP_ADD_PAGE;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-black w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        {/* Header */}
        <div className="p-4 border-b border-black bg-[#fafafa] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-black flex items-center gap-2">
              <Server className="w-4 h-4 text-black" />
              Namecheap Stellar cPanel PHP &amp; `flock()` Export Bundle
            </h3>
            <p className="text-[10px] uppercase text-neutral-500 tracking-wider mt-0.5">
              Native PHP scripts with strict `flock()` atomic read-write file locking for `graphs.json`.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:bg-black hover:text-white font-bold text-xs border border-black px-3 py-1 transition-colors cursor-pointer rounded-none"
          >
            Close ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-black bg-neutral-100 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('db')}
            className={`px-4 py-3 border-r border-black cursor-pointer transition-colors ${
              activeTab === 'db' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            db.php (Thread-Safe flock Handler)
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-3 border-r border-black cursor-pointer transition-colors ${
              activeTab === 'add' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            add.php (Submit Script)
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 flex-1 overflow-y-auto bg-black text-white font-mono text-xs leading-relaxed">
          <pre><code>{currentCode}</code></pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-black bg-[#fafafa] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-600">
            <Shield className="w-4 h-4 text-black" />
            <span>`json.load()` compatible schema with plain nested dicts/lists for Python endpoint.</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-black text-white text-xs font-bold uppercase tracking-widest px-4 py-2 hover:bg-neutral-800 transition-colors cursor-pointer rounded-none"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Code Snippet'}
          </button>
        </div>
      </div>
    </div>
  );
};
