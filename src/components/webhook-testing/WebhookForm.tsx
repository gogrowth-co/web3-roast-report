
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";

interface WebhookFormProps {
  onTestComplete: () => void;
}

const WebhookForm = ({ onTestComplete }: WebhookFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('test@example.com');
  const [userId, setUserId] = useState('test-user-id-123');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestWebhook = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-webhook', {
        body: {
          uid: userId,
          email: email,
          created_at: new Date().toISOString()
        }
      });
      
      if (error) throw error;
      
      setResult(data);
      toast({
        title: "Success",
        description: "Webhook test completed successfully",
      });
      onTestComplete(); // Refresh logs after test
    } catch (err: any) {
      console.error('Webhook test error:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: `Failed to test webhook: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Webhook</CardTitle>
        <CardDescription>Send test data to Zapier webhook</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="test@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input 
              id="userId" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)} 
              placeholder="user-id"
            />
          </div>
          
          <Button 
            onClick={handleTestWebhook} 
            disabled={isLoading}
          >
            {isLoading ? 'Testing...' : 'Test Webhook'}
          </Button>

          {result && (
            <div className="mt-4 p-2 bg-zinc-800 rounded text-sm">
              <pre className="whitespace-pre-wrap overflow-auto max-h-40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          {error && (
            <div className="p-2 bg-red-900/30 border border-red-700 rounded text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookForm;
