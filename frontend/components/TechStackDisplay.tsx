'use client';

import { Download, FileText } from 'lucide-react';
import { getTechLogo } from '@/lib/techLogos';
import { useState } from 'react';

interface TechItem {
  name: string;
  icon: string;
  pros: string[];
  cons: string[];
  why: string;
}

interface TechStackDisplayProps {
  frontend: TechItem[];
  backend: TechItem[];
  database: TechItem[];
  devops: TechItem[];
  additional: TechItem[];
  onDownloadPDF: () => void;
}

export default function TechStackDisplay({
  frontend,
  backend,
  database,
  devops,
  additional,
  onDownloadPDF,
}: TechStackDisplayProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const getTechDisplay = (techName: string, fallbackIcon: string) => {
    const logo = getTechLogo(techName);
    
    // First try the fallback icon from response
    if (fallbackIcon && fallbackIcon.length > 0) {
      return fallbackIcon;
    }

    if (failedImages.has(techName)) {
      return logo.fallback;
    }

    if (logo.url) {
      return (
        <img
          src={logo.url}
          alt={techName}
          className="w-8 h-8 object-contain"
          onError={() => {
            setFailedImages((prev) => new Set([...prev, techName]));
          }}
        />
      );
    }

    return logo.fallback;
  };

  const renderCategory = (title: string, techs: TechItem[]) => {
    if (!techs || techs.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-blue-600 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
          {title}
        </h3>
        <div className="space-y-4">
          {techs.map((tech, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
                  {getTechDisplay(tech.name, tech.icon)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{tech.name}</h4>
                  <p className="text-sm text-gray-700 mt-1 italic">{tech.why}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-gray-200">
                <div>
                  <p className="font-medium text-green-700 mb-2">✓ Pros</p>
                  <ul className="space-y-1 text-gray-700">
                    {tech.pros.map((pro, i) => (
                      <li key={i} className="text-xs leading-relaxed">• {pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-orange-700 mb-2">⚠ Cons</p>
                  <ul className="space-y-1 text-gray-700">
                    {tech.cons.map((con, i) => (
                      <li key={i} className="text-xs leading-relaxed">• {con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {renderCategory('Frontend', frontend)}
      {renderCategory('Backend', backend)}
      {renderCategory('Database', database)}
      {renderCategory('DevOps / Infrastructure', devops)}
      {renderCategory('Additional Services', additional)}
    </div>
  );
}
