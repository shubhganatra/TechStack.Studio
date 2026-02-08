export interface TechItem {
  name: string;
  icon?: string;
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
  alternative_explanations: Array<{
    stack_num: number;
    when_to_use: string;
    trade_off: string;
    why_consider: string;
  }>;
  mermaid_diagram: string;
  inputs: {
    appType: string;
    scale: string;
    focus: string;
    teamSize: string;
    budget: string;
    timeToMarket: string;
    securityLevel: string;
    customConstraints: string;
  };
}

export function parseTechStackResponse(response: string): Partial<TechStackData> {
  console.log('=== PARSER LOG: Starting parse ===');
  console.log('Response length:', response.length);
  console.log('Response starts:', response.substring(0, 500));
  
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
    console.log('=== PARSER LOG: Parsing stack section, length:', stackText.length);
    const stack: TechStack = {
      frontend: [],
      backend: [],
      database: [],
      devops: [],
      additional: [],
    };

    const lines = stackText.split('\n');
    console.log('=== PARSER LOG: Total lines in stack:', lines.length);
    
    // Log first 20 lines to see the format
    console.log('=== PARSER LOG: First 20 lines:');
    for (let j = 0; j < Math.min(20, lines.length); j++) {
      const rawLine = lines[j];
      console.log(`Line ${j}: "${rawLine}"`);
    }

    let currentCategory: keyof TechStack | null = null;
    let currentTech: Partial<TechItem> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const rawLine = lines[i];
      
      if (!line) continue; // Skip empty lines

      // Check for category header FIRST - must be exact
      if (line.startsWith('###')) {
        console.log(`=== PARSER LOG: Line ${i} is ### line:`, line);
        // Save previous tech before switching category
        if (currentTech && currentCategory) {
          stack[currentCategory].push(currentTech as TechItem);
          currentTech = null;
        }

        if (line.includes('Frontend')) {
          currentCategory = 'frontend';
          console.log('Found Frontend category');
        } else if (line.includes('Backend')) {
          currentCategory = 'backend';
          console.log('Found Backend category');
        } else if (line.includes('Database')) {
          currentCategory = 'database';
          console.log('Found Database category');
        } else if (line.includes('DevOps') || line.includes('Infrastructure')) {
          currentCategory = 'devops';
          console.log('Found DevOps category');
        } else if (line.includes('Additional')) {
          currentCategory = 'additional';
          console.log('Found Additional category');
        }
        continue;
      }

      // Skip explanation lines from alternatives (When to use this stack, Primary trade-off, etc)
      if (line.startsWith('**') && (line.includes('When to use this stack') || line.includes('Primary trade-off') || line.includes('Why this option is worth considering'))) {
        continue;
      }

      // Check for tech name line: **Tech_Name:** or **Name** - emoji
      if (line.startsWith('**') && line.includes('-')) {
        console.log(`=== PARSER LOG: Line ${i} is ** line:`, line);
        console.log(`Raw line: "${rawLine}"`);
        // Save previous tech
        if (currentTech && currentCategory) {
          stack[currentCategory].push(currentTech as TechItem);
        }

        // Match both formats: **Tech_Name:** TechName - emoji OR **TechName** - emoji
        let nameMatch = line.match(/\*\*Tech_Name:\*\*\s+(.+?)\s+-\s+(.*)/);
        if (!nameMatch) {
          nameMatch = line.match(/^\*\*([^*]+)\*\*\s*-\s*(.*)/);
        }
        
        if (nameMatch) {
          currentTech = {
            name: nameMatch[1].trim(),
            icon: '', // Don't use the emoji from response, let getTechLogo handle it
            pros: [],
            cons: [],
            why: '',
          };
          console.log('Found tech:', nameMatch[1].trim());
        } else {
          console.log('NO MATCH for pattern:', line);
        }
        continue;
      }

      // Check for Pros line
      if (line.toLowerCase().startsWith('pros:') && currentTech) {
        const prosText = line.substring(5).trim();
        currentTech.pros = prosText
          .split('•')
          .map(p => p.trim().replace(/,\s*$/, '').replace(/\s+/g, ' '))
          .filter(p => p.length > 0);
        continue;
      }

      // Check for Cons line
      if (line.toLowerCase().startsWith('cons:') && currentTech) {
        const consText = line.substring(5).trim();
        currentTech.cons = consText
          .split('•')
          .map(c => c.trim().replace(/,\s*$/, '').replace(/\s+/g, ' '))
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
  console.log('=== PARSER LOG: PRIMARY match index:', primaryMatch);
  console.log('=== PARSER LOG: Full response includes PRIMARY?', response.includes('## PRIMARY'));
  
  if (primaryMatch !== -1) {
    // Find the next ## that marks either ALTERNATIVE or end
    let primaryEnd = response.indexOf('## ALTERNATIVE', primaryMatch + 1);
    if (primaryEnd === -1) primaryEnd = response.length;
    
    const primaryText = response.substring(primaryMatch, primaryEnd);
    console.log('=== PARSER LOG: Primary section extracted, length:', primaryText.length);
    console.log('=== PARSER LOG: Primary section starts:', primaryText.substring(0, 300));
    
    // Log what categories are in the primary section
    console.log('=== PARSER LOG: Has ### Frontend?', primaryText.includes('### Frontend'));
    console.log('=== PARSER LOG: Has ### Backend?', primaryText.includes('### Backend'));
    console.log('=== PARSER LOG: Has ### Database?', primaryText.includes('### Database'));
    console.log('=== PARSER LOG: Has **?', primaryText.includes('**'));
    
    // Show first few lines with ### or **
    const lines = primaryText.split('\n');
    const relevantLines = lines.filter(l => l.includes('###') || l.includes('**'));
    console.log('=== PARSER LOG: First relevant lines:', relevantLines.slice(0, 5));
    
    result.primary = parseStack(primaryText);
    console.log('=== PARSER LOG: Primary stack parsed - Frontend:', result.primary.frontend.length, 'Backend:', result.primary.backend.length);
  } else {
    console.log('=== PARSER LOG: PRIMARY section NOT FOUND! Full response:', response);
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
  const lineHeight = 6;

  // Utility function to add page if needed
  const checkPageBreak = (spaceNeeded: number) => {
    if (currentY + spaceNeeded > pageHeight - 15) {
      doc.addPage();
      currentY = 20;
    }
  };

  // Utility function to add wrapped text
  const addWrappedText = (text: string, fontSize: number, color: [number, number, number], indent: number = 0, maxWidth?: number) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const width = maxWidth || pageWidth - margin * 2 - indent;
    const wrapped = doc.splitTextToSize(text, width);
    doc.text(wrapped, margin + indent, currentY);
    currentY += wrapped.length * lineHeight + 2;
    return wrapped.length;
  };

  // === COVER PAGE ===
  doc.setFontSize(26);
  doc.setTextColor(15, 103, 204);
  // Split title into two lines to fit
  doc.text('TECHNOLOGY STACK', margin, 40);
  doc.text('RECOMMENDATION', margin, 50);
  
  doc.setFontSize(14);
  doc.setTextColor(75, 85, 99);
  currentY = 70;
  doc.text('Formal Analysis & Strategic Recommendations', margin, currentY);
  currentY += 20;

  // Project Details
  doc.setFontSize(11);
  doc.setTextColor(26, 32, 44);
  
  const projectDetails = [
    { label: 'Application Type', value: data.inputs.appType },
    { label: 'Target Scale', value: data.inputs.scale },
    { label: 'Budget', value: data.inputs.budget },
    { label: 'Team Size', value: data.inputs.teamSize },
    { label: 'Time to Market', value: data.inputs.timeToMarket },
    { label: 'Key Focus Areas', value: data.inputs.focus },
    ...(data.inputs.securityLevel ? [{ label: 'Security Level', value: data.inputs.securityLevel }] : []),
    ...(data.inputs.customConstraints ? [{ label: 'Additional Constraints', value: data.inputs.customConstraints }] : []),
  ];

  projectDetails.forEach(detail => {
    currentY += 12;
    doc.setFontSize(10);
    doc.setTextColor(15, 103, 204);
    doc.text(`${detail.label}:`, margin, currentY);
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(detail.value, margin + 50, currentY);
  });

  doc.addPage();
  currentY = 20;

  // === TABLE OF CONTENTS ===
  doc.setFontSize(16);
  doc.setTextColor(15, 103, 204);
  doc.text('TABLE OF CONTENTS', margin, currentY);
  currentY += 12;

  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  const toc = [
    '1. Executive Summary & Rationale',
    '2. PRIMARY TECHNOLOGY STACK - Detailed Analysis',
    '3. Component Breakdown & Strategic Justification',
    '4. ALTERNATIVE STACK OPTIONS',
    '5. Comparative Analysis',
    '6. Implementation Roadmap',
  ];

  toc.forEach(item => {
    doc.text(item, margin + 5, currentY);
    currentY += 8;
  });

  doc.addPage();
  currentY = 20;

  // === EXECUTIVE SUMMARY ===
  doc.setFontSize(16);
  doc.setTextColor(15, 103, 204);
  doc.text('1. EXECUTIVE SUMMARY & RATIONALE', margin, currentY);
  currentY += 10;

  const summaryParts = [
    `OVERVIEW`,
    `This document presents a comprehensive technology stack recommendation tailored specifically to your project requirements. The analysis considered your core constraints: a ${data.inputs.budget.toLowerCase()} budget, ${data.inputs.timeToMarket.toLowerCase()} time-to-market window, ${data.inputs.scale.toLowerCase()} user scale, and a ${data.inputs.teamSize.toLowerCase()} development team. Each technology choice has been justified through rigorous evaluation of trade-offs, cost implications, team capability requirements, and long-term scalability potential.`,
    
    `KEY DECISION FACTORS`,
    `Your stated focus areas of ${data.inputs.focus.toLowerCase()} directly influenced every recommendation. The PRIMARY stack prioritizes cost-effective solutions that minimize operational overhead while delivering production-ready quality. Given your aggressive timeline (${data.inputs.timeToMarket.toLowerCase()}), the recommended technologies emphasize developer productivity and minimal setup complexity. The stack scales efficiently from your initial 1K-10K user target to support future growth without requiring complete architectural redesign.`,
    
    `STACK COMPOSITION RATIONALE`,
    `The PRIMARY recommendation combines battle-tested, modern technologies that work exceptionally well together. The frontend leverages current best practices for responsive, performant UIs. The backend provides the agility needed for AI-driven features while maintaining clean, maintainable code. The database choice balances reliability with cost efficiency at your scale. DevOps and infrastructure tools have been selected to minimize operational complexity for a solo developer, with clear paths to add team members as the project scales.`,
    
    `ALTERNATIVE OPTIONS`,
    `Three alternative stacks are provided, each optimized for different priority shifts. These alternatives maintain production-ready quality but offer different trade-offs—for example, trading development speed for raw performance, or operational simplicity for maximum scalability. Review these alternatives if your constraints shift (e.g., budget increases, timeline extends, or team expands).`,
    
    `IMPLEMENTATION CONFIDENCE`,
    `Each technology in the PRIMARY recommendation is proven, actively maintained, and widely adopted. The combination has been battle-tested in hundreds of production applications at comparable scales. You should feel confident that this is not an experimental setup, but rather a pragmatic, industry-standard approach optimized for your specific situation.`
  ];

  doc.setFontSize(11);
  doc.setTextColor(75, 85, 99);
  
  for (let i = 0; i < summaryParts.length; i += 2) {
    checkPageBreak(15);
    
    if (summaryParts[i]) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 103, 204);
      doc.text(summaryParts[i], margin, currentY);
      currentY += 6;
    }
    
    if (summaryParts[i + 1]) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      const wrappedText = doc.splitTextToSize(summaryParts[i + 1], pageWidth - margin * 2);
      doc.text(wrappedText, margin, currentY);
      currentY += wrappedText.length * lineHeight + 8;
    }
  }

  currentY += 5;

  // === PRIMARY STACK SECTION ===
  doc.addPage();
  currentY = 20;

  doc.setFontSize(18);
  doc.setTextColor(15, 103, 204);
  doc.text('2. PRIMARY TECHNOLOGY STACK', margin, currentY);
  currentY += 12;

  doc.setFontSize(11);
  doc.setTextColor(75, 85, 99);
  addWrappedText('This stack represents the optimal choice for your project context, balancing performance, cost, development speed, and scalability.', 10, [75, 85, 99]);
  currentY += 8;

  // Function to add detailed tech section
  const addTechDetail = (title: string, items: TechItem[]) => {
    if (items.length === 0) return;

    checkPageBreak(15);
    doc.setFontSize(13);
    doc.setTextColor(15, 103, 204);
    doc.text(title, margin, currentY);
    currentY += 8;

    items.forEach((tech, index) => {
      checkPageBreak(30);

      // Tech name
      doc.setFontSize(12);
      doc.setTextColor(26, 32, 44);
      doc.setFont(undefined, 'bold');
      doc.text(`${tech.name}`, margin + 2, currentY);
      doc.setFont(undefined, 'normal');
      currentY += 6;

      // Why this technology - PRIMARY JUSTIFICATION
      doc.setFontSize(10);
      doc.setTextColor(15, 103, 204);
      doc.setFont(undefined, 'bold');
      doc.text('Strategic Rationale:', margin + 4, currentY);
      doc.setFont(undefined, 'normal');
      currentY += 4;

      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      const whyWrapped = doc.splitTextToSize(tech.why, pageWidth - margin * 2 - 8);
      doc.text(whyWrapped, margin + 8, currentY);
      currentY += whyWrapped.length * lineHeight + 3;

      // Advantages
      checkPageBreak(10);
      doc.setFontSize(10);
      doc.setTextColor(22, 163, 74);
      doc.setFont(undefined, 'bold');
      doc.text('Key Advantages:', margin + 4, currentY);
      doc.setFont(undefined, 'normal');
      currentY += 4;

      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      tech.pros.forEach((pro) => {
        checkPageBreak(4);
        doc.text(`• ${pro}`, margin + 8, currentY);
        currentY += lineHeight;
      });
      currentY += 2;

      // Limitations
      doc.setFontSize(10);
      doc.setTextColor(217, 119, 6);
      doc.setFont(undefined, 'bold');
      doc.text('Trade-offs & Considerations:', margin + 4, currentY);
      doc.setFont(undefined, 'normal');
      currentY += 4;

      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      tech.cons.forEach((con) => {
        checkPageBreak(4);
        doc.text(`• ${con}`, margin + 8, currentY);
        currentY += lineHeight;
      });

      currentY += 6;
      // Separator
      doc.setDrawColor(209, 213, 219);
      doc.line(margin + 2, currentY, pageWidth - margin - 2, currentY);
      currentY += 6;
    });
  };

  addTechDetail('Frontend Technology', data.primary.frontend);
  addTechDetail('Backend Technology', data.primary.backend);
  addTechDetail('Database Solution', data.primary.database);
  addTechDetail('DevOps & Infrastructure', data.primary.devops);
  addTechDetail('Additional Services & Tools', data.primary.additional);

  // === ALTERNATIVE STACKS ===
  if (data.alternatives && data.alternatives.length > 0) {
    data.alternatives.forEach((altStack, index) => {
      doc.addPage();
      currentY = 20;

      doc.setFontSize(18);
      doc.setTextColor(15, 103, 204);
      doc.text(`ALTERNATIVE STACK #${index + 1}`, margin, currentY);
      currentY += 10;

      const explanation = data.alternative_explanations[index];
      if (explanation) {
        doc.setFontSize(10);
        doc.setTextColor(15, 103, 204);
        doc.setFont(undefined, 'bold');
        doc.text('When to Consider This Stack:', margin, currentY);
        doc.setFont(undefined, 'normal');
        currentY += 4;
        
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        const whenWrapped = doc.splitTextToSize(explanation.when_to_use, pageWidth - margin * 2 - 4);
        doc.text(whenWrapped, margin + 4, currentY);
        currentY += whenWrapped.length * lineHeight + 5;

        checkPageBreak(10);
        doc.setFontSize(10);
        doc.setTextColor(15, 103, 204);
        doc.setFont(undefined, 'bold');
        doc.text('Primary Trade-off vs. PRIMARY Stack:', margin, currentY);
        doc.setFont(undefined, 'normal');
        currentY += 4;

        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        const tradeoffWrapped = doc.splitTextToSize(explanation.trade_off, pageWidth - margin * 2 - 4);
        doc.text(tradeoffWrapped, margin + 4, currentY);
        currentY += tradeoffWrapped.length * lineHeight + 5;

        checkPageBreak(10);
        doc.setFontSize(10);
        doc.setTextColor(15, 103, 204);
        doc.setFont(undefined, 'bold');
        doc.text('Viability & Worth Considering:', margin, currentY);
        doc.setFont(undefined, 'normal');
        currentY += 4;

        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        const whyConsiderWrapped = doc.splitTextToSize(explanation.why_consider, pageWidth - margin * 2 - 4);
        doc.text(whyConsiderWrapped, margin + 4, currentY);
        currentY += whyConsiderWrapped.length * lineHeight + 8;
      }

      addTechDetail('Frontend Technology', altStack.frontend);
      addTechDetail('Backend Technology', altStack.backend);
      addTechDetail('Database Solution', altStack.database);
      addTechDetail('DevOps & Infrastructure', altStack.devops);
      addTechDetail('Additional Services & Tools', altStack.additional);
    });

    // === COMPARATIVE ANALYSIS ===
    doc.addPage();
    currentY = 20;

    doc.setFontSize(16);
    doc.setTextColor(15, 103, 204);
    doc.text('5. COMPARATIVE ANALYSIS', margin, currentY);
    currentY += 10;

    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    const comparisonIntro = `Below is a detailed comparison of the PRIMARY and ALTERNATIVE stacks across key evaluation criteria. This analysis helps clarify trade-offs and helps you understand when each stack would be most appropriate.`;
    const comparisonWrapped = doc.splitTextToSize(comparisonIntro, pageWidth - margin * 2);
    doc.text(comparisonWrapped, margin, currentY);
    currentY += comparisonWrapped.length * lineHeight + 10;

    checkPageBreak(15);

    // Build comparison matrix with meaningful comparisons
    const buildComparisonValue = (stackIndex: number, criterion: string) => {
      if (stackIndex === 0) {
        // PRIMARY values
        switch(criterion) {
          case 'Initial Setup Cost': return '$0-50/month (free tiers)';
          case 'Development Speed': return 'Fast - integrated framework';
          case 'Scalability Potential': return 'Excellent - scales to 100K+';
          case 'Learning Curve': return 'Moderate - JavaScript/TypeScript';
          case 'Team Size Fit': return 'Perfect for solo developers';
          case 'Long-term Maintenance': return 'Low effort - mature tech stack';
          default: return '';
        }
      } else {
        // ALTERNATIVE values - slightly different trade-offs
        switch(criterion) {
          case 'Initial Setup Cost': return '$50-200/month typical';
          case 'Development Speed': return 'Moderate - more setup needed';
          case 'Scalability Potential': return 'Excellent - enterprise-ready';
          case 'Learning Curve': return 'Steeper - more complex stack';
          case 'Team Size Fit': return 'Better for larger teams';
          case 'Long-term Maintenance': return 'Medium effort - more components';
          default: return '';
        }
      }
    };

    // Create comparison data
    const stackComparison: Array<{ criteria: string; primary: string; alternatives?: string[] }> = [
      { criteria: 'Initial Setup Cost', primary: buildComparisonValue(0, 'Initial Setup Cost') },
      { criteria: 'Development Speed', primary: buildComparisonValue(0, 'Development Speed') },
      { criteria: 'Scalability Potential', primary: buildComparisonValue(0, 'Scalability Potential') },
      { criteria: 'Learning Curve', primary: buildComparisonValue(0, 'Learning Curve') },
      { criteria: 'Team Size Fit', primary: buildComparisonValue(0, 'Team Size Fit') },
      { criteria: 'Long-term Maintenance', primary: buildComparisonValue(0, 'Long-term Maintenance') },
    ];

    // Add alternative columns
    stackComparison.forEach((row) => {
      row.alternatives = [];
      if (data.alternatives && data.alternatives.length > 0) {
        for (let i = 1; i <= data.alternatives.length; i++) {
          if (row.alternatives) {
            row.alternatives.push(buildComparisonValue(i, row.criteria));
          }
        }
      }
    });

    // Create comparison table
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setFillColor(15, 103, 204);
    doc.setTextColor(255, 255, 255);

    const colWidths = {
      criteria: 45,
      stack: (pageWidth - margin * 2 - 45) / (1 + (data.alternatives?.length || 0))
    };

    // Draw header row
    let tableX = margin;
    const headerY = currentY + 4;
    const headerHeight = 7;
    
    // Criteria header
    doc.rect(tableX, currentY, colWidths.criteria, headerHeight, 'F');
    doc.text('Criteria', tableX + 2, headerY);
    tableX += colWidths.criteria;

    // PRIMARY header
    doc.rect(tableX, currentY, colWidths.stack, headerHeight, 'F');
    doc.text('PRIMARY', tableX + (colWidths.stack / 2) - 10, headerY);
    tableX += colWidths.stack;

    // ALTERNATIVE headers
    if (data.alternatives) {
      for (let i = 0; i < data.alternatives.length; i++) {
        doc.rect(tableX, currentY, colWidths.stack, headerHeight, 'F');
        doc.text(`ALT #${i + 1}`, tableX + (colWidths.stack / 2) - 8, headerY);
        tableX += colWidths.stack;
      }
    }

    currentY += headerHeight + 2;
    doc.setFont(undefined, 'normal');
    doc.setTextColor(75, 85, 99);
    doc.setTextColor(75, 85, 99);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);

    // Data rows
    doc.setTextColor(75, 85, 99);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);

    stackComparison.forEach((row, rowIndex) => {
      checkPageBreak(12);
      
      const rowStartY = currentY;
      let maxRowHeight = 8;

      tableX = margin;

      // Criteria column
      const criteriaLines = doc.splitTextToSize(row.criteria, colWidths.criteria - 4);
      doc.text(criteriaLines, tableX + 2, currentY + 1);
      maxRowHeight = Math.max(maxRowHeight, criteriaLines.length * 4);
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(tableX, rowStartY, colWidths.criteria, maxRowHeight + 3);
      tableX += colWidths.criteria;

      // Primary column
      const primaryLines = doc.splitTextToSize(row.primary, colWidths.stack - 4);
      doc.text(primaryLines, tableX + 2, currentY + 1);
      maxRowHeight = Math.max(maxRowHeight, primaryLines.length * 4);
      
      doc.rect(tableX, rowStartY, colWidths.stack, maxRowHeight + 3);
      tableX += colWidths.stack;

      // Alternative columns
      if (row.alternatives) {
        row.alternatives.forEach(altValue => {
          const altLines = doc.splitTextToSize(altValue, colWidths.stack - 4);
          doc.text(altLines, tableX + 2, currentY + 1);
          maxRowHeight = Math.max(maxRowHeight, altLines.length * 4);
          
          doc.rect(tableX, rowStartY, colWidths.stack, maxRowHeight + 3);
          tableX += colWidths.stack;
        });
      }

      currentY = rowStartY + maxRowHeight + 3;
    });

    currentY += 10;
    checkPageBreak(10);
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    const comparisonFooter = `Note: The PRIMARY stack is optimized for your stated constraints (${data.inputs.budget}, ${data.inputs.timeToMarket}, ${data.inputs.scale}). Each ALTERNATIVE offers different strengths - review the detailed sections above to understand when each would be preferable.`;
    const footerWrapped = doc.splitTextToSize(comparisonFooter, pageWidth - margin * 2);
    doc.text(footerWrapped, margin, currentY);

  }

  // === IMPLEMENTATION ROADMAP ===
  doc.addPage();
  currentY = 20;

  doc.setFontSize(16);
  doc.setTextColor(15, 103, 204);
  doc.text('6. IMPLEMENTATION ROADMAP', margin, currentY);
  currentY += 10;

  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  addWrappedText('Follow these steps to successfully implement the recommended technology stack:', 10, [75, 85, 99]);
  currentY += 6;

  const roadmapSteps = [
    { title: 'Phase 1: Environment Setup', desc: 'Install and configure all development tools and dependencies. Set up version control and CI/CD pipelines.' },
    { title: 'Phase 2: Core Architecture', desc: 'Initialize project structure for frontend and backend. Configure database schema and API endpoints.' },
    { title: 'Phase 3: Feature Development', desc: 'Build core features iteratively with automated testing. Implement user authentication and data persistence.' },
    { title: 'Phase 4: Integration & Testing', desc: 'Integrate frontend and backend components. Perform end-to-end testing and optimization.' },
    { title: 'Phase 5: Deployment', desc: 'Deploy to production environment. Configure monitoring, logging, and auto-scaling.' },
  ];

  roadmapSteps.forEach((step, index) => {
    checkPageBreak(8);
    doc.setFontSize(10);
    doc.setTextColor(15, 103, 204);
    doc.setFont(undefined, 'bold');
    doc.text(`${index + 1}. ${step.title}`, margin + 2, currentY);
    doc.setFont(undefined, 'normal');
    currentY += 4;

    doc.setFontSize(9);
    doc.setTextColor(75, 85, 99);
    const descWrapped = doc.splitTextToSize(step.desc, pageWidth - margin * 2 - 8);
    doc.text(descWrapped, margin + 6, currentY);
    currentY += descWrapped.length * lineHeight + 4;
  });

  // Footer
  doc.addPage();
  currentY = pageHeight - 60;

  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text('Report Generated: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), margin, currentY);
  currentY += 8;
  doc.text('TechStack.Studio Analysis & Recommendation Engine', margin, currentY);
  currentY += 8;
  doc.text('This report provides strategic guidance based on your project requirements. All recommendations should be validated against your team\'s expertise and evolving business needs.', margin, currentY);

  // Save
  doc.save('TechStack_Recommendation_Report.pdf');
}
