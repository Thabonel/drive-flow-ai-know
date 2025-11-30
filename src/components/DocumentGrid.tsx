import { DocumentCard } from '@/components/DocumentCard';
import { DocumentCardSkeleton } from '@/components/DocumentCardSkeleton';
import { EmptyDocumentsState } from '@/components/EmptyDocumentsState';

interface DocumentGridProps {
  documents: any[];
  isLoading: boolean;
  searchTerm: string;
  selectedCategory: string | null;
  onViewDocument: (doc: any) => void;
  onEditDocument: (doc: any) => void;
  onDeleteDocument?: (doc: any) => void;
  onGenerateInsights: (docId: string) => void;
  generatingDocId: string | null;
  getCategoryColor: (category: string) => string;
}

export const DocumentGrid = ({
  documents,
  isLoading,
  searchTerm,
  selectedCategory,
  onViewDocument,
  onEditDocument,
  onDeleteDocument,
  onGenerateInsights,
  generatingDocId,
  getCategoryColor,
}: DocumentGridProps) => {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 6 }).map((_, index) => (
          <DocumentCardSkeleton key={index} />
        ))}
      </>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyDocumentsState 
        searchTerm={searchTerm} 
        selectedCategory={selectedCategory} 
      />
    );
  }

  return (
    <>
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onView={onViewDocument}
          onEdit={onEditDocument}
          onDelete={onDeleteDocument}
          onGenerateInsights={onGenerateInsights}
          isGeneratingInsights={generatingDocId === doc.id}
          getCategoryColor={getCategoryColor}
        />
      ))}
    </>
  );
};