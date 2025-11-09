import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentCard } from '@/components/DocumentCard';
import { DocumentViewerModal } from '@/components/DocumentViewerModal';

function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

const DOCS_PER_PAGE = 25;

export const DocumentList = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewerDocument, setViewerDocument] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['all-documents', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }
  });

  const fuse = useMemo(() => new Fuse(documents || [], { keys: ['title'], threshold: 0.3 }), [documents]);

  const filtered = useMemo(() => {
    const base = documents || [];
    if (!debouncedSearch) return base;
    return fuse.search(debouncedSearch).map(r => r.item);
  }, [documents, fuse, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const pageCount = Math.ceil(filtered.length / DOCS_PER_PAGE);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * DOCS_PER_PAGE, page * DOCS_PER_PAGE),
    [filtered, page]
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      prompts: 'bg-primary',
      marketing: 'bg-accent',
      specs: 'bg-secondary',
      general: 'bg-muted',
    };
    return colors[category] || 'bg-muted';
  };

  const isManualDocument = (doc: any) => {
    // Check if document is manually created, uploaded, or AI-generated (not from Google Drive)
    return doc.file_type === 'manual' ||
           doc.google_file_id?.startsWith('manual-') ||
           doc.google_file_id?.startsWith('upload_') ||
           doc.google_file_id?.startsWith('ai_generated_');
  };

  const handleViewDocument = (doc: any) => {
    if (isManualDocument(doc)) {
      // Open in modal viewer for manual/local documents
      setViewerDocument(doc);
      setIsViewerOpen(true);
    } else {
      // Open Google Drive for actual Drive documents
      window.open(`https://drive.google.com/file/d/${doc.google_file_id}/view`, '_blank');
    }
  };

  const handleEditDocument = (doc: any) => {
    if (isManualDocument(doc)) {
      // Open in modal viewer for manual/local documents
      setViewerDocument(doc);
      setIsViewerOpen(true);
    } else {
      // Open Google Drive for actual Drive documents
      window.open(`https://docs.google.com/document/d/${doc.google_file_id}/edit`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search documents..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-12 text-base"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginated.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onView={handleViewDocument}
            onEdit={handleEditDocument}
            onGenerateInsights={() => {}}
            isGeneratingInsights={false}
            getCategoryColor={getCategoryColor}
          />
        ))}
      </div>
      {pageCount > 1 && (
        <div className="flex justify-center items-center gap-4 pt-4">
          <Button variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm font-medium">Page {page} of {pageCount}</span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page === pageCount}
          >
            Next
          </Button>
        </div>
      )}

      <DocumentViewerModal
        document={viewerDocument}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setViewerDocument(null);
        }}
      />
    </div>
  );
};

export default DocumentList;
