"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
}

export function ExportModal({ open, title, content, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      textareaRef.current?.select();
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-ink-900 border border-white/10 rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm tracking-wider uppercase text-white/80">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="text-xs px-3 py-1 rounded border border-white/15 hover:border-white/40 hover:bg-white/5 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={onClose}
              className="text-xs px-3 py-1 rounded border border-white/15 hover:border-white/40 hover:bg-white/5 transition-colors"
            >
              Close
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-hidden p-4">
          <textarea
            ref={textareaRef}
            value={content}
            readOnly
            className="w-full h-full min-h-[40vh] bg-ink-950 border border-white/5 rounded p-3 text-xs font-mono text-white/80 resize-none focus:outline-none px-scroll"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
