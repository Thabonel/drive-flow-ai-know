import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DictationButton } from "@/components/DictationButton";

const PROMPT_TEMPLATES = {
  concise: `I prefer concise, technical responses. Get straight to the point with minimal explanation. Use code examples and technical terminology freely.`,
  detailed: `I prefer detailed explanations that walk through concepts step by step. Include examples, context, and reasoning behind recommendations.`,
  friendly: `I prefer a friendly, conversational tone. Explain things in accessible language and use analogies when helpful. Feel free to be casual.`,
  professional: `I prefer professional, formal communication. Use proper terminology, structured responses, and maintain a business-appropriate tone.`,
  custom: "",
};

const MAX_LENGTH = 2000;
const MIN_LENGTH = 50;

export function PersonalPrompt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");

  useEffect(() => {
    loadPersonalPrompt();
  }, [user]);

  const loadPersonalPrompt = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("personal_prompt")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const savedPrompt = data?.personal_prompt || "";
      setPrompt(savedPrompt);
      setOriginalPrompt(savedPrompt);
    } catch (error) {
      console.error("Error loading personal prompt:", error);
      toast({
        title: "Error",
        description: "Failed to load your personal prompt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (prompt && prompt.length < MIN_LENGTH) {
      toast({
        title: "Prompt too short",
        description: `Please write at least ${MIN_LENGTH} characters`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          personal_prompt: prompt || null,
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      setOriginalPrompt(prompt);
      toast({
        title: "Success",
        description: "Your personal prompt has been saved",
      });
    } catch (error) {
      console.error("Error saving personal prompt:", error);
      toast({
        title: "Error",
        description: "Failed to save your personal prompt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSelect = (value: string) => {
    setSelectedTemplate(value);
    if (value !== "custom") {
      setPrompt(PROMPT_TEMPLATES[value as keyof typeof PROMPT_TEMPLATES]);
    }
  };

  const handleClear = () => {
    setPrompt("");
    setSelectedTemplate("custom");
  };

  const handleCancel = () => {
    setPrompt(originalPrompt);
    setSelectedTemplate("custom");
  };

  const charCount = prompt.length;
  const charCountColor =
    charCount > MAX_LENGTH ? "text-destructive" :
    charCount < MIN_LENGTH && charCount > 0 ? "text-yellow-600" :
    "text-muted-foreground";

  const hasChanges = prompt !== originalPrompt;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Personal AI Prompt
        </CardTitle>
        <CardDescription>
          Customize how the AI assistant responds to you. This prompt is added to all AI interactions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="template-select">Quick Start Templates</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger id="template-select">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom (write your own)</SelectItem>
                  <SelectItem value="concise">Concise & Technical</SelectItem>
                  <SelectItem value="detailed">Detailed & Explanatory</SelectItem>
                  <SelectItem value="friendly">Friendly & Conversational</SelectItem>
                  <SelectItem value="professional">Professional & Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="personal-prompt">Your Personal Prompt</Label>
                  <DictationButton
                    onTranscription={(text) => {
                      const newValue = prompt ? prompt + ' ' + text : text;
                      if (newValue.length <= MAX_LENGTH) {
                        setPrompt(newValue);
                        setSelectedTemplate("custom");
                      }
                    }}
                    size="sm"
                  />
                </div>
                <span className={`text-xs ${charCountColor}`}>
                  {charCount} / {MAX_LENGTH} characters
                  {charCount > 0 && charCount < MIN_LENGTH && ` (min ${MIN_LENGTH})`}
                </span>
              </div>
              <Textarea
                id="personal-prompt"
                placeholder="Example: I'm a software engineer working with React and TypeScript. I prefer detailed explanations with code examples. Always include error handling in your suggestions..."
                value={prompt}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= MAX_LENGTH) {
                    setPrompt(value);
                    setSelectedTemplate("custom");
                  }
                }}
                className="min-h-[200px] resize-y"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Tell the AI about your preferences, working style, expertise level, or any specific instructions.
                The AI will use this context in all conversations.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges || (prompt.length > 0 && prompt.length < MIN_LENGTH) || charCount > MAX_LENGTH}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Prompt"
                )}
              </Button>

              {hasChanges && (
                <Button onClick={handleCancel} variant="outline" disabled={saving}>
                  Cancel
                </Button>
              )}

              {prompt && (
                <Button onClick={handleClear} variant="ghost" disabled={saving}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-2">How it works</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Your prompt is added to all AI conversations and document queries</li>
                <li>• The AI will adapt its tone, depth, and style based on your preferences</li>
                <li>• You can update or remove this anytime</li>
                <li>• Your prompt is private and only used for your account</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
