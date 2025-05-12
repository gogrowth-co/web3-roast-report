
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import SEO from '@/components/SEO';

// Define webhook log type
interface WebhookLog {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string | null;
  payload: any;
  response: any;
  status: number | null;
}

const TestWebhook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('test@example.com');
  const [userId, setUserId] = useState('test-user-id-123');
  const [pgNetStatus, setPgNetStatus] = useState<string | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);

  useEffect(() => {
    // Check if pg_net is enabled
    const checkPgNet = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-pg-functions-info');
        
        if (error) throw error;
        
        const migrations = data?.migrations || [];
        const pgNetEnabled = migrations.some((m: any) => 
          m.name.includes('pg_net') && m.success === true
        );
        
        setPgNetStatus(pgNetEnabled ? 'enabled' : 'disabled');
      } catch (err: any) {
        console.error('Error checking pg_net:', err);
        setPgNetStatus(`error: ${err.message}`);
      }
    };
    
    checkPgNet();
    fetchWebhookLogs();
  }, []);

  const fetchWebhookLogs = async () => {
    try {
      // Use RPC function instead of direct table access
      const { data, error } = await supabase.rpc('get_webhook_logs');
      
      if (error) throw error;
      
      setWebhookLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching webhook logs:', err);
      setError(`Failed to fetch webhook logs: ${err.message}`);
    }
  };

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
      fetchWebhookLogs(); // Refresh logs after test
    } catch (err: any) {
      console.error('Webhook test error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <SEO 
        title="Webhook Testing - Web3 ROAST"
        description="Admin tool for testing and debugging webhooks."
        noIndex={true}
      />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Webhook Testing Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Database extension and webhook configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <span className="font-medium">pg_net Status: </span> 
                  <span className={pgNetStatus === 'enabled' ? 'text-green-500' : 'text-red-500'}>
                    {pgNetStatus || 'Checking...'}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium">Webhook URL: </span> 
                  <span className="text-xs break-all">
                    https://hooks.zapier.com/hooks/catch/2648556/2plv5iy/
                  </span>
                </div>
                
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
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Webhook Logs</CardTitle>
            <CardDescription>Recent webhook execution attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {webhookLogs.length === 0 ? (
              <p className="text-gray-400">No webhook logs found</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {webhookLogs.map((log) => (
                  <div key={log.id} className="p-3 border border-zinc-800 rounded">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      <span className={`text-sm ${log.status === 200 ? 'text-green-500' : 'text-red-500'}`}>
                        Status: {log.status}
                      </span>
                    </div>
                    <p className="text-sm mb-1">
                      <strong>User:</strong> {log.email || 'Unknown'}
                    </p>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                        View Details
                      </summary>
                      <pre className="mt-2 p-2 bg-zinc-800 rounded overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                      <div className="mt-2">
                        <strong>Response:</strong>
                        <pre className="mt-1 p-2 bg-zinc-800 rounded overflow-x-auto">
                          {JSON.stringify(log.response, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestWebhook;
