export interface TechItem {
  name: string;
  icon: string;
  pros: string[];
  cons: string[];
  why: string;
}

export interface TechStack {
  frontend: TechItem[];
  backend: TechItem[];
  database: TechItem[];
  devops: TechItem[];
  additional: TechItem[];
}

export interface TechStackData {
  primary: TechStack;
  alternatives: TechStack[];
  inputs: {
    appType: string;
    scale: string;
    focus: string;
  };
  architecture: string;
}

export function parseTechStackResponse(response: string): Partial<TechStackData> {
  const result: Partial<TechStackData> = {
    primary: {
      frontend: [],
      backend: [],
      database: [],
      devops: [],
      additional: [],
    },
    alternatives: [],
  };

  // Helper function to parse a stack section
  const parseStack = (stackText: string): TechStack => {
    const stack: TechStack = {
      frontend: [],
      backend: [],
      database: [],
      devops: [],
      additional: [],
    };

    const lines = stackText.split('\n');

    let currentCategory: keyof TechStack | null = null;
    let currentTech: Partial<TechItem> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) continue; // Skip empty lines

      // Check for category header FIRST - must be exact
      if (line.startsWith('###')) {
        // Save previous tech before switching category
        if (currentTech && currentCategory) {
          stack[currentCategory].push(currentTech as TechItem);
          currentTech = null;
        }

        if (line.includes('Frontend')) {
          currentCategory = 'frontend';
        } else if (line.includes('Backend')) {
          currentCategory = 'backend';
        } else if (line.includes('Database')) {
          currentCategory = 'database';
        } else if (line.includes('DevOps') || line.includes('Infrastructure')) {
          currentCategory = 'devops';
        } else if (line.includes('Additional')) {
          currentCategory = 'additional';
        }
        continue;
      }

      // Check for tech name line: **Name** - emoji
      if (line.startsWith('**') && line.includes('**') && line.includes('-')) {
        // Save previous tech
        if (currentTech && currentCategory) {
          stack[currentCategory].push(currentTech as TechItem);
        }

        const nameMatch = line.match(/^\*\*([^*]+)\*\*\s*-\s*(.*)/);
        if (nameMatch) {
          currentTech = {
            name: nameMatch[1].trim(),
            icon: '', // Don't use the emoji from response, let getTechLogo handle it
            pros: [],
            cons: [],
            why: '',
          };
        }
        continue;
      }

      // Check for Pros line
      if (line.toLowerCase().startsWith('pros:') && currentTech) {
        const prosText = line.substring(5).trim();
        currentTech.pros = prosText
          .split(/[•\-\*]/)
          .map(p => p.trim())
          .filter(p => p.length > 0);
        continue;
      }

      // Check for Cons line
      if (line.toLowerCase().startsWith('cons:') && currentTech) {
        const consText = line.substring(5).trim();
        currentTech.cons = consText
          .split(/[•\-\*]/)
          .map(c => c.trim())
          .filter(c => c.length > 0);
        continue;
      }

      // Check for Why line
      if (line.toLowerCase().startsWith('why:') && currentTech) {
        currentTech.why = line.substring(4).trim();
        continue;
      }
    }

    // Don't forget the last tech item
    if (currentTech && currentCategory) {
      stack[currentCategory].push(currentTech as TechItem);
    }

    return stack;
  };

  // Parse PRIMARY stack
  const primaryMatch = response.search(/##\s*PRIMARY\s*Technology\s*Stack/i);
  
  if (primaryMatch !== -1) {
    // Find the next ## that marks either ALTERNATIVE or end
    let primaryEnd = response.indexOf('## ALTERNATIVE', primaryMatch + 1);
    if (primaryEnd === -1) primaryEnd = response.length;
    
    const primaryText = response.substring(primaryMatch, primaryEnd);
    result.primary = parseStack(primaryText);
  }

  // Parse ALTERNATIVE stacks (up to 3)
  const altRegex = /##\s*ALTERNATIVE\s*STACK\s*#(\d+)/gi;
  let altMatch;
  const alternatives: TechStack[] = [];

  while ((altMatch = altRegex.exec(response)) !== null) {
    const stackNum = parseInt(altMatch[1], 10);
    if (stackNum > 3) continue; // Max 3 alternatives

    let altStart = altMatch.index;
    // Find next ## ALTERNATIVE or end of string
    let altEnd = response.indexOf('## ALTERNATIVE', altStart + 1);
    if (altEnd === -1) altEnd = response.length;

    const altText = response.substring(altStart, altEnd);
    const altStack = parseStack(altText);
    alternatives.push(altStack);
  }

  result.alternatives = alternatives;
  return result;
}

export async function generatePDF(data: TechStackData) {
  const jsPDFModule = await import('jspdf');
  const jsPDF = (jsPDFModule as any).jsPDF;
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 20;
  const margin = 15;
  const lineHeight = 7;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(15, 103, 204); // Blue
  doc.text('Technology Stack Recommendation', margin, currentY);
  currentY += 15;

  // Inputs
  doc.setFontSize(11);
  doc.setTextColor(75, 85, 99); // Gray
  doc.text(
    `Application: ${data.inputs.appType} | Scale: ${data.inputs.scale} | Focus: ${data.inputs.focus}`,
    margin,
    currentY
  );
  currentY += 12;

  // Function to add section
  const addSection = (title: string, items: TechItem[]) => {
    if (items.length === 0) return;

    // Check if new page needed
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(15, 103, 204);
    doc.text(title, margin, currentY);
    currentY += 10;

    items.forEach((tech) => {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }

      // Tech name with icon
      doc.setFontSize(12);
      doc.setTextColor(26, 32, 44);
      doc.text(`${tech.icon} ${tech.name}`, margin + 2, currentY);
      currentY += 7;

      // Why
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      const whyWrapped = doc.splitTextToSize(`Why: ${tech.why}`, pageWidth - margin * 2 - 4);
      doc.text(whyWrapped, margin + 4, currentY);
      currentY += whyWrapped.length * lineHeight + 3;

      // Pros and Cons
      doc.setFontSize(9);
      doc.setTextColor(22, 163, 74);
      doc.text('Pros:', margin + 4, currentY);
      currentY += 5;

      tech.pros.forEach((pro) => {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
        }
        const proWrapped = doc.splitTextToSize(`• ${pro}`, pageWidth - margin * 2 - 12);
        doc.setTextColor(75, 85, 99);
        doc.text(proWrapped, margin + 8, currentY);
        currentY += proWrapped.length * (lineHeight - 2) + 2;
      });

      currentY += 2;
      doc.setTextColor(217, 119, 6);
      doc.text('Cons:', margin + 4, currentY);
      currentY += 5;

      tech.cons.forEach((con) => {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
        }
        const conWrapped = doc.splitTextToSize(`• ${con}`, pageWidth - margin * 2 - 12);
        doc.setTextColor(75, 85, 99);
        doc.text(conWrapped, margin + 8, currentY);
        currentY += conWrapped.length * (lineHeight - 2) + 2;
      });

      currentY += 5;
      // Separator line
      doc.setDrawColor(209, 213, 219);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;
    });
  };

  // Add PRIMARY stack
  doc.setFontSize(16);
  doc.setTextColor(15, 103, 204);
  doc.text('PRIMARY RECOMMENDATION', margin, currentY);
  currentY += 10;

  addSection('FRONTEND', data.primary.frontend);
  addSection('BACKEND', data.primary.backend);
  addSection('DATABASE', data.primary.database);
  addSection('DEVOPS / INFRASTRUCTURE', data.primary.devops);
  addSection('ADDITIONAL SERVICES', data.primary.additional);

  // Add ALTERNATIVE stacks
  data.alternatives.forEach((altStack, index) => {
    doc.addPage();
    currentY = 20;

    doc.setFontSize(16);
    doc.setTextColor(15, 103, 204);
    doc.text(`ALTERNATIVE STACK #${index + 1}`, margin, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(
      'This stack offers different trade-offs while maintaining production-ready quality.',
      margin,
      currentY
    );
    currentY += 10;

    addSection('FRONTEND', altStack.frontend);
    addSection('BACKEND', altStack.backend);
    addSection('DATABASE', altStack.database);
    addSection('DEVOPS / INFRASTRUCTURE', altStack.devops);
    addSection('ADDITIONAL SERVICES', altStack.additional);
  });

  // Save
  doc.save('techstack-recommendation.pdf');
}
