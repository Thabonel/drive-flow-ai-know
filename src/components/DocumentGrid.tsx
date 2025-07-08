import { DocumentCard } from '@/components/DocumentCard';
import { EmptyDocumentsState } from '@/components/EmptyDocumentsState';

interface DocumentGridProps {
  documents: any[];
  isLoading: boolean;
  searchTerm: string;
  selectedCategory: string | null;
  onViewDocument: (doc: any) => void;
  onGenerateInsights: (docId: string) => void;
  isGeneratingInsights: boolean;
  getCategoryColor: (category: string) => string;
}

export const DocumentGrid = ({
  documents,
  isLoading,
  searchTerm,
  selectedCategory,
  onViewDocument,
  onGenerateInsights,
  isGeneratingInsights,
  getCategoryColor,
}: DocumentGridProps) => {
  if (isLoading) {
    return (
      <div className="col-span-full text-center py-8">Loading...</div>
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
          onGenerateInsights={onGenerateInsights}
          isGeneratingInsights={isGeneratingInsights}
          getCategoryColor={getCategoryColor}
        />
      ))}
    </>
  );
};