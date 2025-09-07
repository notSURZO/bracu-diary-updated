'use client';

import { useEffect, useRef } from 'react';

interface AddDeadlineModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    type: 'theory' | 'lab';
    title: string;
    details: string;
    submissionLink: string;
    lastDate: string;
    time: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    type: 'theory' | 'lab';
    title: string;
    details: string;
    submissionLink: string;
    lastDate: string;
    time: string;
  }>>;
  hasLab: boolean;
}

export default function AddDeadlineModal({ 
  onClose, 
  onSubmit, 
  formData, 
  setFormData, 
  hasLab 
}: AddDeadlineModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div ref={modalRef} className="relative p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add New Deadline</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select 
                value={formData.type} 
                onChange={(e) => setFormData({...formData, type: e.target.value as 'theory' | 'lab'})} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="theory">Theory</option>
                {hasLab && <option value="lab">Lab</option>}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input 
                type="text" 
                required 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Details</label>
              <textarea 
                required 
                value={formData.details} 
                onChange={(e) => setFormData({...formData, details: e.target.value})} 
                rows={3} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Submission Link (Optional)</label>
              <input 
                type="url" 
                value={formData.submissionLink} 
                onChange={(e) => setFormData({...formData, submissionLink: e.target.value})} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Date</label>
                <input 
                  type="date" 
                  required 
                  value={formData.lastDate} 
                  onChange={(e) => setFormData({...formData, lastDate: e.target.value})} 
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <input 
                  type="time" 
                  required 
                  value={formData.time} 
                  onChange={(e) => setFormData({...formData, time: e.target.value})} 
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Deadline</button>
            </div>
        </form>
      </div>
    </div>
  );
}
