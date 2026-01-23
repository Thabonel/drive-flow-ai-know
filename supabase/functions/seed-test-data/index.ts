import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sampleDocuments = [
  {
    title: "AI Strategy Framework 2024",
    content: "This document outlines our comprehensive AI strategy for 2024, focusing on three key pillars: automation, personalization, and decision support. We aim to integrate AI across all business functions while maintaining ethical standards and human oversight. Key initiatives include implementing chatbots for customer service, predictive analytics for inventory management, and AI-powered content creation tools.",
    category: "strategy",
    file_type: "document",
    mime_type: "application/vnd.google-apps.document"
  },
  {
    title: "Content Marketing Playbook",
    content: "Our content marketing approach centers on creating valuable, relevant content that addresses customer pain points. This playbook covers blog post optimization, social media strategy, email marketing campaigns, and SEO best practices. We focus on storytelling, data-driven insights, and multi-channel distribution to maximize reach and engagement.",
    category: "marketing",
    file_type: "document", 
    mime_type: "application/vnd.google-apps.document"
  },
  {
    title: "Product Requirements Document - Mobile App",
    content: "This PRD defines the requirements for our new mobile application. Key features include user authentication, real-time notifications, offline functionality, and social sharing capabilities. The app should support iOS and Android platforms, with a focus on performance, accessibility, and user experience. Technical requirements include API integration, data synchronization, and security protocols.",
    category: "specs",
    file_type: "document",
    mime_type: "application/vnd.google-apps.document"
  },
  {
    title: "ChatGPT Prompt Library",
    content: "A curated collection of effective ChatGPT prompts for various business applications. Includes prompts for content creation, code review, data analysis, customer support, and creative writing. Each prompt is categorized by use case and includes examples of expected outputs. Best practices for prompt engineering and optimization techniques are also covered.",
    category: "prompts",
    file_type: "document",
    mime_type: "application/vnd.google-apps.document"
  },
  {
    title: "Brand Guidelines 2024",
    content: "Comprehensive brand guidelines covering logo usage, color palette, typography, voice and tone, and visual identity standards. This document ensures consistent brand representation across all marketing materials, digital platforms, and communications. Includes examples of proper implementation and common mistakes to avoid.",
    category: "marketing",
    file_type: "document",
    mime_type: "application/vnd.google-apps.document"
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error('user_id is required');
    }

    // Create a test Google Drive folder
    const { data: folder, error: folderError } = await supabaseClient
      .from('google_drive_folders')
      .upsert({
        user_id,
        folder_id: 'demo_folder_123',
        folder_name: 'Demo Knowledge Documents',
        folder_path: '/Demo Knowledge Documents',
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,folder_id'
      })
      .select()
      .single();

    if (folderError) {
      throw new Error(`Failed to create folder: ${folderError.message}`);
    }

    // Create sample documents
    const createdDocuments = [];
    for (const doc of sampleDocuments) {
      const { data: document, error: docError } = await supabaseClient
        .from('knowledge_documents')
        .upsert({
          user_id,
          folder_id: folder.id,
          google_file_id: `demo_${doc.title.toLowerCase().replace(/\s+/g, '_')}`,
          title: doc.title,
          content: doc.content,
          file_type: doc.file_type,
          mime_type: doc.mime_type,
          category: doc.category,
          ai_summary: generateSummary(doc.content),
          tags: generateTags(doc.content, doc.category),
          ai_insights: {
            insights: generateInsights(doc.content),
            key_concepts: generateConcepts(doc.content),
            content_type: getContentType(doc.category),
            analysis_date: new Date().toISOString()
          },
          drive_created_at: new Date().toISOString(),
          drive_modified_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,google_file_id'
        })
        .select()
        .single();

      if (!docError && document) {
        createdDocuments.push(document);
      }
    }

    // Create knowledge bases for each category
    const categories = [...new Set(sampleDocuments.map(doc => doc.category))];
    
    for (const category of categories) {
      const categoryDocs = createdDocuments.filter(doc => doc.category === category);
      const documentTitles = categoryDocs.map(doc => doc.title).join(', ');
      const allTags = categoryDocs.flatMap(doc => doc.tags || []);
      const uniqueTags = [...new Set(allTags)];

      const synthesizedContent = `
# ${category.charAt(0).toUpperCase() + category.slice(1)} Knowledge Base

This knowledge base synthesizes insights from ${categoryDocs.length} documents in the ${category} category.

## Document Overview
Documents included: ${documentTitles}

## Key Topics
${uniqueTags.map(tag => `- ${tag}`).join('\n')}

## Summary
This collection provides comprehensive coverage of ${category}-related content, drawing from multiple source documents to create a unified knowledge resource.

## Document Summaries
${categoryDocs.map(doc => `
### ${doc.title}
${doc.ai_summary}
`).join('\n')}
      `.trim();

      await supabaseClient
        .from('knowledge_bases')
        .upsert({
          user_id,
          title: `${category.charAt(0).toUpperCase() + category.slice(1)} Knowledge Base`,
          description: `AI-synthesized knowledge base containing insights from ${categoryDocs.length} ${category} documents`,
          type: category,
          source_document_ids: categoryDocs.map(doc => doc.id),
          ai_generated_content: synthesizedContent,
          content: {
            documents: categoryDocs.map(doc => doc.id),
            created_from: 'demo_seed',
            last_synthesis: new Date().toISOString(),
            document_count: categoryDocs.length
          },
          last_updated_from_source: new Date().toISOString(),
        }, {
          onConflict: 'user_id,type'
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdDocuments.length} documents and ${categories.length} knowledge bases`,
        documents_created: createdDocuments.length,
        knowledge_bases_created: categories.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in seed-test-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateSummary(content: string): string {
  const words = content.split(' ');
  const firstSentence = content.split('.')[0] + '.';
  return firstSentence.length > 200 ? words.slice(0, 30).join(' ') + '...' : firstSentence;
}

function generateTags(content: string, category: string): string[] {
  const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
  const words = content.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCount: { [key: string]: number } = {};
  
  words.forEach(word => {
    if (word.length > 3 && !commonWords.includes(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  const topWords = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);
  
  return [category, ...topWords].slice(0, 5);
}

function generateInsights(content: string): string[] {
  return [
    "This document provides strategic guidance for implementation",
    "Key focus areas include process optimization and user experience",
    "Emphasizes data-driven decision making and measurable outcomes"
  ];
}

function generateConcepts(content: string): string[] {
  const concepts = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  return [...new Set(concepts)].slice(0, 5);
}

function getContentType(category: string): string {
  const typeMap: { [key: string]: string } = {
    'strategy': 'guide',
    'marketing': 'strategy', 
    'specs': 'reference',
    'prompts': 'template'
  };
  return typeMap[category] || 'guide';
}