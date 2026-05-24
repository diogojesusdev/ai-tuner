import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, CheckCircle2, Circle, Send, Mic } from 'lucide-react';

/**
 * ChatWindow - Conversational UI with the AI race engineer.
 * Shows conversation history, pending setup change checkboxes,
 * and a pulsing mic indicator when the user is speaking.
 */

function ChatWindow({ messages, pendingChanges, onConfirmChanges, onSendMessage, isListening, isThinking, quickActions, onQuickAction }) {
  const [inputText, setInputText] = useState('');
  const [checkedChanges, setCheckedChanges] = useState(new Set());
  const messagesEndRef = useRef(null);

  // Get the PTT key label for display
  const pttKeyId = localStorage.getItem('pitwall_ptt_key') || 'caps_lock';
  const pttLabel = pttKeyId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const toggleChange = (id) => {
    setCheckedChanges((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (checkedChanges.size === 0) return;
    onConfirmChanges(Array.from(checkedChanges));
    setCheckedChanges(new Set());
  };

  const handleConfirmAll = () => {
    const allIds = pendingChanges.map((c) => c.id);
    onConfirmChanges(allIds);
    setCheckedChanges(new Set());
  };

  return (
    <div className="glass-panel h-full flex flex-col rounded-none border-x-0">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-800/50 flex items-center gap-2">
        <MessageCircle size={16} className="text-pit-accent" />
        <span className="text-sm font-medium text-gray-200">Race Engineer</span>
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
              {msg.text}
            </div>
          </div>
        ))}

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
          <div className="text-[10px] text-gray-500 uppercase mb-1.5">
            Pending Setup Changes
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {pendingChanges.map((change) => (
              <label
                key={change.id}
                className="flex items-start gap-2 cursor-pointer group"
              >
                <button
                  onClick={() => toggleChange(change.id)}
                  className="mt-0.5 flex-shrink-0"
                >
                  {checkedChanges.has(change.id) ? (
                    <CheckCircle2 size={14} className="text-pit-accent" />
                  ) : (
                    <Circle size={14} className="text-gray-600 group-hover:text-gray-400" />
                  )}
                </button>
                <span className="text-xs text-gray-300 leading-tight">
                  {change.action}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleConfirm}
              disabled={checkedChanges.size === 0}
              className="text-[10px] px-2 py-1 rounded bg-pit-accent/20 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Confirm Selected
            </button>
            <button
              onClick={handleConfirmAll}
              className="text-[10px] px-2 py-1 rounded bg-gray-700/50 text-gray-300 border border-gray-600/30 hover:bg-gray-700 transition-colors"
            >
              Confirm All
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Buttons */}
      {quickActions && quickActions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800/50 bg-gray-900/30">
          <div className="text-[10px] text-gray-500 mb-1.5">Quick select:</div>
          <div className="flex flex-wrap gap-1.5">
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

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800/50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800/50 border border-gray-700/30 rounded-md px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-pit-accent/50"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 rounded-md bg-pit-accent/20 text-pit-accent border border-pit-accent/30 hover:bg-pit-accent/30 disabled:opacity-30 transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-gray-600">
          <Mic size={9} />
          <span>Hold <kbd className="px-1 py-0.5 bg-gray-800/80 border border-gray-700/50 rounded text-gray-500 font-mono">{pttLabel}</kbd> to speak</span>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
