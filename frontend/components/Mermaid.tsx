'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

const Mermaid = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chart || chart.length < 10) return;
    // 1. Initialize Mermaid with Dark Theme (Taaki black background pe dikhe)
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark', // Important for your UI
      securityLevel: 'loose',
    });

    // 2. Render logic
    const renderChart = async () => {
      if (ref.current && chart) {
        try {
          // Unique ID har render ke liye zaroori hai
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          
          // Mermaid code ko SVG mein convert karo
          const { svg } = await mermaid.render(id, chart);
          
          // HTML set karo
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Mermaid render error:', error);
          // Agar error aaye toh raw code dikha do (Fail-safe)
          if(ref.current) ref.current.innerHTML = `<pre class="text-red-500">${error}</pre>`;
        }
      }
    };

    renderChart();
  }, [chart]);

  return <div ref={ref} className="mermaid-chart my-4 flex justify-center" />;
};

export default Mermaid;