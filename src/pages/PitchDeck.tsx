import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Presentation, Download, Eye } from 'lucide-react';

interface Slide {
  slideNumber: number;
  title: string;
  content: string;
  visualType?: string;
  visualPrompt?: string;
  imageData?: string;
  notes?: string;
}

interface PitchDeck {
  title: string;
  subtitle: string;
  slides: Slide[];
  totalSlides: number;
}

export default function PitchDeck() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('general business audience');
  const [numberOfSlides, setNumberOfSlides] = useState('10');
  const [style, setStyle] = useState('professional');
  const [includeImages, setIncludeImages] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pitchDeck, setPitchDeck] = useState<PitchDeck | null>(null);

  const handleGenerate = async () => {
    if (!user) {
      toast.error('Please sign in to generate pitch decks');
      return;
    }

    if (!topic.trim()) {
      toast.error('Please enter a topic for your pitch deck');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-pitch-deck', {
        body: {
          topic,
          targetAudience,
          numberOfSlides: parseInt(numberOfSlides),
          style,
          includeImages
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setPitchDeck(data);
      toast.success('Pitch deck generated successfully!');
    } catch (error) {
      console.error('Pitch deck generation error:', error);
      toast.error('Failed to generate pitch deck. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pitchDeck) return;

    // Create a simple HTML presentation
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${pitchDeck.title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background: #000;
    }
    .slide {
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      page-break-after: always;
      padding: 60px;
      box-sizing: border-box;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .slide.title-slide {
      background: linear-gradient(135deg, #0A2342 0%, #FFC300 100%);
    }
    .slide h1 {
      font-size: 4em;
      margin: 0 0 20px 0;
      text-align: center;
    }
    .slide h2 {
      font-size: 3em;
      margin: 0 0 40px 0;
      text-align: center;
    }
    .slide .subtitle {
      font-size: 2em;
      opacity: 0.9;
    }
    .slide .content {
      font-size: 1.5em;
      max-width: 80%;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    .slide img {
      max-width: 80%;
      max-height: 50vh;
      margin: 20px 0;
      border-radius: 10px;
    }
    .slide .notes {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      font-size: 0.8em;
      opacity: 0.6;
      font-style: italic;
    }
    @media print {
      .slide {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="slide title-slide">
    <h1>${pitchDeck.title}</h1>
    <div class="subtitle">${pitchDeck.subtitle}</div>
  </div>
  ${pitchDeck.slides.map(slide => `
    <div class="slide">
      <h2>${slide.title}</h2>
      ${slide.imageData ? `<img src="data:image/png;base64,${slide.imageData}" alt="${slide.visualPrompt || ''}" />` : ''}
      <div class="content">${slide.content}</div>
      ${slide.notes ? `<div class="notes">Speaker Notes: ${slide.notes}</div>` : ''}
    </div>
  `).join('')}
</body>
</html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pitchDeck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Pitch deck downloaded! Open the HTML file in a browser to view.');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
          <Presentation className="h-10 w-10" />
          AI Pitch Deck Generator
        </h1>
        <p className="text-muted-foreground">
          Create professional pitch decks with AI-generated content and graphics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Deck Configuration</CardTitle>
            <CardDescription>
              Customize your pitch deck settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic / Company Name</Label>
              <Textarea
                id="topic"
                placeholder="e.g., AI-powered knowledge management platform"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                placeholder="e.g., venture capitalists, enterprise clients"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="slides">Number of Slides</Label>
              <Select value={numberOfSlides} onValueChange={setNumberOfSlides}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 slides</SelectItem>
                  <SelectItem value="10">10 slides</SelectItem>
                  <SelectItem value="15">15 slides</SelectItem>
                  <SelectItem value="20">20 slides</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="style">Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeImages"
                checked={includeImages}
                onChange={(e) => setIncludeImages(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeImages">Generate images with Gemini</Label>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || !topic.trim()}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating Deck...
                </>
              ) : (
                <>
                  <Presentation className="h-5 w-5 mr-2" />
                  Generate Pitch Deck
                </>
              )}
            </Button>

            {pitchDeck && (
              <Button
                onClick={handleDownload}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download as HTML
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {pitchDeck ? `${pitchDeck.totalSlides} slides generated` : 'Your pitch deck will appear here'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!pitchDeck && !generating && (
              <div className="flex flex-col items-center justify-center h-96 text-center text-muted-foreground">
                <Eye className="h-16 w-16 mb-4 opacity-20" />
                <p>Configure your pitch deck settings and click Generate</p>
              </div>
            )}

            {generating && (
              <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  {includeImages
                    ? 'Generating content and images... This may take a minute'
                    : 'Generating pitch deck content...'}
                </p>
              </div>
            )}

            {pitchDeck && (
              <div className="space-y-6 max-h-[800px] overflow-y-auto pr-4">
                {/* Title Slide */}
                <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
                  <CardContent className="pt-6">
                    <h2 className="text-3xl font-bold mb-2">{pitchDeck.title}</h2>
                    <p className="text-xl text-muted-foreground">{pitchDeck.subtitle}</p>
                  </CardContent>
                </Card>

                {/* Slides */}
                {pitchDeck.slides.map((slide) => (
                  <Card key={slide.slideNumber} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{slide.title}</CardTitle>
                        <span className="text-sm text-muted-foreground">Slide {slide.slideNumber}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {slide.imageData && (
                        <img
                          src={`data:image/png;base64,${slide.imageData}`}
                          alt={slide.visualPrompt || ''}
                          className="w-full rounded-lg"
                        />
                      )}
                      <div className="whitespace-pre-wrap text-sm">{slide.content}</div>
                      {slide.notes && (
                        <div className="bg-muted p-3 rounded text-sm italic text-muted-foreground">
                          <strong>Speaker Notes:</strong> {slide.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
