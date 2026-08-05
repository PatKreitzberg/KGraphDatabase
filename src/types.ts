export interface CommutingPath {
  path_a: string[];
  path_b: string[];
}

export interface KGraphProperties {
  name?: string;
  description?: string;
  paper?: string;
  submitter_name?: string;
  contact_email?: string;
  image_url?: string;
  homology?: Record<string, string>;
  custom?: Record<string, string>;
  tags?: string[];
  source_free?: boolean;
  sink_free?: boolean;
  aperiodic?: boolean;
  cofinal?: boolean;
}

export interface PropertyLog {
  id: string;
  key: string;
  value: string;
  contributor_email?: string;
  added_at: string;
}

export interface GraphDispute {
  id: string;
  author_email?: string;
  property_name?: string;
  comment: string;
  created_at: string;
  status?: 'open' | 'resolved';
}

export interface KGraph {
  id: string;
  edit_token_hash: string;
  edit_token?: string; // Included when returned upon creation or via direct edit token validation
  owner_email: string;
  created_at: string;
  updated_at?: string;
  k: number;
  vertices: string[];
  edges: Record<string, [string, string, string][]>; // e.g. { "color_1": [["e0", "v0", "v1"]] }
  commuting_squares: CommutingPath[];
  commuting_cubes: CommutingPath[];
  properties: KGraphProperties;
  property_logs?: PropertyLog[];
  disputes?: GraphDispute[];
}

export type HomologyTermType = 'zero' | 'integer' | 'torsion';

export interface HomologyTerm {
  type: HomologyTermType;
  exponent?: number; // n for \mathbb{Z}^n (if 1 or omitted, renders as \mathbb{Z})
  subscript?: number; // n for \mathbb{Z}_n
}

export interface HomologyRow {
  degree: string; // e.g. "H0", "H1", "H2"
  terms: HomologyTerm[];
}

export interface ParseError {
  line?: number;
  message: string;
}

export interface TextParseResult {
  success: boolean;
  graph?: {
    k: number;
    vertices: string[];
    edges: Record<string, [string, string, string][]>;
    commuting_squares: CommutingPath[];
    commuting_cubes: CommutingPath[];
    properties: KGraphProperties;
  };
  errors: ParseError[];
  warnings: string[];
}

export interface SearchFilters {
  k?: number | null;
  min_vertices?: number | null;
  max_vertices?: number | null;
  homology?: Record<string, string>;
  search_query?: string;
  source_free?: boolean;
  sink_free?: boolean;
  aperiodic?: boolean;
  cofinal?: boolean;
}
