import React, { createContext, useState, useContext } from 'react';

interface SelectionContextType {
  selectedExport: string | null;
  setSelectedExport: (filename: string | null) => void;
  selectedThreads: string[];
  setSelectedThreads: (threads: string[]) => void;
  toggleThread: (threadId: string) => void;
  toggleThreadSelection: (threadId: string) => void;
  isThreadSelected: (threadId: string) => boolean;
  selectAllThreads: (threadIds: string[]) => void;
  clearAllThreads: (threadIds: string[]) => void;
  documentFormat: 'md' | 'pdf';
  setDocumentFormat: (format: 'md' | 'pdf') => void;
  generatedDocumentPath: string | null;
  setGeneratedDocumentPath: (path: string | null) => void;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedExport, setSelectedExport] = useState<string | null>(null);
  const [selectedThreads, setSelectedThreads] = useState<string[]>([]);
  const [documentFormat, setDocumentFormat] = useState<'md' | 'pdf'>('pdf');
  const [generatedDocumentPath, setGeneratedDocumentPath] = useState<string | null>(null);

  const toggleThread = (threadId: string) => {
    setSelectedThreads(prev => 
      prev.includes(threadId)
        ? prev.filter(id => id !== threadId)
        : [...prev, threadId]
    );
  };

  // Keep the old name for backward compatibility
  const toggleThreadSelection = toggleThread;

  const isThreadSelected = (threadId: string) => {
    return selectedThreads.includes(threadId);
  };

  const selectAllThreads = (threadIds: string[]) => {
    setSelectedThreads(prev => {
      // Create a set of existing threads to avoid duplicates
      const uniqueThreads = new Set([...prev]);
      
      // Add all new threadIds
      threadIds.forEach(id => uniqueThreads.add(id));
      
      return Array.from(uniqueThreads);
    });
  };

  const clearAllThreads = (threadIds: string[]) => {
    setSelectedThreads(prev => 
      prev.filter(id => !threadIds.includes(id))
    );
  };

  const value = {
    selectedExport,
    setSelectedExport,
    selectedThreads,
    setSelectedThreads,
    toggleThread,
    toggleThreadSelection,
    isThreadSelected,
    selectAllThreads,
    clearAllThreads,
    documentFormat,
    setDocumentFormat,
    generatedDocumentPath,
    setGeneratedDocumentPath
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = (): SelectionContextType => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};
