'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Server, Zap, Database, ArrowRight, Loader2, FileText } from 'lucide-react';
import Mermaid from '@/components/Mermaid';
import TechStackDisplay from '@/components/TechStackDisplay';
import { parseTechStackResponse, generatePDF, TechStackData } from '@/lib/pdfGenerator';

export default function Home() {
  const [appType, setAppType] = useState('');
  const [scale, setScale] = useState('');
  const [focus, setFocus] = useState('');
  
  const [result, setResult] = useState('');
  const [techStackData, setTechStackData] = useState<Partial<TechStackData> | null>(null);
  const [loading, setLoading] = useState(false);
  const preprocessContent = (content: string) => {
    return content;
  };

  const validateAndCleanMermaidCode = (code: string) => {
    // First sanitize basic HTML entities
    let cleaned = code
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .trim();

    // Process line by line to fix and filter
    let lines = cleaned.split('\n').map(line => {
      line = line.trim();
      
      // Skip incomplete arrows completely
      if (line.endsWith('-->|') || line.endsWith('-->') || /-->\|[^|]*\|?\s*$/.test(line)) {
        return ''; // Mark for removal
      }
      
      // Fix unclosed brackets on non-arrow lines
      if (line && line.includes('[') && !line.includes(']') && !line.includes('-->')) {
        line = line + ']';
      }
      
      // Fix unclosed brackets on arrow target lines
      if (line && line.includes('-->') && line.includes('[') && !line.includes(']')) {
        if (line.trim().endsWith('[')) {
          line = line + ']';
        } else {
          return ''; // Malformed, remove
        }
      }
      
      return line;
    }).filter(line => line.trim());

    cleaned = lines.join('\n');

    // Replace spaces with underscores in node labels
    cleaned = cleaned.replace(/(\[)([^\]]+)(\])/g, (match, start, content, end) => {
      return start + content.replace(/ +/g, '_') + end;
    });

    // Replace spaces with underscores in arrow labels
    cleaned = cleaned.replace(/(\|)([^\|]+)(\|)/g, (match, start, content, end) => {
      return start + content.replace(/ +/g, '_') + end;
    });

    // Remove incomplete arrows
    cleaned = cleaned.split('\n').map(line => {
      line = line.trim();
      if (line.endsWith('-->|')) {
        return line.slice(0, -2); // Remove trailing pipe
      }
      return line;
    }).join('\n');

    return cleaned.trim();
  };

  const generateStack = async () => {
    if (!appType || !scale || !focus) return;

    setLoading(true);
    setResult('');
    setTechStackData(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appType, scale, focus }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        fullText += text;
        setResult(fullText);
      }

      // Parse tech stack data
      const parsed = parseTechStackResponse(fullText);
      const finalData = {
        ...parsed,
        inputs: { appType, scale, focus },
      } as TechStackData;
      setTechStackData(finalData);

    } catch (error) {
      console.error("Error fetching stack:", error);
      setResult("❌ Connection Failed. Make sure Backend is running!");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (techStackData && techStackData.primary) {
      await generatePDF(techStackData as TechStackData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header - Professional & Trustworthy */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600">TechStack.io</h1>
              <p className="text-gray-500 text-sm mt-1">System Architecture Generator</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">System Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        
        {/* Input Section - Diagnostic Panel */}
        <div className="diagnostic-card p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
              Configuration Panel
            </h2>
            <p className="text-gray-600 text-sm mt-2">Define your application requirements for architecture generation</p>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Server size={18} className="text-blue-600" /> 
                Application Type
              </label>
              <input 
                className="diagnostic-input"
                placeholder="E.g. E-commerce, SaaS, Dating"
                value={appType}
                onChange={(e) => setAppType(e.target.value)}
              />
              <p className="text-xs text-gray-500">Specify your app category</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Database size={18} className="text-blue-600" /> 
                Scale
              </label>
              <input 
                className="diagnostic-input"
                placeholder="E.g. MVP, 100K users, 1M users"
                value={scale}
                onChange={(e) => setScale(e.target.value)}
              />
              <p className="text-xs text-gray-500">Expected user base</p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Zap size={18} className="text-blue-600" /> 
                Primary Focus
              </label>
              <input 
                className="diagnostic-input"
                placeholder="E.g. Cost, Performance, Security"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
              <p className="text-xs text-gray-500">Your top priority</p>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateStack}
            disabled={loading || !appType}
            className="w-full diagnostic-button-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /> Analyzing Architecture...</>
            ) : (
              <><span>Generate Tech Stack</span> <ArrowRight size={20} /></>
            )}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="diagnostic-card p-8 border-2 border-blue-100 space-y-8">
            
            {/* Tech Stack Display */}
            {techStackData && techStackData.primary && (
              (techStackData.primary.frontend?.length || 0) +
              (techStackData.primary.backend?.length || 0) +
              (techStackData.primary.database?.length || 0) +
              (techStackData.primary.devops?.length || 0) +
              (techStackData.primary.additional?.length || 0) > 0
            ) ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                    Recommended Tech Stack
                  </h2>
                  <button
                    onClick={handleDownloadPDF}
                    className="diagnostic-button-primary py-2 px-6"
                  >
                    <FileText size={18} />
                    Download Report (PDF)
                  </button>
                </div>
                <TechStackDisplay
                  frontend={techStackData.primary?.frontend || []}
                  backend={techStackData.primary?.backend || []}
                  database={techStackData.primary?.database || []}
                  devops={techStackData.primary?.devops || []}
                  additional={techStackData.primary?.additional || []}
                  onDownloadPDF={handleDownloadPDF}
                />
              </>
            ) : null}

            {/* Architecture Diagram Section */}
            <div>
              <hr className="border-gray-200 my-4" />
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-6">
                <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                Architecture Diagram
              </h2>
              <div>
                {(() => {
                  const mermaidMatch = result.match(/```mermaid\n([\s\S]*?)\n```/);
                  if (mermaidMatch) {
                    const rawCode = mermaidMatch[1];
                    const cleanCode = validateAndCleanMermaidCode(rawCode);
                    return <Mermaid chart={cleanCode} />;
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}