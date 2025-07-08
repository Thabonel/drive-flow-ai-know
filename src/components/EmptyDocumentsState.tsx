import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface EmptyDocumentsStateProps {
  searchTerm: string;
  selectedCategory: string | null;
}

export const EmptyDocumentsState = ({ searchTerm, selectedCategory }: EmptyDocumentsStateProps) => {
  return (
    <div className="col-span-full">
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No documents found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory 
              ? 'Try adjusting your search or filter criteria'
              : 'Connect your Google Drive folders to start seeing documents here'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
};