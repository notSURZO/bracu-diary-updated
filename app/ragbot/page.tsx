'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export default function RAGPage() {
  const { isSignedIn } = useUser();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm here to help you with information about your courses. What would you like to know?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    if (!isSignedIn) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: 'Please sign in to use the Brac University chatbot.',
        sender: 'bot',
        timestamp: new Date(),
      }]);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, top_k: 2 }),
      });
      
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      // Add bot response
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: data.answer,
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error while processing your request.',
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 font-sans">
      {/* Header - Matches your layout styling but not fixed */}
      <div className="bg-blue-900 text-white p-4 flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-blue-900 font-bold text-lg">
          <Image
            src="/bot-icon.svg"
            alt="BRACU Diary Logo"
            width={200}
            height={60}
            className="object-contain h-8 w-auto"
            priority
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Diary Assistant</h2>
          <p className="text-sm text-blue-200">Ask me anything about BRAC University courses</p>
        </div>
      </div>

      {/* Chat Container - Adjusted for header height and bottom padding for input */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 mb-20">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg ${
                message.sender === 'user'
                  ? 'p-4 bg-blue-600 text-white rounded-br-none'
                  : 'pl-1 pr-4 pt-4 pb-4 bg-white text-gray-800 rounded-bl-none shadow'
              }`}
            >
              {message.sender === 'bot' ? (
                <div className="flex items-start space-x-2 ">
                  <Image
                    src="/bot-icon.svg"
                    alt="Bot"
                    width={20}
                    height={20}
                  />
                  <div>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <span className="text-xs block mt-1 text-gray-500">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  <span className="text-xs block mt-1 text-blue-200">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 rounded-lg rounded-bl-none pl-1 pr-4 pt-4 pb-4 shadow flex items-center space-x-2">
              <Image
                src="/bot-icon.svg"
                alt="Bot"
                width={20}
                height={20}
              />
              <div className="flex space-x-1">
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2 max-w-7xl mx-auto px-5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about a course..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || !isSignedIn}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || !isSignedIn}
            className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
