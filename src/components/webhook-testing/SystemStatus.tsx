
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';

const SystemStatus = () => {
  const [pgNetStatus, setPgNetStatus] = useState<string | null>(null);

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
  }, []);

  return (
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
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatus;
