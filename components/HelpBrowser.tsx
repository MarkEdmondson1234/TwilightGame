import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Z_HELP_BROWSER, zClass } from '../zIndex';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey, reinitializeClient, isAIAvailable } from '../services/anthropicClient';

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
  { name: 'ai-chat', title: '💬 AI Chat', path: '/TwilightGame/docs/AI_CHAT.md' },
  // Developer docs excluded: MAP_GUIDE, ASSETS, COORDINATE_GUIDE
];

// Special "settings" tab identifier
const SETTINGS_TAB = 'settings';

const HelpBrowser: React.FC<HelpBrowserProps> = ({ onClose }) => {
  const [selectedTab, setSelectedTab] = useState<string>('getting-started');
  const [content, setContent] = useState<string>('Loading...');

  // API Key settings state
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [hasStoredKey, setHasStoredKey] = useState<boolean>(false);
  const [aiEnabled, setAiEnabled] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Check for stored key on mount and when settings tab is selected
  useEffect(() => {
    const storedKey = getStoredApiKey();
    setHasStoredKey(!!storedKey);
    setAiEnabled(isAIAvailable());
  }, [selectedTab]);

  useEffect(() => {
    // Only load document content for doc tabs, not settings
    if (selectedTab === SETTINGS_TAB) return;

    const docFile = DOC_FILES.find(doc => doc.name === selectedTab);
    if (docFile) {
      fetch(docFile.path)
        .then(response => response.text())
        .then(text => setContent(text))
        .catch(error => {
          console.error('Failed to load documentation:', error);
          setContent('# Error\n\nFailed to load documentation file.');
        });
    }
  }, [selectedTab]);

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
      setSaveMessage('Please enter an API key');
      return;
    }
    if (!apiKeyInput.startsWith('sk-ant-')) {
      setSaveMessage('API key should start with sk-ant-');
      return;
    }
    setStoredApiKey(apiKeyInput.trim());
    const success = reinitializeClient();
    setHasStoredKey(true);
    setAiEnabled(success);
    setApiKeyInput('');
    setSaveMessage(success ? 'API key saved! AI dialogue is now enabled.' : 'Key saved but failed to initialize client.');
  };

  const handleClearApiKey = () => {
    clearStoredApiKey();
    reinitializeClient();
    setHasStoredKey(false);
    setAiEnabled(false);
    setSaveMessage('API key removed.');
  };

  return (
    <div className={`fixed inset-0 bg-black/80 flex items-center justify-center ${zClass(Z_HELP_BROWSER)} p-4`}>
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
                  onClick={() => setSelectedTab(doc.name)}
                  className={`w-full text-left px-4 py-3 mb-2 rounded font-semibold transition-colors ${
                    selectedTab === doc.name
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {doc.title}
                </button>
              ))}

              {/* Divider */}
              <div className="border-t border-slate-600 my-4"></div>

              {/* Settings Tab */}
              <button
                onClick={() => setSelectedTab(SETTINGS_TAB)}
                className={`w-full text-left px-4 py-3 mb-2 rounded font-semibold transition-colors ${
                  selectedTab === SETTINGS_TAB
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {aiEnabled ? '⚙️ Settings' : '⚙️ Settings'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-900">
            {selectedTab === SETTINGS_TAB ? (
              /* Settings Panel */
              <div className="max-w-2xl">
                <h1 className="text-3xl font-bold text-purple-400 mb-6">Settings</h1>

                {/* AI Dialogue Section */}
                <div className="bg-slate-800 rounded-lg p-6 border-2 border-slate-700">
                  <h2 className="text-xl font-bold text-amber-300 mb-4">AI Dialogue</h2>
                  <p className="text-slate-300 mb-4">
                    Enable dynamic AI-powered conversations with NPCs by providing your own Anthropic API key.
                    Your key is stored locally in your browser and never sent to our servers.
                  </p>

                  {/* Status indicator */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mb-4 ${
                    aiEnabled
                      ? 'bg-green-900/50 text-green-400 border border-green-700'
                      : 'bg-slate-700 text-slate-400 border border-slate-600'
                  }`}>
                    {aiEnabled ? '● AI Enabled' : '○ AI Disabled'}
                  </div>

                  {hasStoredKey ? (
                    /* Key already stored */
                    <div className="space-y-4">
                      <p className="text-green-400">
                        API key is configured and stored in your browser.
                      </p>
                      <button
                        onClick={handleClearApiKey}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded border-2 border-red-800 transition-colors"
                      >
                        Remove API Key
                      </button>
                    </div>
                  ) : (
                    /* No key stored - show input */
                    <div className="space-y-4">
                      <div>
                        <label className="block text-slate-300 mb-2 text-sm">
                          Anthropic API Key
                        </label>
                        <input
                          type="password"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="sk-ant-..."
                          className="w-full px-4 py-2 bg-slate-900 border-2 border-slate-600 rounded text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={handleSaveApiKey}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded border-2 border-purple-800 transition-colors"
                      >
                        Save API Key
                      </button>
                      <p className="text-slate-500 text-sm">
                        Get your key at{' '}
                        <a
                          href="https://console.anthropic.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 underline"
                        >
                          console.anthropic.com
                        </a>
                      </p>
                    </div>
                  )}

                  {/* Save message */}
                  {saveMessage && (
                    <p className={`mt-4 text-sm ${
                      saveMessage.includes('saved') || saveMessage.includes('enabled')
                        ? 'text-green-400'
                        : saveMessage.includes('removed')
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}>
                      {saveMessage}
                    </p>
                  )}
                </div>

                {/* Info box */}
                <div className="mt-6 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="text-amber-300 font-semibold mb-2">How it works</h3>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• Your API key is stored only in your browser's localStorage</li>
                    <li>• API calls go directly from your browser to Anthropic</li>
                    <li>• Uses Claude Haiku for fast, cost-effective responses</li>
                    <li>• Typical cost: less than $0.01 per conversation</li>
                  </ul>
                </div>
              </div>
            ) : (
            /* Documentation Content */
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
            )}
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
