import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface HelpBrowserProps {
  onClose: () => void;
}

interface DocFile {
  name: string;
  title: string;
  path: string;
}

// Player-facing documentation (not developer docs)
const DOC_FILES: DocFile[] = [
  { name: 'getting-started', title: '🎮 Getting Started', path: '/TwilightGame/docs/GETTING_STARTED.md' },
  { name: 'farming', title: '🌾 Farming Guide', path: '/TwilightGame/docs/FARMING.md' },
  { name: 'seeds', title: '🌱 Seeds Guide', path: '/TwilightGame/docs/SEEDS.md' },
  { name: 'time', title: '⏰ Time & Seasons', path: '/TwilightGame/docs/TIME_SYSTEM.md' },
  // Developer docs excluded: MAP_GUIDE, ASSETS, COORDINATE_GUIDE
];

const HelpBrowser: React.FC<HelpBrowserProps> = ({ onClose }) => {
  const [selectedDoc, setSelectedDoc] = useState<string>('getting-started');
  const [content, setContent] = useState<string>('Loading...');

  useEffect(() => {
    // Load the selected document
    const docFile = DOC_FILES.find(doc => doc.name === selectedDoc);
    if (docFile) {
      fetch(docFile.path)
        .then(response => response.text())
        .then(text => setContent(text))
        .catch(error => {
          console.error('Failed to load documentation:', error);
          setContent('# Error\n\nFailed to load documentation file.');
        });
    }
  }, [selectedDoc]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border-4 border-slate-700 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-slate-800 border-b-4 border-slate-700 p-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-400">📖 Game Help</h1>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded border-2 border-red-800 transition-colors"
          >
            Close [ESC]
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-slate-800 border-r-4 border-slate-700 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-bold text-amber-300 mb-3">Topics</h2>
              {DOC_FILES.map(doc => (
                <button
                  key={doc.name}
                  onClick={() => setSelectedDoc(doc.name)}
                  className={`w-full text-left px-4 py-3 mb-2 rounded font-semibold transition-colors ${
                    selectedDoc === doc.name
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {doc.title}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-900">
            <div className="prose prose-invert prose-amber max-w-none">
              <ReactMarkdown
                components={{
                  // Custom styling for markdown elements
                  h1: ({ node, ...props }) => <h1 className="text-4xl font-bold text-amber-400 mb-4 border-b-2 border-amber-600 pb-2" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-3xl font-bold text-amber-300 mt-8 mb-3" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-2xl font-bold text-amber-200 mt-6 mb-2" {...props} />,
                  p: ({ node, ...props }) => <p className="text-slate-200 mb-4 leading-relaxed" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc list-inside text-slate-200 mb-4 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-slate-200 mb-4 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="text-slate-200 ml-4" {...props} />,
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-slate-800 text-amber-300 px-2 py-1 rounded font-mono text-sm" {...props} />
                    ) : (
                      <code className="block bg-slate-800 text-amber-300 p-4 rounded font-mono text-sm overflow-x-auto mb-4" {...props} />
                    ),
                  pre: ({ node, ...props }) => <pre className="bg-slate-800 p-4 rounded overflow-x-auto mb-4" {...props} />,
                  strong: ({ node, ...props }) => <strong className="text-amber-300 font-bold" {...props} />,
                  em: ({ node, ...props }) => <em className="text-amber-200 italic" {...props} />,
                  a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-amber-600 pl-4 italic text-slate-300 mb-4" {...props} />,
                  table: ({ node, ...props }) => <table className="w-full border-collapse mb-4" {...props} />,
                  th: ({ node, ...props }) => <th className="border border-slate-600 bg-slate-800 px-4 py-2 text-left text-amber-300 font-bold" {...props} />,
                  td: ({ node, ...props }) => <td className="border border-slate-600 px-4 py-2 text-slate-200" {...props} />,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-800 border-t-4 border-slate-700 p-3 text-center text-slate-400 text-sm">
          Press <kbd className="bg-slate-700 px-2 py-1 rounded border border-slate-600">F1</kbd> anytime to open help
        </div>
      </div>
    </div>
  );
};

export default HelpBrowser;
