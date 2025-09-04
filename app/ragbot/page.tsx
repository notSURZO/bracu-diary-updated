'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function RAGPage() {
  const { isSignedIn } = useUser();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!isSignedIn) {
      setAnswer('Please sign in to use RAG search.');
      return;
    }
    setLoading(true);
    setAnswer('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, top_k: 2 }),
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAnswer(data.answer);
    } catch (error) {
      console.error(error);
      setAnswer('Error occurred');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>RAG Search</h1>
      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question"
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />
      <button
        onClick={handleAsk}
        disabled={loading || !isSignedIn}
        style={{ padding: '10px 20px', cursor: (loading || !isSignedIn) ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Loading...' : 'Ask'}
      </button>
      {answer && (
        <div style={{ marginTop: '20px' }}>
          <h3>Answer:</h3>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}