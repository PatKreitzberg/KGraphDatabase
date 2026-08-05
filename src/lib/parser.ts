import { TextParseResult, CommutingPath, ParseError } from '../types';

export function parseKGraphText(text: string): TextParseResult {
  const lines = text.split(/\r?\n/);
  const errors: ParseError[] = [];
  const warnings: string[] = [];

  const verticesSet = new Set<string>();
  const verticesList: string[] = [];
  const edgesByColor: Record<string, [string, string, string][]> = {};
  const allEdgeIds = new Set<string>();
  const commutingSquares: CommutingPath[] = [];
  const commutingCubes: CommutingPath[] = [];
  const properties: { name?: string; paper?: string; homology?: Record<string, string>; custom?: Record<string, string> } = {
    custom: {},
    homology: {}
  };

  let currentSection = '';
  let currentColorKey = 'color_1';
  let maxColorIndex = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNumber = idx + 1;
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // Skip empty lines or pure comment lines without section header
    if (!trimmed) continue;

    // Check for section headers starting with #
    if (trimmed.startsWith('#')) {
      const headerText = trimmed.replace(/^#+\s*/, '').trim().toLowerCase();

      if (headerText.includes('vertic')) {
        currentSection = 'vertices';
      } else if (headerText.includes('square')) {
        currentSection = 'squares';
      } else if (headerText.includes('cube')) {
        currentSection = 'cubes';
      } else if (headerText.includes('propert')) {
        currentSection = 'properties';
      } else if (headerText.includes('color') || headerText.includes('edge')) {
        currentSection = 'edges';
        // Extract color number/name
        const matchNumber = headerText.match(/color\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
        if (matchNumber) {
          const rawNum = matchNumber[1].toLowerCase();
          const wordToNum: Record<string, number> = {
            one: 1, two: 2, three: 3, four: 4, five: 5,
            six: 6, seven: 7, eight: 8, nine: 9, ten: 10
          };
          const colorNum = wordToNum[rawNum] || parseInt(rawNum, 10) || 1;
          currentColorKey = `color_${colorNum}`;
          maxColorIndex = Math.max(maxColorIndex, colorNum);
        } else {
          maxColorIndex = Math.max(maxColorIndex, 1);
          currentColorKey = `color_${maxColorIndex}`;
        }

        if (!edgesByColor[currentColorKey]) {
          edgesByColor[currentColorKey] = [];
        }
      } else {
        warnings.push(`Line ${lineNumber}: Unknown section header "${trimmed}".`);
      }
      continue;
    }

    // Process line based on active section
    if (currentSection === 'vertices') {
      const tokens = trimmed.split(/[\s,]+/);
      for (const token of tokens) {
        if (!token) continue;
        if (!verticesSet.has(token)) {
          verticesSet.add(token);
          verticesList.push(token);
        }
      }
    } else if (currentSection === 'edges') {
      // Format: edge_id source target  (e.g., e0 v0 v1)
      const tokens = trimmed.split(/\s+/);
      if (tokens.length >= 3) {
        const edgeId = tokens[0];
        const source = tokens[1];
        const target = tokens[2];

        if (!verticesSet.has(source)) {
          errors.push({
            line: lineNumber,
            message: `Edge "${edgeId}" references unknown source vertex "${source}".`
          });
        }
        if (!verticesSet.has(target)) {
          errors.push({
            line: lineNumber,
            message: `Edge "${edgeId}" references unknown target vertex "${target}".`
          });
        }

        if (allEdgeIds.has(edgeId)) {
          errors.push({
            line: lineNumber,
            message: `Duplicate edge ID "${edgeId}".`
          });
        } else {
          allEdgeIds.add(edgeId);
        }

        if (!edgesByColor[currentColorKey]) {
          edgesByColor[currentColorKey] = [];
        }
        edgesByColor[currentColorKey].push([edgeId, source, target]);
      } else {
        errors.push({
          line: lineNumber,
          message: `Invalid edge declaration "${trimmed}". Expected format: "edge_id source target".`
        });
      }
    } else if (currentSection === 'squares' || currentSection === 'cubes') {
      // Format: e0 e3 ~ e2 e1  or e0 e3 = e2 e1
      const splitChar = trimmed.includes('~') ? '~' : trimmed.includes('=') ? '=' : null;
      if (!splitChar) {
        errors.push({
          line: lineNumber,
          message: `Invalid commuting path on line ${lineNumber}. Expected "~" or "=" separator (e.g. "e0 e3 ~ e2 e1").`
        });
        continue;
      }

      const parts = trimmed.split(splitChar);
      const pathA = parts[0].trim().split(/\s+/).filter(Boolean);
      const pathB = parts[1].trim().split(/\s+/).filter(Boolean);

      // Validate edge references
      for (const edge of [...pathA, ...pathB]) {
        if (!allEdgeIds.has(edge)) {
          errors.push({
            line: lineNumber,
            message: `Commuting path references unknown edge "${edge}".`
          });
        }
      }

      if (currentSection === 'squares') {
        commutingSquares.push({ path_a: pathA, path_b: pathB });
      } else {
        commutingCubes.push({ path_a: pathA, path_b: pathB });
      }
    } else if (currentSection === 'properties') {
      if (trimmed.toLowerCase().startsWith('homology')) {
        // e.g. Homology groups: H0=0, H1=\mathbb{Z}
        const valPart = trimmed.replace(/^homology\s*(groups)?:?\s*/i, '');
        const items = valPart.split(/[,;]+/);
        for (const item of items) {
          const match = item.match(/(H\d+)\s*[:=]\s*(.+)/i);
          if (match) {
            properties.homology![match[1].toUpperCase()] = match[2].trim();
          }
        }
      } else if (trimmed.toLowerCase().startsWith('name:')) {
        properties.name = trimmed.replace(/^name:\s*/i, '').trim();
      } else if (trimmed.toLowerCase().startsWith('paper:')) {
        properties.paper = trimmed.replace(/^paper:\s*/i, '').trim();
      } else {
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
          const key = trimmed.slice(0, colonIdx).trim();
          const val = trimmed.slice(colonIdx + 1).trim();
          properties.custom![key] = val;
        }
      }
    }
  }

  // Determine k: number of color keys present with edges, or max color index
  const activeColorKeys = Object.keys(edgesByColor).filter(k => edgesByColor[k].length > 0);
  const k = Math.max(activeColorKeys.length, maxColorIndex, 1);

  // If no edges section was explicitly declared but color keys exist, fill defaults
  for (let i = 1; i <= k; i++) {
    const key = `color_${i}`;
    if (!edgesByColor[key]) {
      edgesByColor[key] = [];
    }
  }

  if (verticesList.length === 0) {
    errors.push({
      message: 'No vertices were defined in the text.'
    });
  }

  return {
    success: errors.length === 0,
    graph: {
      k,
      vertices: verticesList,
      edges: edgesByColor,
      commuting_squares: commutingSquares,
      commuting_cubes: commutingCubes,
      properties
    },
    errors,
    warnings
  };
}

export function formatKGraphToText(graph: {
  vertices: string[];
  edges: Record<string, [string, string, string][]>;
  commuting_squares: CommutingPath[];
  commuting_cubes: CommutingPath[];
  properties?: { name?: string; paper?: string; homology?: Record<string, string>; custom?: Record<string, string> };
}): string {
  const lines: string[] = [];

  lines.push('# Vertices');
  lines.push(graph.vertices.join(' '));
  lines.push('');

  const colorKeys = Object.keys(graph.edges).sort();
  for (const key of colorKeys) {
    const numMatch = key.match(/\d+/);
    const num = numMatch ? numMatch[0] : '1';
    lines.push(`# Color ${num} Edges`);
    for (const [eId, src, tgt] of graph.edges[key]) {
      lines.push(`${eId} ${src} ${tgt}`);
    }
    lines.push('');
  }

  if (graph.commuting_squares && graph.commuting_squares.length > 0) {
    lines.push('# Commuting Squares');
    for (const sq of graph.commuting_squares) {
      lines.push(`${sq.path_a.join(' ')} ~ ${sq.path_b.join(' ')}`);
    }
    lines.push('');
  }

  if (graph.commuting_cubes && graph.commuting_cubes.length > 0) {
    lines.push('# Commuting Cubes');
    for (const cb of graph.commuting_cubes) {
      lines.push(`${cb.path_a.join(' ')} ~ ${cb.path_b.join(' ')}`);
    }
    lines.push('');
  }

  lines.push('# Properties');
  if (graph.properties?.name) {
    lines.push(`Name: ${graph.properties.name}`);
  }
  if (graph.properties?.paper) {
    lines.push(`Paper: ${graph.properties.paper}`);
  }
  if (graph.properties?.homology && Object.keys(graph.properties.homology).length > 0) {
    const homStr = Object.entries(graph.properties.homology)
      .map(([degree, val]) => `${degree}=${val}`)
      .join(', ');
    lines.push(`Homology groups: ${homStr}`);
  }
  if (graph.properties?.custom) {
    for (const [k, v] of Object.entries(graph.properties.custom)) {
      lines.push(`${k}: ${v}`);
    }
  }

  return lines.join('\n');
}
