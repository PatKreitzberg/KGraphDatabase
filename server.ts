import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { KGraph, PropertyLog } from './src/types';
import { parseKGraphText } from './src/lib/parser';
import { Resend } from 'resend';
import multer from 'multer';
import cron from 'node-cron';
import { ZipArchive } from 'archiver';

let graphAddedSinceLastBackup = false;

const uploadDir = path.join(process.cwd(), 'assets', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, 'img-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const DB_FILE = fs.existsSync(path.join(process.cwd(), 'graphs.json'))
  ? path.join(process.cwd(), 'graphs.json')
  : path.join(process.cwd(), 'graphs.json');

app.use(express.json({ limit: '10mb' }));
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));

// Lock file mechanism / atomic write wrapper for graphs.json
async function readGraphs(): Promise<KGraph[]> {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialSeed = getInitialSeedData();
      await writeGraphs(initialSeed);
      return initialSeed;
    }
    const data = await fs.promises.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data) as KGraph[];
  } catch (err) {
    console.error('Error reading graphs.json:', err);
    return [];
  }
}

async function writeGraphs(graphs: KGraph[]): Promise<void> {
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  const content = JSON.stringify(graphs, null, 2);
  await fs.promises.writeFile(tempFile, content, 'utf-8');
  await fs.promises.rename(tempFile, DB_FILE);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getInitialSeedData(): KGraph[] {
  const token1 = 'tok_demo_2graph_alpha';
  const token2 = 'tok_demo_3graph_beta';

  return [
    {
      id: 'graph-2k-cube-01',
      edit_token_hash: hashToken(token1),
      edit_token: token1,
      owner_email: 'researcher@topology-lab.org',
      created_at: new Date('2026-07-15T10:00:00Z').toISOString(),
      k: 2,
      vertices: ['v0', 'v1', 'v2', 'v3'],
      edges: {
        color_1: [
          ['e0', 'v0', 'v1'],
          ['e1', 'v2', 'v3']
        ],
        color_2: [
          ['e2', 'v0', 'v2'],
          ['e3', 'v1', 'v3']
        ]
      },
      commuting_squares: [
        { path_a: ['e0', 'e3'], path_b: ['e2', 'e1'] }
      ],
      commuting_cubes: [],
      properties: {
        name: 'Standard 2-Graph Square Complex',
        paper: 'Commutative Diagram Structures in Higher Rank Graphs (2025)',
        homology: {
          H0: '0',
          H1: '\\mathbb{Z}',
          H2: '\\mathbb{Z}^2'
        },
        custom: {
          class: 'Higher-rank graph algebra',
          dimension: '2'
        }
      },
      property_logs: [
        {
          id: 'log-01',
          key: 'H2',
          value: '\\mathbb{Z}^2',
          contributor_email: 'verifier@math.edu',
          added_at: new Date('2026-07-20T14:30:00Z').toISOString()
        }
      ]
    },
    {
      id: 'graph-3k-tri-02',
      edit_token_hash: hashToken(token2),
      edit_token: token2,
      owner_email: 'combinatorics@univ.edu',
      created_at: new Date('2026-07-22T16:00:00Z').toISOString(),
      k: 3,
      vertices: ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7'],
      edges: {
        color_1: [
          ['e0', 'v0', 'v1'],
          ['e1', 'v2', 'v3'],
          ['e2', 'v4', 'v5'],
          ['e3', 'v6', 'v7']
        ],
        color_2: [
          ['e4', 'v0', 'v2'],
          ['e5', 'v1', 'v3'],
          ['e6', 'v4', 'v6'],
          ['e7', 'v5', 'v7']
        ],
        color_3: [
          ['e8', 'v0', 'v4'],
          ['e9', 'v1', 'v5'],
          ['e10', 'v2', 'v6'],
          ['e11', 'v3', 'v7']
        ]
      },
      commuting_squares: [
        { path_a: ['e0', 'e5'], path_b: ['e4', 'e1'] },
        { path_a: ['e0', 'e9'], path_b: ['e8', 'e2'] },
        { path_a: ['e4', 'e10'], path_b: ['e8', 'e6'] }
      ],
      commuting_cubes: [
        { path_a: ['e0', 'e5', 'e11'], path_b: ['e8', 'e6', 'e3'] }
      ],
      properties: {
        name: '3-Cube Factorization Graph',
        paper: '3-Rank Graph Algebras and K-Theory Invariants',
        homology: {
          H0: '0',
          H1: '\\mathbb{Z}^3',
          H2: '\\mathbb{Z}_2 \\oplus \\mathbb{Z}'
        },
        custom: {
          torsion: 'Present in H2'
        }
      },
      property_logs: []
    }
  ];
}

// REST API Routes
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  const publicUrl = `/assets/uploads/${req.file.filename}`;
  res.json({ success: true, publicUrl });
});

app.get('/api/graphs', async (req, res) => {
  try {
    const graphs = await readGraphs();
    const { k, min_vertices, max_vertices, search_query } = req.query;

    let filtered = graphs;

    if (k) {
      const kVal = parseInt(k as string, 10);
      if (!isNaN(kVal)) {
        filtered = filtered.filter(g => g.k === kVal);
      }
    }

    if (min_vertices) {
      const minV = parseInt(min_vertices as string, 10);
      if (!isNaN(minV)) {
        filtered = filtered.filter(g => g.vertices.length >= minV);
      }
    }

    if (max_vertices) {
      const maxV = parseInt(max_vertices as string, 10);
      if (!isNaN(maxV)) {
        filtered = filtered.filter(g => g.vertices.length <= maxV);
      }
    }

    if (search_query) {
      const q = (search_query as string).toLowerCase();
      filtered = filtered.filter(g => {
        const nameMatch = g.properties?.name?.toLowerCase().includes(q);
        const descMatch = g.properties?.description?.toLowerCase().includes(q);
        const paperMatch = g.properties?.paper?.toLowerCase().includes(q);
        const emailMatch = g.owner_email.toLowerCase().includes(q);
        const idMatch = g.id.toLowerCase().includes(q);
        return nameMatch || descMatch || paperMatch || emailMatch || idMatch;
      });
    }

    // Do not return raw tokens in list view for security unless matching token
    const sanitized = filtered.map(g => {
      const { edit_token, ...rest } = g;
      return rest;
    });

    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve graphs' });
  }
});

app.get('/api/graphs/:id', async (req, res) => {
  try {
    const graphs = await readGraphs();
    const graph = graphs.find(g => g.id === req.params.id);

    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    const requestedToken = (req.headers['x-edit-token'] || req.query.token) as string | undefined;
    let isValidToken = false;

    if (requestedToken) {
      const tokenHash = hashToken(requestedToken);
      if (tokenHash === graph.edit_token_hash) {
        isValidToken = true;
      }
    }

    const linked_from = graphs
      .filter(g => g.links && g.links.some(l => l.target_id === graph.id))
      .map(g => {
        const link = g.links!.find(l => l.target_id === graph.id);
        return {
          source_id: g.id,
          source_name: g.properties?.name || `Graph ${g.id}`,
          description: link!.description
        };
      });

    const { edit_token, ...sanitized } = graph;
    res.json({
      ...sanitized,
      linked_from,
      is_owner: isValidToken,
      ...(isValidToken ? { edit_token: requestedToken } : {})
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch graph' });
  }
});

app.post('/api/graphs', async (req, res) => {
  try {
    const { k, vertices, edges, commuting_squares, commuting_cubes, properties, owner_email, links } = req.body;

    if (!owner_email || typeof owner_email !== 'string' || !owner_email.includes('@')) {
      return res.status(400).json({ error: 'A valid submitter email address is required.' });
    }

    if (!vertices || !Array.isArray(vertices) || vertices.length === 0) {
      return res.status(400).json({ error: 'Graph must contain at least one vertex.' });
    }

    const graphs = await readGraphs();
    const existingGraph = graphs.find(g => g.owner_email === owner_email.trim());
    
    let rawToken, tokenHash, isNewUser;
    
    if (existingGraph && existingGraph.edit_token) {
      rawToken = existingGraph.edit_token;
      tokenHash = existingGraph.edit_token_hash;
      isNewUser = false;
    } else {
      rawToken = 'tok_' + crypto.randomBytes(16).toString('hex');
      tokenHash = hashToken(rawToken);
      isNewUser = true;
    }

    const id = 'graph-' + crypto.randomUUID().slice(0, 8);

    const newGraph: KGraph = {
      id,
      edit_token_hash: tokenHash,
      edit_token: rawToken,
      owner_email: owner_email.trim(),
      created_at: new Date().toISOString(),
      k: k || 1,
      vertices,
      edges: edges || {},
      commuting_squares: commuting_squares || [],
      commuting_cubes: commuting_cubes || [],
      properties: properties || {},
      property_logs: [],
      links: links || []
    };

    graphs.unshift(newGraph);
    await writeGraphs(graphs);

    const editUrl = `${req.get('origin') || req.protocol + '://' + req.get('host')}/edit?id=${id}&token=${rawToken}`;

    if (isNewUser && resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: owner_email.trim(),
          subject: 'Your K-Graph Database Edit Link',
          html: `
            <p>Thank you for submitting to the K-Graph Database!</p>
            <p>You can edit your submission anytime using this private link:</p>
            <p><a href="${editUrl}">${editUrl}</a></p>
            <p>Or manually enter your edit token: <strong>${rawToken}</strong></p>
            <p><br/>Please keep this link safe and do not share it.</p>
          `
        });
      } catch (err) {
        console.error('Failed to send email:', err);
      }
    }

    graphAddedSinceLastBackup = true;

    res.status(201).json({
      success: true,
      graph: newGraph,
      raw_token: rawToken,
      edit_url: `/edit?id=${id}&token=${rawToken}`,
      is_existing_user: !isNewUser
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save graph' });
  }
});

// Update core graph structure (requires edit token)
app.put('/api/graphs/:id', async (req, res) => {
  try {
    const token = (req.headers['x-edit-token'] || req.body.edit_token || req.query.token) as string;

    if (!token) {
      return res.status(401).json({ error: 'Edit token required to update graph structure.' });
    }

    const graphs = await readGraphs();
    const index = graphs.findIndex(g => g.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Graph not found.' });
    }

    const existing = graphs[index];
    if (hashToken(token) !== existing.edit_token_hash) {
      return res.status(403).json({ error: 'Invalid edit token for this graph.' });
    }

    const { k, vertices, edges, commuting_squares, commuting_cubes, properties, links } = req.body;

    const updatedGraph: KGraph = {
      ...existing,
      k: k ?? existing.k,
      vertices: vertices ?? existing.vertices,
      edges: edges ?? existing.edges,
      commuting_squares: commuting_squares ?? existing.commuting_squares,
      commuting_cubes: commuting_cubes ?? existing.commuting_cubes,
      properties: {
        ...existing.properties,
        ...(properties || {})
      },
      links: links ?? existing.links,
      updated_at: new Date().toISOString()
    };

    graphs[index] = updatedGraph;
    await writeGraphs(graphs);

    const { edit_token, ...sanitized } = updatedGraph;
    res.json({ success: true, graph: sanitized });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update graph' });
  }
});

// Delete graph (requires edit token)
app.delete('/api/graphs/:id', async (req, res) => {
  try {
    const token = (req.headers['x-edit-token'] || req.body.edit_token || req.query.token) as string;

    if (!token) {
      return res.status(401).json({ error: 'Edit token required to delete graph.' });
    }

    const graphs = await readGraphs();
    const index = graphs.findIndex(g => g.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Graph not found.' });
    }

    if (hashToken(token) !== graphs[index].edit_token_hash) {
      return res.status(403).json({ error: 'Invalid edit token for this graph.' });
    }

    graphs.splice(index, 1);
    await writeGraphs(graphs);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete graph' });
  }
});

// Append property log / custom property (ANY visitor can contribute)
app.post('/api/graphs/:id/properties', async (req, res) => {
  try {
    const { key, value, contributor_email, is_homology, note_type } = req.body;

    if (!key || !value) {
      return res.status(400).json({ error: 'Property key and value are required.' });
    }

    const graphs = await readGraphs();
    const index = graphs.findIndex(g => g.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Graph not found.' });
    }

    const graph = graphs[index];

    if (!graph.properties) {
      graph.properties = {};
    }

    if (is_homology) {
      if (!graph.properties.homology) {
        graph.properties.homology = {};
      }
      graph.properties.homology[key] = value;
    } else {
      if (!graph.properties.custom) {
        graph.properties.custom = {};
      }
      graph.properties.custom[key] = value;
    }

    const logEntry: PropertyLog = {
      id: 'log-' + crypto.randomUUID().slice(0, 6),
      key,
      value,
      note_type: note_type || (is_homology ? 'homology' : 'property'),
      contributor_email: contributor_email ? contributor_email.trim() : undefined,
      added_at: new Date().toISOString()
    };

    if (!graph.property_logs) {
      graph.property_logs = [];
    }
    graph.property_logs.push(logEntry);
    graph.updated_at = new Date().toISOString();

    graphs[index] = graph;
    await writeGraphs(graphs);

    const { edit_token, ...sanitized } = graph;
    res.json({ success: true, graph: sanitized, new_log: logEntry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to append property' });
  }
});

// Append dispute comment / property error flag (ANY user can submit)
app.post('/api/graphs/:id/disputes', async (req, res) => {
  try {
    const { comment, author_email, property_name } = req.body;

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({ error: 'Dispute comment is required.' });
    }

    const graphs = await readGraphs();
    const index = graphs.findIndex(g => g.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Graph not found.' });
    }

    const graph = graphs[index];

    const disputeEntry = {
      id: 'disp-' + crypto.randomUUID().slice(0, 8),
      author_email: author_email ? String(author_email).trim() : 'Anonymous Contributor',
      property_name: property_name ? String(property_name).trim() : 'General Property',
      comment: String(comment).trim(),
      created_at: new Date().toISOString(),
      status: 'open' as const
    };

    if (!graph.disputes) {
      graph.disputes = [];
    }
    graph.disputes.unshift(disputeEntry);
    graph.updated_at = new Date().toISOString();

    graphs[index] = graph;
    await writeGraphs(graphs);

    if (resend && graph.owner_email) {
      try {
        const editUrl = `${req.get('origin') || req.protocol + '://' + req.get('host')}/#edit/${graph.id}`;
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: graph.owner_email,
          subject: `New Dispute Submitted on Graph ${graph.id}`,
          html: `
            <p>A new dispute has been raised on your graph <strong>${graph.properties?.name || graph.id}</strong>.</p>
            <p><strong>Target:</strong> ${property_name || 'General Property'}</p>
            <p><strong>Comment:</strong> ${comment}</p>
            <p>You can reply to this dispute in your graph's edit view:</p>
            <p><a href="${editUrl}">${editUrl}</a></p>
          `
        });
      } catch (err) {
        console.error('Failed to send dispute email:', err);
      }
    }

    const { edit_token, ...sanitized } = graph;
    res.json({ success: true, graph: sanitized, dispute: disputeEntry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record dispute' });
  }
});

// Reply to a dispute (requires edit token)
app.post('/api/graphs/:id/disputes/:disputeId/reply', async (req, res) => {
  try {
    const token = (req.headers['x-edit-token'] || req.body.edit_token || req.query.token) as string;
    if (!token) {
      return res.status(401).json({ error: 'Edit token required to reply to dispute.' });
    }

    const { comment } = req.body;
    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({ error: 'Reply comment is required.' });
    }

    const graphs = await readGraphs();
    const index = graphs.findIndex(g => g.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Graph not found.' });
    }

    const graph = graphs[index];
    if (hashToken(token) !== graph.edit_token_hash) {
      return res.status(403).json({ error: 'Invalid edit token for this graph.' });
    }

    if (!graph.disputes) {
      return res.status(404).json({ error: 'Dispute not found.' });
    }

    const dispute = graph.disputes.find(d => d.id === req.params.disputeId);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found.' });
    }

    if (!dispute.replies) dispute.replies = [];
    dispute.replies.push({
      comment: comment.trim(),
      added_at: new Date().toISOString()
    });

    graph.updated_at = new Date().toISOString();
    graphs[index] = graph;
    await writeGraphs(graphs);

    res.json({ success: true, dispute });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record reply' });
  }
});

// Parse text block endpoint
app.post('/api/parse-text', (req, res) => {
  const { text } = req.body;
  if (typeof text !== 'string') {
    return res.status(400).json({ error: 'Text string is required' });
  }
  const result = parseKGraphText(text);
  res.json(result);
});

// Validate token endpoint
app.post('/api/graphs/:id/verify-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false, error: 'Token is required' });

  const graphs = await readGraphs();
  const graph = graphs.find(g => g.id === req.params.id);

  if (!graph) {
    return res.status(404).json({ valid: false, error: 'Graph not found' });
  }

  const isValid = hashToken(token) === graph.edit_token_hash;
  res.json({ valid: isValid });
});

// Request token email endpoint
app.post('/api/send-token', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    const graphs = await readGraphs();
    const existingGraph = graphs.find(g => g.owner_email === email.trim());
    
    if (resend) {
      if (existingGraph && existingGraph.edit_token) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: email.trim(),
          subject: 'Your K-Graph Database Edit Token',
          html: `<p>You have previously submitted to the K-Graph Database.</p>
                 <p>Your edit token is: <strong>${existingGraph.edit_token}</strong></p>
                 <p>You can use this token to edit any of your graphs.</p>`
        });
      } else {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: email.trim(),
          subject: 'Your K-Graph Database Edit Token Request',
          html: `<p>You requested an edit token for the K-Graph Database, but this email address has not been used to add any graphs.</p>`
        });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Get user's graphs by token
app.get('/api/my-graphs', async (req, res) => {
  const token = req.headers['x-edit-token'] as string;
  if (!token) {
    return res.status(401).json({ error: 'Token is required' });
  }
  try {
    const tokenHash = hashToken(token);
    const graphs = await readGraphs();
    const myGraphs = graphs.filter(g => g.edit_token_hash === tokenHash).map(g => {
      const { edit_token, ...sanitized } = g;
      return sanitized;
    });
    res.json(myGraphs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your graphs' });
  }
});

// Download backup of database and images
app.get('/api/backup/download', (req, res) => {
  res.attachment('kgraphdb-backup.zip');
  const archive = new ZipArchive({ zlib: { level: 9 } });
  
  archive.on('error', (err) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);
  archive.file(DB_FILE, { name: 'graphs.json' });
  archive.directory(uploadDir, 'assets/uploads');
  archive.finalize();
});

// Midnight daily backup via email
cron.schedule('0 0 * * *', async () => {
  if (graphAddedSinceLastBackup) {
    try {
      const fileContent = fs.readFileSync(DB_FILE, 'utf8');
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: 'kreitzpa@gmail.com',
        subject: 'K-Graph Database Daily Backup',
        html: '<p>A new graph was added today! Here is your daily backup of graphs.json.</p>',
        attachments: [
          {
            filename: 'graphs.json',
            content: fileContent,
          }
        ]
      });
      graphAddedSinceLastBackup = false;
      console.log('Daily backup email sent successfully.');
    } catch (err) {
      console.error('Failed to send daily backup:', err);
    }
  }
});

// Boot Vite middleware or static serving
async function startServer() {
  if (process.env.USE_VITE_DEV_SERVER === 'true') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`K-Graph database server running on port/socket ${PORT}`);
  });
}

startServer();
