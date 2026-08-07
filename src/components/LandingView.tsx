import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const LandingView: React.FC = () => {
  const [graphCount, setGraphCount] = useState<number>(0);
  const [contributors, setContributors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await api.getGraphs();
        setGraphCount(data.length);
        const uniqueContributors = new Set<string>();
        data.forEach(g => {
          if (g.properties?.submitter_name) {
            uniqueContributors.add(g.properties.submitter_name);
          }
        });
        setContributors(Array.from(uniqueContributors));
      } catch (err) {
        console.error('Failed to fetch graphs for landing', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInfo();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans p-6 md:p-10 border border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-4 md:mt-12">
      <div className="space-y-4 border-b border-black pb-6">
        <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tighter text-black flex items-center gap-3">
          Welcome to the <span className="bg-black text-white px-3 py-1 font-mono">K-Graph Database</span>
        </h1>
        <p className="text-sm text-neutral-800 leading-relaxed font-medium">
          The K-Graph Database is a central repository for discovering, sharing, and analyzing higher-rank graphs. 
          Our goal is to provide researchers and mathematicians with a platform to explore the structural properties and homology signatures of these complex objects.
        </p>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-lg font-bold uppercase tracking-tight text-black">
          How to Navigate
        </h2>
        <ul className="list-none space-y-3 text-sm text-neutral-800">
          <li className="flex gap-3">
            <span className="font-bold text-black border border-black px-2 py-0.5 text-xs bg-neutral-100 uppercase tracking-widest shrink-0">Search Registry</span>
            <span>Browse the database, filter by structural properties (like source free or cofinal), search by keyword, or query specific homology signatures.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-black border border-black px-2 py-0.5 text-xs bg-neutral-100 uppercase tracking-widest shrink-0">Add Graph</span>
            <span>Contribute your own higher-rank graphs. You can specify edges, vertices, commuting squares, and properties.</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-black border border-black px-2 py-0.5 text-xs bg-neutral-100 uppercase tracking-widest shrink-0">Edit My Graphs</span>
            <span>Use your edit token to manage or update the graphs you have previously submitted to the database.</span>
          </li>
        </ul>
      </div>

      <div className="pt-6 border-t border-black space-y-4 font-mono text-xs text-neutral-800">
        <div className="text-sm">
          There are currently <strong className="text-black bg-neutral-200 px-1 py-0.5 border border-black">{isLoading ? '...' : graphCount}</strong> graphs in the database.
        </div>
        <div className="bg-[#fafafa] border border-black p-4 leading-relaxed text-[11px]">
          <strong className="uppercase tracking-widest text-black block mb-2 text-xs border-b border-neutral-300 pb-2">Contributed by:</strong>
          {isLoading ? (
            <span className="italic text-neutral-500">Loading contributors...</span>
          ) : contributors.length > 0 ? (
            contributors.join(', ')
          ) : (
            <span className="italic text-neutral-500">Anonymous / Community</span>
          )}
        </div>
      </div>
    </div>
  );
};
