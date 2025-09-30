import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import DocumentSources from '@/components/DocumentSources';

export default function AddDocuments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleDocumentsAdded = async (documents: any[]) => {
    if (documents.length > 0) {
      toast.success(`${documents.length} document(s) added successfully`);
      await queryClient.invalidateQueries({ queryKey: ['knowledge-documents'] });
      
      // Navigate to the Find Documents page after successful upload
      setTimeout(() => {
        navigate('/documents');
      }, 1500);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Add Documents</h1>
        <p className="text-muted-foreground">
          Upload documents from various sources to your knowledge base
        </p>
      </div>

      <DocumentSources onDocumentsAdded={handleDocumentsAdded} />
    </div>
  );
}
