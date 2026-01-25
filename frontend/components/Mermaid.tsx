'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Validation function for mermaid syntax
  const validateMermaidSyntax = (code: string): { valid: boolean; error?: string } => {
    if (!code || code.length < 10) {
      return { valid: false, error: 'Diagram code too short' };
    }

    // Check if starts with graph TD
    if (!code.includes('graph TD')) {
      return { valid: false, error: 'Missing "graph TD" declaration' };
    }

    // Check for invalid patterns
    const invalidPatterns = [
      { regex: /--\.-+/, reason: 'Dotted arrows not allowed' },
      { regex: /-+\|>/, reason: 'Special arrowheads not allowed' },
      { regex: /===+>/, reason: 'Thick arrows not allowed' },
      { regex: /\]\[/, reason: 'Invalid bracket nesting' },
      { regex: /&lt;|&gt;|&amp;/, reason: 'HTML entities detected' },
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.regex.test(code)) {
        return { valid: false, error: pattern.reason };
      }
    }

    // Check for valid nodes
    const nodePattern = /[a-zA-Z0-9_]+\[.*?\]/;
    if (!nodePattern.test(code)) {
      return { valid: false, error: 'No valid nodes defined' };
    }

    // Check for valid connections
    const arrowPattern = /--+>/;
    if (!arrowPattern.test(code)) {
      return { valid: false, error: 'No valid connections found' };
    }

    return { valid: true };
  };

  // Sanitize mermaid code - aggressive cleanup with bracket matching
  const sanitizeMermaidCode = (code: string): string => {
    let sanitized = code
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .trim();

    // Split into lines for processing
    let lines = sanitized.split('\n').map(line => {
      line = line.trim();
      
      // Skip incomplete arrows completely
      if (line.endsWith('-->|') || line.endsWith('-->') || /-->\|[^|]*\|?\s*$/.test(line)) {
        return ''; // Mark for removal
      }
      
      // Fix unclosed brackets on non-arrow lines
      if (line && line.includes('[') && !line.includes(']') && !line.includes('-->')) {
        line = line + ']';
      }
      
      // Fix unclosed brackets on arrow target lines - but only at end
      if (line && line.includes('-->') && line.includes('[') && !line.includes(']')) {
        if (line.trim().endsWith('[')) {
          line = line + ']';
        } else {
          return ''; // Malformed, remove it
        }
      }
      
      return line;
    }).filter(line => line.trim()); // Remove empty lines

    sanitized = lines.join('\n');

    // Replace spaces with underscores in node labels [...]
    sanitized = sanitized.replace(/(\[)([^\]]+)(\])/g, (match, start, content, end) => {
      return start + content.replace(/ +/g, '_') + end;
    });

    // Replace spaces with underscores in arrow labels |...|
    sanitized = sanitized.replace(/(\|)([^\|]+)(\|)/g, (match, start, content, end) => {
      return start + content.replace(/ +/g, '_') + end;
    });

    return sanitized;
  };

  useEffect(() => {
    if (!chart || chart.length < 10) {
      setError('Invalid chart data');
      return;
    }

    // Sanitize the code
    const sanitized = sanitizeMermaidCode(chart);

    // Validate the code
    const validation = validateMermaidSyntax(sanitized);
    if (!validation.valid) {
      setError(validation.error || 'Invalid mermaid syntax');
      if (ref.current) {
        ref.current.innerHTML = `<div class="text-red-500 bg-red-900 bg-opacity-20 p-4 rounded border border-red-500">
          <strong>Architecture Diagram Error:</strong> ${validation.error}
          <pre class="mt-2 text-xs overflow-auto max-h-32">${sanitized}</pre>
        </div>`;
      }
      return;
    }

    // Initialize Mermaid with Dark Theme
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      logLevel: 'error',
    });

    // Render logic
    const renderChart = async () => {
      if (ref.current && sanitized) {
        try {
          // Unique ID for each render
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

          // Render mermaid diagram to SVG
          const { svg } = await mermaid.render(id, sanitized);

          // Set the HTML
          if (ref.current) {
            ref.current.innerHTML = svg;
            setError(null);
          }
        } catch (error: any) {
          console.error('Mermaid render error:', error);
          setError(error.message || 'Failed to render diagram');
          if (ref.current) {
            ref.current.innerHTML = `<div class="text-red-500 bg-red-900 bg-opacity-20 p-4 rounded border border-red-500">
              <strong>Render Error:</strong> ${error.message || 'Unknown error'}
              <pre class="mt-2 text-xs overflow-auto max-h-32">${sanitized}</pre>
            </div>`;
          }
        }
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div className="mermaid-chart my-4 flex justify-center">
      <div ref={ref} className="w-full" />
    </div>
  );
};

export default Mermaid;