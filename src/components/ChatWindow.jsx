import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, CheckCircle2, Circle, Send, Mic } from 'lucide-react';

/**
 * ChatWindow - Conversational UI with the AI race engineer.
 * Shows conversation history and pending setup change checkboxes.
 */

function ChatWindow({ messages, pendingChanges, onConfirmChanges, onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const [checkedChanges, setCheckedChanges] = useState(new Set());
  const messagesEndRef = useRef(null);

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
        <div className="ml-auto flex items-center gap-1">
          <Mic size={12} className="text-gray-500" />
          <span className="text-[10px] text-gray-500">PTT: CapsLock</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-xs mt-8">
            <p>Hold CapsLock to talk to your engineer.</p>
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
                  : 'bg-gray-800/60 text-gray-200 border border-gray-700/30'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
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

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-3 border-t border-gray-800/50 flex gap-2"
      >
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
    </div>
  );
}

export default ChatWindow;
