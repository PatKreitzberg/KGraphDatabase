import React, { useState } from 'react';
import { Key, Unlock, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface EditTokenVerifyViewProps {
  graphId: string;
  origin: 'search' | 'detail';
  onSuccess: (token: string) => void;
  onBack: () => void;
}

export const EditTokenVerifyView: React.FC<EditTokenVerifyViewProps> = ({
  graphId,
  origin,
  onSuccess,
  onBack
}) => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setErrorMessage('Please enter an edit token.');
      return;
    }

    setVerifying(true);
    setErrorMessage('');

    try {
      const isValid = await api.verifyToken(graphId, tokenInput.trim());

      if (isValid) {
        onSuccess(tokenInput.trim());
      } else {
        setErrorMessage('Invalid edit token for this graph record.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to verify token.');
    } finally {
      setVerifying(false);
    }
  };

  const backButtonText = origin === 'search' ? 'Back to Search Registry' : 'Back to Graph View';

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans">
      <div className="border border-black bg-white p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
        <div className="border-b border-black pb-4 space-y-1">
          <div className="flex items-center gap-2 text-black font-bold uppercase tracking-widest text-xs">
            <Key className="w-4 h-4 text-black" />
            <span>Token Authorization Required</span>
          </div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-black">
            Unlock Graph Editor
          </h2>
          <p className="text-xs text-neutral-600 font-mono">
            Enter the authorized edit token for record <span className="font-bold text-black">{graphId}</span> to modify structural adjacency matrices and metadata.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5 font-mono">
              Edit Token <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              disabled={verifying}
              value={tokenInput}
              onChange={e => {
                setTokenInput(e.target.value);
                setErrorMessage('');
              }}
              placeholder="e.g. tok_00b2f15a99933ce..."
              className="w-full font-mono text-xs border border-black p-3 focus:border-black focus:outline-none rounded-none transition-colors"
            />
          </div>

          {errorMessage && (
            <div className="border border-red-700 bg-red-50 text-red-900 p-4 space-y-2 font-mono text-xs">
              <div className="flex items-center gap-2 font-bold uppercase">
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                <span>Verification Failed: {errorMessage}</span>
              </div>
              <p className="text-[11px] text-neutral-800">
                You can try entering the correct token again above, or return to where you were without making edits.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-black flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onBack}
              disabled={verifying}
              className="flex items-center gap-2 bg-white border border-black px-5 py-2.5 font-bold text-xs uppercase tracking-widest text-black hover:bg-neutral-100 transition-colors rounded-none cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              {backButtonText}
            </button>
            <button
              type="submit"
              disabled={verifying}
              className="flex items-center gap-2 bg-black text-white px-6 py-2.5 font-bold text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-none cursor-pointer disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Validate &amp; Continue
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
