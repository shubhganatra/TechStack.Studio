'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Server, Zap, Database, ArrowRight, Loader2 } from 'lucide-react';
import Mermaid from '@/components/Mermaid';

export default function Home() {
  // State variables (Memory)
  const [appType, setAppType] = useState('');
  const [scale, setScale] = useState('');
  const [focus, setFocus] = useState('');
  
  const [result, setResult] = useState(''); // AI ka jawaab yahan aayega
  const [loading, setLoading] = useState(false);
  const preprocessContent = (content: string) => {
    return content;
  };

  const cleanMermaidCode = (code: string) => {
  return code
    .replace(/&gt;/g, '>')   // HTML entites fix
    .replace(/&lt;/g, '<')
    .replace(/\|>/g, '|')    // Agar AI galti se '|>' bana de toh usse simple '|' kar do
    .replace(/\[(.*?)\]/g, (match, content) => {
       return `[${content.replace(/[^a-zA-Z0-9\s-_]/g, '')}]`;
    })
    .trim();
};

  // The Streaming Function 🌊
  const generateStack = async () => {
    if (!appType || !scale || !focus) return;

    setLoading(true);
    setResult(''); // Purana result saaf karo

    try {
      // 1. Backend ko call karo
      const response = await fetch('http://127.0.0.1:8000/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appType, scale, focus }),
      });

      if (!response.body) return;

      // 2. Stream Reader setup karo
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // 3. Loop chalao jab tak data aa raha hai
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Chunk ko text mein convert karo
        const text = decoder.decode(value, { stream: true });
        
        // Result mein jodte jao (Typewriter Effect)
        setResult((prev) => prev + text);
      }

    } catch (error) {
      console.error("Error fetching stack:", error);
      setResult("❌ Connection Failed. Make sure Backend is running!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
            TechStack.io
          </h1>
          <p className="text-gray-400 text-lg">
            AI-Powered Architecture Generator for Modern Developers
          </p>
        </header>

        {/* The Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-blue-400">
              <Server size={16} /> Application Type
            </label>
            <input 
              className="w-full bg-gray-900 border border-gray-800 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="e.g. Dating App, E-commerce"
              value={appType}
              onChange={(e) => setAppType(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-purple-400">
              <Database size={16} /> Scale
            </label>
            <input 
              className="w-full bg-gray-900 border border-gray-800 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition"
              placeholder="e.g. 1M Users, MVP"
              value={scale}
              onChange={(e) => setScale(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-green-400">
              <Zap size={16} /> Focus
            </label>
            <input 
              className="w-full bg-gray-900 border border-gray-800 p-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition"
              placeholder="e.g. Low Latency, Cost"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateStack}
          disabled={loading || !appType}
          className="w-full bg-white text-black font-bold py-4 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="animate-spin" /> Architecting...</>
          ) : (
            <><span className="text-xl">Generate Architecture</span> <ArrowRight /></>
          )}
        </button>

        {/* Result Area */}
       {result && (
        <div className="mt-12 bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              components={{
                // Code blocks ko intercept karo
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  
                  // Agar language "mermaid" hai, toh Graph draw karo!
                  if (!inline && match && match[1] === 'mermaid') {
                    const rawCode = children ? String(children).replace(/\n$/, '') : '';
                    if (!rawCode.trim()) return null;
                    const preCode = preprocessContent(rawCode);
                    const cleanCode = cleanMermaidCode(preCode);
                    return <Mermaid chart={cleanCode} />;
                  }
                  
                  // Nahi toh normal code dikhao
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {result}
            </ReactMarkdown>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}