import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Z_HELP_BROWSER, zClass } from '../zIndex';
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  reinitializeClient,
  isAIAvailable,
} from '../services/anthropicClient';
import { audioManager } from '../utils/AudioManager';

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
  {
    name: 'getting-started',
    title: '🎮 Getting Started',
    path: '/TwilightGame/docs/GETTING_STARTED.md',
  },
  { name: 'stamina', title: '💚 Stamina', path: '/TwilightGame/docs/STAMINA.md' },
  { name: 'farming', title: '🌾 Farming Guide', path: '/TwilightGame/docs/FARMING.md' },
  { name: 'seeds', title: '🌱 Seeds Guide', path: '/TwilightGame/docs/SEEDS.md' },
  { name: 'magic', title: '🧪 Magic & Potions', path: '/TwilightGame/docs/MAGIC.md' },
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

  // Audio settings state
  const [musicEnabled, setMusicEnabled] = useState<boolean>(!audioManager.isMuted());

  // Check for stored key on mount and when settings tab is selected
  useEffect(() => {
    const storedKey = getStoredApiKey();
    setHasStoredKey(!!storedKey);
    setAiEnabled(isAIAvailable());
    // Sync music state when settings tab is opened
    setMusicEnabled(!audioManager.isMuted());
  }, [selectedTab]);

  const handleMusicToggle = () => {
    const newMuted = audioManager.toggleMute();
    setMusicEnabled(!newMuted);
  };

  useEffect(() => {
    // Only load document content for doc tabs, not settings
    if (selectedTab === SETTINGS_TAB) return;

    const docFile = DOC_FILES.find((doc) => doc.name === selectedTab);
    if (docFile) {
      fetch(docFile.path)
        .then((response) => response.text())
        .then((text) => setContent(text))
        .catch((error) => {
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
    setSaveMessage(
      success
        ? 'API key saved! AI dialogue is now enabled.'
        : 'Key saved but failed to initialize client.'
    );
  };

  const handleClearApiKey = () => {
    clearStoredApiKey();
    reinitializeClient();
    setHasStoredKey(false);
    setAiEnabled(false);
    setSaveMessage('API key removed.');
  };

  // Cottagecore colour palette
  const colours = {
    parchment: '#f5f0e1',
    parchmentDark: '#e8dcc8',
    parchmentDarker: '#d4c4a8',
    wood: '#8b7355',
    woodDark: '#6b5344',
    woodDarker: '#5a4636',
    brass: '#d4a84b',
    brassDark: '#c99a3e',
    text: '#3d2e1f',
    textLight: '#5a4636',
  };

  return (
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center ${zClass(Z_HELP_BROWSER)} p-4`}
    >
      <div
        className="w-full max-w-6xl h-[90vh] flex flex-col rounded-lg overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colours.parchment}, ${colours.parchmentDark})`,
          border: `4px solid ${colours.wood}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{
            background: `linear-gradient(to bottom, ${colours.woodDark}, ${colours.woodDarker})`,
            borderBottom: `3px solid ${colours.woodDarker}`,
          }}
        >
          <h1 className="text-2xl font-serif font-bold" style={{ color: colours.brass }}>
            📖 Game Help
          </h1>
          <button
            onClick={onClose}
            className="px-4 py-2 font-serif font-bold rounded transition-all hover:brightness-110"
            style={{
              background: `linear-gradient(to bottom, #a85454, #8b4444)`,
              color: '#ffeedd',
              border: '2px solid #6b3434',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            Close [ESC]
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div
            className="w-64 overflow-y-auto"
            style={{
              background: `linear-gradient(to right, ${colours.parchmentDarker}, ${colours.parchmentDark})`,
              borderRight: `3px solid ${colours.wood}`,
            }}
          >
            <div className="p-4">
              <h2
                className="text-lg font-serif font-bold mb-3"
                style={{ color: colours.woodDarker }}
              >
                Topics
              </h2>
              {DOC_FILES.map((doc) => (
                <button
                  key={doc.name}
                  onClick={() => setSelectedTab(doc.name)}
                  className="w-full text-left px-4 py-3 mb-2 rounded font-serif font-semibold transition-all"
                  style={{
                    background:
                      selectedTab === doc.name
                        ? `linear-gradient(to bottom, ${colours.brass}, ${colours.brassDark})`
                        : `linear-gradient(to bottom, ${colours.parchment}, ${colours.parchmentDark})`,
                    color: selectedTab === doc.name ? '#fff' : colours.woodDarker,
                    border: `2px solid ${selectedTab === doc.name ? colours.brassDark : colours.wood}`,
                    boxShadow:
                      selectedTab === doc.name
                        ? 'inset 0 1px 0 rgba(255,255,255,0.3)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  {doc.title}
                </button>
              ))}

              {/* Divider */}
              <div
                className="my-4"
                style={{ borderTop: `2px solid ${colours.wood}`, opacity: 0.5 }}
              ></div>

              {/* Settings Tab */}
              <button
                onClick={() => setSelectedTab(SETTINGS_TAB)}
                className="w-full text-left px-4 py-3 mb-2 rounded font-serif font-semibold transition-all"
                style={{
                  background:
                    selectedTab === SETTINGS_TAB
                      ? `linear-gradient(to bottom, #8b6f8b, #6b546b)`
                      : `linear-gradient(to bottom, ${colours.parchment}, ${colours.parchmentDark})`,
                  color: selectedTab === SETTINGS_TAB ? '#fff' : colours.woodDarker,
                  border: `2px solid ${selectedTab === SETTINGS_TAB ? '#5a445a' : colours.wood}`,
                  boxShadow:
                    selectedTab === SETTINGS_TAB
                      ? 'inset 0 1px 0 rgba(255,255,255,0.3)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.5)',
                }}
              >
                ⚙️ Settings
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8" style={{ background: colours.parchment }}>
            {selectedTab === SETTINGS_TAB ? (
              /* Settings Panel */
              <div className="max-w-2xl">
                <h1 className="text-3xl font-serif font-bold mb-6" style={{ color: '#6b546b' }}>
                  Settings
                </h1>

                {/* Music Section */}
                <div
                  className="rounded-lg p-6 mb-6"
                  style={{
                    background: `linear-gradient(135deg, ${colours.parchmentDark}, ${colours.parchmentDarker})`,
                    border: `2px solid ${colours.wood}`,
                  }}
                >
                  <h2
                    className="text-xl font-serif font-bold mb-4"
                    style={{ color: colours.brass }}
                  >
                    Music & Sound
                  </h2>
                  <p className="mb-4" style={{ color: colours.textLight }}>
                    Toggle music and sound effects on or off. This setting is saved automatically.
                  </p>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleMusicToggle}
                      className="px-6 py-3 font-serif font-semibold rounded transition-all hover:brightness-110 flex items-center gap-2"
                      style={{
                        background: musicEnabled
                          ? 'linear-gradient(to bottom, #4a7c4a, #3d663d)'
                          : 'linear-gradient(to bottom, #a85454, #8b4444)',
                        color: '#ffeedd',
                        border: `2px solid ${musicEnabled ? '#2d4d2d' : '#6b3434'}`,
                      }}
                    >
                      <span className="text-xl">{musicEnabled ? '🔊' : '🔇'}</span>
                      {musicEnabled ? 'Music On' : 'Music Off'}
                    </button>
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-serif font-semibold"
                      style={{
                        background: musicEnabled
                          ? 'rgba(76, 130, 76, 0.2)'
                          : 'rgba(168, 84, 84, 0.2)',
                        color: musicEnabled ? '#4a7c4a' : '#8b4444',
                        border: `1px solid ${musicEnabled ? '#4a7c4a' : '#8b4444'}`,
                      }}
                    >
                      {musicEnabled ? '● Sound Enabled' : '○ Sound Muted'}
                    </span>
                  </div>
                </div>

                {/* AI Dialogue Section */}
                <div
                  className="rounded-lg p-6"
                  style={{
                    background: `linear-gradient(135deg, ${colours.parchmentDark}, ${colours.parchmentDarker})`,
                    border: `2px solid ${colours.wood}`,
                  }}
                >
                  <h2
                    className="text-xl font-serif font-bold mb-4"
                    style={{ color: colours.brass }}
                  >
                    AI Dialogue
                  </h2>
                  <p className="mb-4" style={{ color: colours.textLight }}>
                    Enable dynamic AI-powered conversations with NPCs by providing your own
                    Anthropic API key. Your key is stored locally in your browser and never sent to
                    our servers.
                  </p>

                  {/* Status indicator */}
                  <div
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-serif font-semibold mb-4"
                    style={{
                      background: aiEnabled ? 'rgba(76, 130, 76, 0.2)' : colours.parchmentDarker,
                      color: aiEnabled ? '#4a7c4a' : colours.textLight,
                      border: `1px solid ${aiEnabled ? '#4a7c4a' : colours.wood}`,
                    }}
                  >
                    {aiEnabled ? '● AI Enabled' : '○ AI Disabled'}
                  </div>

                  {hasStoredKey ? (
                    /* Key already stored */
                    <div className="space-y-4">
                      <p style={{ color: '#4a7c4a' }}>
                        API key is configured and stored in your browser.
                      </p>
                      <button
                        onClick={handleClearApiKey}
                        className="px-4 py-2 font-serif font-semibold rounded transition-all hover:brightness-110"
                        style={{
                          background: 'linear-gradient(to bottom, #a85454, #8b4444)',
                          color: '#ffeedd',
                          border: '2px solid #6b3434',
                        }}
                      >
                        Remove API Key
                      </button>
                    </div>
                  ) : (
                    /* No key stored - show input */
                    <div className="space-y-4">
                      <div>
                        <label
                          className="block mb-2 text-sm font-serif"
                          style={{ color: colours.textLight }}
                        >
                          Anthropic API Key
                        </label>
                        <input
                          type="password"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="sk-ant-..."
                          className="w-full px-4 py-2 rounded focus:outline-none"
                          style={{
                            background: colours.parchment,
                            border: `2px solid ${colours.wood}`,
                            color: colours.text,
                          }}
                        />
                      </div>
                      <button
                        onClick={handleSaveApiKey}
                        className="px-4 py-2 font-serif font-semibold rounded transition-all hover:brightness-110"
                        style={{
                          background: 'linear-gradient(to bottom, #8b6f8b, #6b546b)',
                          color: '#ffeedd',
                          border: '2px solid #5a445a',
                        }}
                      >
                        Save API Key
                      </button>
                      <p className="text-sm" style={{ color: colours.textLight }}>
                        Get your key at{' '}
                        <a
                          href="https://console.anthropic.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:brightness-125"
                          style={{ color: '#6b546b' }}
                        >
                          console.anthropic.com
                        </a>
                      </p>
                    </div>
                  )}

                  {/* Save message */}
                  {saveMessage && (
                    <p
                      className="mt-4 text-sm font-serif"
                      style={{
                        color:
                          saveMessage.includes('saved') || saveMessage.includes('enabled')
                            ? '#4a7c4a'
                            : saveMessage.includes('removed')
                              ? colours.brass
                              : '#8b4444',
                      }}
                    >
                      {saveMessage}
                    </p>
                  )}
                </div>

                {/* Info box */}
                <div
                  className="mt-6 rounded-lg p-4"
                  style={{
                    background: colours.parchmentDark,
                    border: `1px solid ${colours.wood}`,
                  }}
                >
                  <h3 className="font-serif font-semibold mb-2" style={{ color: colours.brass }}>
                    How it works
                  </h3>
                  <ul className="text-sm space-y-1" style={{ color: colours.textLight }}>
                    <li>• Your API key is stored only in your browser's localStorage</li>
                    <li>• API calls go directly from your browser to Anthropic</li>
                    <li>• Uses Claude Haiku for fast, cost-effective responses</li>
                    <li>• Typical cost: less than $0.01 per conversation</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Documentation Content */
              <div className="prose max-w-none">
                <ReactMarkdown
                  components={{
                    // Custom cottagecore styling for markdown elements
                    h1: ({ node, ...props }) => (
                      <h1
                        className="text-4xl font-serif font-bold mb-4 pb-2"
                        style={{ color: colours.brass, borderBottom: `2px solid ${colours.wood}` }}
                        {...props}
                      />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2
                        className="text-3xl font-serif font-bold mt-8 mb-3"
                        style={{ color: colours.brassDark }}
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="text-2xl font-serif font-bold mt-6 mb-2"
                        style={{ color: colours.wood }}
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p
                        className="mb-4 leading-relaxed"
                        style={{ color: colours.text }}
                        {...props}
                      />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul
                        className="list-disc list-inside mb-4 space-y-1"
                        style={{ color: colours.text }}
                        {...props}
                      />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol
                        className="list-decimal list-inside mb-4 space-y-1"
                        style={{ color: colours.text }}
                        {...props}
                      />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="ml-4" style={{ color: colours.text }} {...props} />
                    ),
                    code: ({ node, inline, ...props }: any) =>
                      inline ? (
                        <code
                          className="px-2 py-1 rounded font-mono text-sm"
                          style={{ background: colours.parchmentDarker, color: colours.woodDarker }}
                          {...props}
                        />
                      ) : (
                        <code
                          className="block p-4 rounded font-mono text-sm overflow-x-auto mb-4"
                          style={{ background: colours.parchmentDark, color: colours.woodDarker }}
                          {...props}
                        />
                      ),
                    pre: ({ node, ...props }) => (
                      <pre
                        className="p-4 rounded overflow-x-auto mb-4"
                        style={{ background: colours.parchmentDark }}
                        {...props}
                      />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong
                        className="font-bold"
                        style={{ color: colours.woodDarker }}
                        {...props}
                      />
                    ),
                    em: ({ node, ...props }) => (
                      <em className="italic" style={{ color: colours.wood }} {...props} />
                    ),
                    a: ({ node, ...props }) => (
                      <a
                        className="underline hover:brightness-125"
                        style={{ color: colours.brass }}
                        {...props}
                      />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="pl-4 italic mb-4"
                        style={{
                          borderLeft: `4px solid ${colours.brass}`,
                          color: colours.textLight,
                        }}
                        {...props}
                      />
                    ),
                    table: ({ node, ...props }) => (
                      <table className="w-full border-collapse mb-4" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="px-4 py-2 text-left font-serif font-bold"
                        style={{
                          background: colours.parchmentDark,
                          border: `1px solid ${colours.wood}`,
                          color: colours.brass,
                        }}
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className="px-4 py-2"
                        style={{ border: `1px solid ${colours.wood}`, color: colours.text }}
                        {...props}
                      />
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-3 text-center text-sm font-serif"
          style={{
            background: `linear-gradient(to bottom, ${colours.woodDark}, ${colours.woodDarker})`,
            borderTop: `3px solid ${colours.woodDarker}`,
            color: colours.parchmentDark,
          }}
        >
          Press{' '}
          <kbd
            className="px-2 py-1 rounded font-mono"
            style={{
              background: colours.parchmentDarker,
              color: colours.woodDarker,
              border: `1px solid ${colours.wood}`,
            }}
          >
            F1
          </kbd>{' '}
          anytime to open help
        </div>
      </div>
    </div>
  );
};

export default HelpBrowser;
