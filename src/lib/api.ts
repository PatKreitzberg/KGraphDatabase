import { KGraph, KGraphProperties } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = {
  getGraphs: async (kFilter?: number): Promise<KGraph[]> => {
    let endpoint = `${API_BASE}/graphs`;
    if (kFilter !== undefined && kFilter !== null && !isNaN(kFilter)) {
      endpoint += `?k=${kFilter}`;
    }
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('API failed');
      return await res.json();
    } catch (e) {
      // Fallback to static graphs.json if the backend is down
      const fallbackRes = await fetch('/graphs.json');
      if (fallbackRes.ok) {
        const graphs: KGraph[] = await fallbackRes.json();
        if (kFilter !== undefined && kFilter !== null && !isNaN(kFilter)) {
          return graphs.filter(g => g.k === kFilter);
        }
        return graphs;
      }
      return [];
    }
  },

  getGraphById: async (id: string): Promise<KGraph | null> => {
    try {
      const res = await fetch(`${API_BASE}/graphs/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('API failed');
      return await res.json();
    } catch (e) {
      const fallbackRes = await fetch('/graphs.json');
      if (fallbackRes.ok) {
        const graphs: KGraph[] = await fallbackRes.json();
        return graphs.find(g => g.id === id) || null;
      }
      return null;
    }
  },

  getAllProperties: async (): Promise<{ properties: KGraphProperties }[]> => {
    const res = await fetch(`${API_BASE}/graphs`);
    if (!res.ok) throw new Error(await res.text());
    const graphs: KGraph[] = await res.json();
    return graphs.map(g => ({ properties: g.properties || {} }));
  },

  createGraph: async (payload: any): Promise<{ success: boolean; id: string; raw_token: string; is_existing_user?: boolean }> => {
    const res = await fetch(`${API_BASE}/graphs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = 'Failed to create graph';
      try { const errObj = JSON.parse(errText); if (errObj.error) errMsg = errObj.error; } catch {}
      throw new Error(errMsg);
    }
    const data = await res.json();
    return { success: data.success, id: data.graph.id, raw_token: data.raw_token, is_existing_user: data.is_existing_user };
  },

  updateGraph: async (payload: any): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`${API_BASE}/graphs/${encodeURIComponent(payload.target_id)}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-edit-token': payload.token
      },
      body: JSON.stringify({
        k: payload.updated_k,
        vertices: payload.updated_vertices,
        edges: payload.updated_edges,
        commuting_squares: payload.updated_squares,
        commuting_cubes: payload.updated_cubes,
        properties: payload.updated_properties
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = 'Failed to update graph';
      try { const errObj = JSON.parse(errText); if (errObj.error) errMsg = errObj.error; } catch {}
      throw new Error(errMsg);
    }
    return res.json();
  },

  deleteGraph: async (id: string, token: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/graphs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'x-edit-token': token
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = 'Failed to delete graph';
      try { const errObj = JSON.parse(errText); if (errObj.error) errMsg = errObj.error; } catch {}
      throw new Error(errMsg);
    }
    return res.json();
  },

  requestTokenEmail: async (email: string): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/send-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      throw new Error('Failed to request token email');
    }
    return res.json();
  },

  verifyToken: async (target_id: string, token: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/graphs/${encodeURIComponent(target_id)}/verify-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.valid;
  },

  addDispute: async (payload: { target_id: string; comment: string; author_email: string | null; property_name: string }): Promise<{ success: boolean }> => {
    const res = await fetch(`${API_BASE}/graphs/${encodeURIComponent(payload.target_id)}/disputes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  addProperty: async (payload: { target_id: string; prop_key: string; prop_value: string; contributor_email: string | null; is_homology: boolean }): Promise<{ success: boolean }> => {
    const { target_id, prop_key, prop_value, contributor_email, is_homology } = payload;
    const res = await fetch(`${API_BASE}/graphs/${encodeURIComponent(target_id)}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: prop_key, value: prop_value, contributor_email, is_homology })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload image');
    const data = await res.json();
    return data.publicUrl;
  }
};
