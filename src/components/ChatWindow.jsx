import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, CheckCircle2, Circle, Send, Mic, Image, X, Check, XCircle } from 'lucide-react';

function relativeTime(ts) {
  if (!ts) return '';
  const now = Date.now() / 1000;
  const diff = Math.max(0, now - ts);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

/**
 * ChatWindow - Conversational UI with the AI race engineer.
 * Shows conversation history, pending setup change checkboxes,
 * and a pulsing mic indicator when the user is speaking.
 */

function ChatWindow({ messages, pendingChanges, onConfirmChanges, onDismissChanges, onSendMessage, isListening, isThinking, quickActions, onQuickAction }) {
  const [inputText, setInputText] = useState('');
  const [pastedImages, setPastedImages] = useState([]); // [{data: base64, mimeType, preview: dataUrl}]
  const [appliedChanges, setAppliedChanges] = useState(new Set());
  const [skippedChanges, setSkippedChanges] = useState(new Set());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get the PTT key label for display
  const pttKeyId = localStorage.getItem('pitwall_ptt_key') || 'caps_lock';
  const pttLabel = pttKeyId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const newImages = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          // Extract base64 and mimeType
          const [header, base64] = dataUrl.split(',');
          const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/png';
          setPastedImages((prev) => [...prev, { data: base64, mimeType, preview: dataUrl }]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeImage = (index) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() && pastedImages.length === 0) return;
    const images = pastedImages.map(({ data, mimeType }) => ({ data, mimeType }));
    onSendMessage(inputText.trim(), images.length > 0 ? images : undefined);
    setInputText('');
    setPastedImages([]);
    // Dismiss pending changes when user sends a custom message
    if (pendingChanges.length > 0) {
      onDismissChanges();
    }
  };

  const handleApply = (id) => {
    setAppliedChanges((prev) => new Set(prev).add(id));
    onConfirmChanges([id]);
  };

  const handleSkip = (id) => {
    setSkippedChanges((prev) => new Set(prev).add(id));
  };

  const handleApplyAll = () => {
    const remaining = pendingChanges.filter(c => !appliedChanges.has(c.id) && !skippedChanges.has(c.id)).map(c => c.id);
    if (remaining.length > 0) {
      setAppliedChanges((prev) => {
        const next = new Set(prev);
        remaining.forEach(id => next.add(id));
        return next;
      });
      onConfirmChanges(remaining);
    }
  };

  // Reset applied/skipped state when new pending changes arrive
  useEffect(() => {
    setAppliedChanges(new Set());
    setSkippedChanges(new Set());
  }, [pendingChanges.length]);

  return (
    <div className="glass-panel h-full flex flex-col rounded-none border-x-0">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800/50 flex items-center gap-2">
        <MessageCircle size={16} className="text-pit-accent" />
        <span className="text-sm font-medium text-gray-200">AI Engineer</span>
        {/* Voice status indicator */}
        {isListening && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <div className="w-1 h-3 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}} />
              <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '150ms'}} />
              <div className="w-1 h-2 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '300ms'}} />
              <div className="w-1 h-5 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '100ms'}} />
              <div className="w-1 h-3 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '250ms'}} />
            </div>
            <Mic size={14} className="text-red-400" />
            <span className="text-[10px] text-red-400 font-medium">Listening...</span>
          </div>
        )}
        {!isListening && isThinking && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 bg-pit-info rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
              <div className="w-1.5 h-1.5 bg-pit-info rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
              <div className="w-1.5 h-1.5 bg-pit-info rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
            </div>
            <span className="text-[10px] text-pit-info font-medium">Thinking...</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-xs mt-8">
            <p>Hold <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-400 text-[10px] font-mono">{pttLabel}</kbd> to talk to your engineer.</p>
            <p className="mt-1">Or type a message below.</p>
            <p className="mt-2 text-gray-700">💡 Paste tuning menu screenshots with <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-500 text-[10px] font-mono">Ctrl+V</kbd></p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`animate-fade-in ${
              msg.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            <div
              className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-pit-accent/10 text-pit-accent border border-pit-accent/20'
                  : msg.role === 'system'
                  ? 'bg-yellow-900/20 text-yellow-300/90 border border-yellow-700/30 italic'
                  : 'bg-gray-800/60 text-gray-200 border border-gray-700/30'
              }`}
            >
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {msg.images.map((img, j) => (
                    <img key={j} src={img.preview || `data:${img.mimeType};base64,${img.data}`} alt="attached"
                      className="w-16 h-16 object-cover rounded border border-gray-600/50" />
                  ))}
                </div>
              )}
              {msg.text}
            </div>
            {msg.timestamp && (
              <div className={`text-[8px] text-gray-600 mt-0.5 ${msg.role === 'user' ? 'text-right' : 'text-left'} px-1`}>
                {relativeTime(msg.timestamp)}
              </div>
            )}
          </div>
        ))}

        {/* Inline Quick Actions */}
        {quickActions && quickActions.length > 0 && !isThinking && (
          <div className="text-left animate-fade-in">
            <div className="flex flex-wrap gap-1.5 max-w-[90%]">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onQuickAction(action.value)}
                  className="px-2.5 py-1 rounded-full text-[10px] bg-pit-accent/10 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/20 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thinking indicator in chat */}
        {isThinking && (
          <div className="text-left animate-fade-in">
            <div className="inline-block px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/30">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Pending Changes Checklist */}
      {pendingChanges.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800/50 bg-gray-900/30">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-500 uppercase">Setup Changes</span>
            {pendingChanges.some(c => !appliedChanges.has(c.id) && !skippedChanges.has(c.id)) && (
              <button
                onClick={handleApplyAll}
                className="text-[9px] px-1.5 py-0.5 rounded bg-pit-accent/15 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/25 transition-colors"
              >
                Apply All
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {pendingChanges.map((change) => {
              const isApplied = appliedChanges.has(change.id);
              const isSkipped = skippedChanges.has(change.id);
              return (
                <div key={change.id} className="flex items-center gap-2">
                  <span className={`flex-1 text-xs leading-tight ${
                    isApplied ? 'text-pit-accent line-through opacity-60' :
                    isSkipped ? 'text-gray-600 line-through opacity-40' :
                    'text-gray-300'
                  }`}>
                    {change.action}
                  </span>
                  {!isApplied && !isSkipped && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleApply(change.id)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-pit-accent/15 text-pit-accent hover:bg-pit-accent/25 transition-colors flex items-center gap-0.5"
                        title="Mark as applied"
                      >
                        <Check size={9} /> Done
                      </button>
                      <button
                        onClick={() => handleSkip(change.id)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700/40 text-gray-500 hover:text-gray-300 hover:bg-gray-700/60 transition-colors"
                        title="Skip this change"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                  {isApplied && (
                    <span className="text-[9px] text-pit-accent/60 flex items-center gap-0.5"><Check size={9} /> Applied</span>
                  )}
                  {isSkipped && (
                    <span className="text-[9px] text-gray-600">Skipped</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800/50">
        {/* Pasted image previews */}
        {pastedImages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {pastedImages.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img.preview} alt="pasted"
                  className="w-14 h-14 object-cover rounded border border-gray-600/50" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 border border-gray-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={8} className="text-gray-300" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onPaste={handlePaste}
            placeholder={pastedImages.length > 0 ? "Add a message about these images..." : "Type a message or paste a screenshot..."}
            className="flex-1 bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pit-accent/50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() && pastedImages.length === 0}
            className="p-1.5 rounded-md bg-pit-accent/20 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/30 disabled:opacity-30 transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-gray-600">
          <Mic size={9} />
          <span>Hold <kbd className="px-1 py-0.5 bg-gray-800/80 border border-gray-700/50 rounded text-gray-500 font-mono">{pttLabel}</kbd> to speak</span>
          <span className="mx-1">·</span>
          <Image size={9} />
          <span><kbd className="px-1 py-0.5 bg-gray-800/80 border border-gray-700/50 rounded text-gray-500 font-mono">Ctrl+V</kbd> paste screenshots</span>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
