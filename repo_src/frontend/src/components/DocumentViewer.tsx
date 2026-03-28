import { useEffect, useRef, useMemo } from 'react';
import type { MapFocus } from './MapView';

export interface DocSection {
  id: string;
  heading: string;
  rawHeading: string;
  level: number;
  content: string;
  location?: MapFocus;
}

interface Props {
  markdown: string;
  activeSectionId: string | null;
  sectionLocations: Record<string, MapFocus>;
  onSectionFocus: (sectionId: string, location: MapFocus | null) => void;
}

// Slug a heading to a stable ID
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Render inline markdown: **bold**, *em*, `code`
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="dv-inline-code">{p.slice(1, -1)}</code>;
    return p;
  });
}

// Render a block of content lines (everything below the ## heading)
function renderContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Sub-heading ###
    if (line.startsWith('### ')) {
      nodes.push(<h4 key={i} className="dv-h3">{renderInline(line.slice(4))}</h4>);
      i++; continue;
    }
    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="dv-hr" />);
      i++; continue;
    }
    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote key={i} className="dv-quote">
          {quoteLines.map((ql, j) => <p key={j}>{renderInline(ql)}</p>)}
        </blockquote>
      );
      continue;
    }
    // Unordered list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={i} className="dv-list">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    }
    // Table rows (skip for simplicity — render as code block)
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      // Parse table
      const rows = tableLines.filter(r => !r.match(/^\|[\s-|]+\|$/));
      nodes.push(
        <table key={i} className="dv-table">
          <tbody>
            {rows.map((row, j) => (
              <tr key={j}>
                {row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1).map((cell, k) => (
                  <td key={k}>{renderInline(cell.trim())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }
    // Code fence
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      nodes.push(<pre key={i} className="dv-code-block"><code>{codeLines.join('\n')}</code></pre>);
      continue;
    }
    // Empty line
    if (line.trim() === '') {
      i++; continue;
    }
    // Paragraph
    nodes.push(<p key={i} className="dv-p">{renderInline(line)}</p>);
    i++;
  }
  return nodes;
}

export function parseDocSections(markdown: string, sectionLocations: Record<string, MapFocus>): DocSection[] {
  const lines = markdown.split('\n');
  const sections: DocSection[] = [];
  let currentSection: DocSection | null = null;
  let contentLines: string[] = [];

  const flush = () => {
    if (currentSection) {
      currentSection.content = contentLines.join('\n').trim();
      sections.push(currentSection);
    }
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      contentLines = [];
      const rawHeading = line.slice(3).trim();
      const id = slugify(rawHeading);
      currentSection = {
        id,
        heading: rawHeading,
        rawHeading,
        level: 2,
        content: '',
        location: sectionLocations[id],
      };
    } else {
      contentLines.push(line);
    }
  }
  flush();
  return sections;
}

export default function DocumentViewer({ markdown, activeSectionId, sectionLocations, onSectionFocus }: Props) {
  const sections = useMemo(() => parseDocSections(markdown, sectionLocations), [markdown, sectionLocations]);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-scroll to active section
  useEffect(() => {
    if (!activeSectionId) return;
    const el = sectionRefs.current.get(activeSectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeSectionId]);

  return (
    <div className="dv-wrap">
      {sections.map((section) => {
        const isActive = section.id === activeSectionId;
        return (
          <div
            key={section.id}
            ref={(el) => {
              if (el) sectionRefs.current.set(section.id, el);
              else sectionRefs.current.delete(section.id);
            }}
            className={`dv-section ${isActive ? 'dv-section--active' : ''}`}
          >
            <h2
              className="dv-h2"
              onClick={() => onSectionFocus(section.id, section.location ?? null)}
              title={section.location ? 'Click to fly map here' : undefined}
              style={{ cursor: section.location ? 'pointer' : 'default' }}
            >
              {section.location && <span className="dv-h2__pin">📍</span>}
              {renderInline(section.heading)}
            </h2>
            <div className="dv-content">
              {renderContent(section.content)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
