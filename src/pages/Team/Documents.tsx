import React, { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, Upload, Search, Calendar, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TeamDocument {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  team_id: string;
  visibility: string;
  uploaded_by_user_id: string;
}

/**
 * Team Documents Page
 *
 * Shows team-shared documents that all team members can access.
 * These documents are included in AI context for all team members,
 * enabling "context fluency" across the organization.
 *
 * Features:
 * - View team documents
 * - Upload new team documents
 * - Search team documents
 * - Document metadata (who uploaded, when)
 */
export default function TeamDocuments() {
  const { team, membership, isLoading: teamLoading } = useTeam();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['team-documents', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];

      const { data, error } = await supabase
        .from('knowledge_documents')
        .select('*')
        .eq('team_id', team.id)
        .eq('visibility', 'team')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team documents:', error);
        throw error;
      }

      return data as TeamDocument[];
    },
    enabled: !!team?.id,
  });

  const filteredDocuments = documents?.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const canUpload = membership?.role !== 'viewer';

  if (teamLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>
            You don't have a team yet. Create one to access team features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Team Documents
          </h1>
          <p className="text-muted-foreground mt-2">
            Shared documents accessible by all team members
          </p>
        </div>
        {canUpload && (
          <Button onClick={() => navigate('/documents/add?team=true')}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Context Fluency Info */}
      <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <strong>Context Fluency:</strong> These documents are available to all team members
          when using AI queries, ensuring everyone "sings from the same song list."
        </AlertDescription>
      </Alert>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments && filteredDocuments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card
              key={doc.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/documents/${doc.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    Team
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2">{doc.title}</CardTitle>
                {doc.summary && (
                  <CardDescription className="line-clamp-2">
                    {doc.summary}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{doc.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'No documents found' : 'No team documents yet'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? 'Try adjusting your search query'
                : canUpload
                  ? 'Upload documents to share with your team and enable context fluency.'
                  : 'Team documents will appear here once uploaded by team members.'}
            </p>
            {canUpload && !searchQuery && (
              <Button onClick={() => navigate('/documents/add?team=true')}>
                <Upload className="mr-2 h-4 w-4" />
                Upload First Document
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Count */}
      <div className="text-sm text-muted-foreground text-center">
        {filteredDocuments?.length || 0} team document(s)
        {searchQuery && ` matching "${searchQuery}"`}
      </div>
    </div>
  );
}
