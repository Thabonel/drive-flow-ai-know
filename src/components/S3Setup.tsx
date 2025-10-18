import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HardDrive, Check } from "lucide-react";

type S3Config = {
  name: string;
  bucket_name: string;
  region: string;
  access_key: string;
  secret_key: string;
  endpoint?: string;
};

export function S3Setup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<S3Config>({
    name: "",
    bucket_name: "",
    region: "us-east-1",
    access_key: "",
    secret_key: "",
    endpoint: "",
  });

  const handleSave = async () => {
    if (!config.name || !config.bucket_name || !config.access_key || !config.secret_key) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Store S3 configuration
      const { error } = await supabase
        .from('enterprise_servers')
        .insert({
          user_id: user!.id,
          name: config.name,
          protocol: 's3',
          bucket_name: config.bucket_name,
          region: config.region,
          endpoint: config.endpoint || null,
          authentication: {
            access_key_id: config.access_key,
            secret_access_key: config.secret_key,
          },
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "S3 configured",
        description: "Your S3 bucket is connected",
      });

      // Reset form
      setConfig({
        name: "",
        bucket_name: "",
        region: "us-east-1",
        access_key: "",
        secret_key: "",
        endpoint: "",
      });
    } catch (error) {
      console.error('Error saving S3 config:', error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Connect Amazon S3
        </CardTitle>
        <CardDescription>
          Add your AWS credentials to sync files from S3 buckets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="s3-name">Connection Name</Label>
          <Input
            id="s3-name"
            placeholder="My S3 Bucket"
            value={config.name}
            onChange={(e) => setConfig({ ...config, name: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">A friendly name for this connection</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="s3-bucket">Bucket Name</Label>
          <Input
            id="s3-bucket"
            placeholder="my-bucket-name"
            value={config.bucket_name}
            onChange={(e) => setConfig({ ...config, bucket_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="s3-region">Region</Label>
          <Input
            id="s3-region"
            placeholder="us-east-1"
            value={config.region}
            onChange={(e) => setConfig({ ...config, region: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">AWS region (e.g., us-east-1, eu-west-1)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="s3-access-key">Access Key ID</Label>
          <Input
            id="s3-access-key"
            placeholder="AKIAIOSFODNN7EXAMPLE"
            value={config.access_key}
            onChange={(e) => setConfig({ ...config, access_key: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="s3-secret-key">Secret Access Key</Label>
          <Input
            id="s3-secret-key"
            type="password"
            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            value={config.secret_key}
            onChange={(e) => setConfig({ ...config, secret_key: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="s3-endpoint">Custom Endpoint (Optional)</Label>
          <Input
            id="s3-endpoint"
            placeholder="https://nyc3.digitaloceanspaces.com"
            value={config.endpoint}
            onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            For S3-compatible services like MinIO, DigitalOcean Spaces, Wasabi
          </p>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Connect S3 Bucket
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium">How to get AWS credentials:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Go to AWS IAM Console</li>
            <li>Create a new IAM user or use existing</li>
            <li>Attach policy: AmazonS3ReadOnlyAccess</li>
            <li>Generate access key</li>
            <li>Copy the Access Key ID and Secret Access Key</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
