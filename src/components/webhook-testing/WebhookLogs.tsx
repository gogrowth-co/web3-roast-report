
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { WebhookLog } from '@/types/webhook';

const WebhookLogs = () => {
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchWebhookLogs();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook Logs</CardTitle>
        <CardDescription>Recent webhook execution attempts</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="text-red-400 mb-4">{error}</p>
        )}
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
  );
};

export default WebhookLogs;
