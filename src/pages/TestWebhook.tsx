
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';

const TestWebhook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [email, setEmail] = useState('test@example.com');
  const [userId, setUserId] = useState('test-user-id-' + Date.now());
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.zapier.com/hooks/catch/2648556/2plv5iy/');
  const [testResults, setTestResults] = useState<{success?: boolean; message?: string; payload?: any}>({});
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);

  // Check if webhook is configured in database
  const checkWebhookConfiguration = async () => {
    try {
      // Check for migration in a way that works with the database schema
      const { data: migrations, error: migrationError } = await supabase
        .rpc('get_pg_functions_info');
      
      if (migrationError) {
        console.error("Error checking functions:", migrationError);
        return false;
      }

      // Check if the webhook trigger function exists
      const webhookFunctionExists = migrations?.some(
        (fn: any) => fn.name === 'trigger_zapier_on_new_user'
      );

      return webhookFunctionExists;
    } catch (error) {
      console.error("Error checking webhook configuration:", error);
      return false;
    }
  };

  const fetchWebhookLogs = async () => {
    setIsFetching(true);
    try {
      // This will only work if the webhook_logs table exists
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching webhook logs:", error);
        toast.error("Could not fetch webhook logs");
      } else {
        setWebhookLogs(data || []);
      }
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSendTest = async () => {
    setIsLoading(true);
    setTestResults({});
    
    try {
      // Direct call to the Zapier webhook for testing
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userId,
          email: email,
          created_at: new Date().toISOString()
        }),
        mode: 'no-cors', // Using no-cors since this is a cross-origin request
      });
      
      // Since we're using no-cors, we can't read the response
      // We'll assume success if no exception was thrown
      toast.success("Test data sent to Zapier webhook");
      
      const testPayload = {
        uid: userId,
        email: email,
        created_at: new Date().toISOString()
      };
      
      setTestResults({
        success: true,
        message: "Test request sent successfully",
        payload: testPayload
      });
      
      console.log("Webhook test request sent with data:", testPayload);
    } catch (error) {
      console.error("Error sending test data:", error);
      toast.error("Failed to send test data to webhook");
      
      setTestResults({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runValidation = async () => {
    setIsLoading(true);
    setTestResults({});

    try {
      // Check if webhook configuration exists in database
      const isConfigured = await checkWebhookConfiguration();

      if (!isConfigured) {
        setTestResults({
          success: false,
          message: "Webhook trigger function not found in database functions"
        });
        return;
      }

      setTestResults({
        success: true,
        message: "Webhook function appears to be properly configured",
        payload: {
          webhookUrl: webhookUrl,
          triggeredBy: "Database trigger on auth.users INSERT",
          expectedFields: ["uid", "email", "created_at"]
        }
      });

      toast.success("Webhook validation completed");
      
      // Try to fetch webhook logs to see if any have been created
      await fetchWebhookLogs();
      
    } catch (error) {
      console.error("Error validating webhook:", error);
      toast.error("Failed to validate webhook configuration");
      
      setTestResults({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Try to fetch webhook logs on initial load
    fetchWebhookLogs();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Zapier Webhook</CardTitle>
          <CardDescription>
            Debug and validate your user signup webhook integration
          </CardDescription>
        </CardHeader>

        <Tabs defaultValue="test">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="test">Send Test</TabsTrigger>
            <TabsTrigger value="validate">Validate Setup</TabsTrigger>
            <TabsTrigger value="logs">View Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="test">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input 
                  id="webhookUrl" 
                  value={webhookUrl} 
                  onChange={(e) => setWebhookUrl(e.target.value)} 
                  placeholder="https://hooks.zapier.com/hooks/catch/..." 
                />
              </div>
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
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSendTest} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  "Send Test Data"
                )}
              </Button>
            </CardFooter>
          </TabsContent>
          
          <TabsContent value="validate">
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                This will validate your webhook configuration in the database to ensure it's properly set up.
              </p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={runValidation} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  "Validate Webhook Configuration"
                )}
              </Button>
            </CardFooter>
          </TabsContent>
          
          <TabsContent value="logs">
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Recent Webhook Attempts</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchWebhookLogs}
                  disabled={isFetching}
                >
                  {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              
              {webhookLogs.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-auto">
                  {webhookLogs.map((log) => (
                    <div key={log.id} className="p-2 text-xs bg-gray-50 dark:bg-gray-900 rounded-md">
                      <div className="flex justify-between">
                        <span className="font-medium">User: {log.user_id.slice(0,8)}...</span>
                        <span className="text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-1">
                        <pre className="overflow-auto">{JSON.stringify(log.payload, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-500">
                  {isFetching ? 'Loading logs...' : 'No webhook logs found'}
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>

        {testResults.success !== undefined && (
          <div className={`p-4 mt-4 rounded-md ${testResults.success ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {testResults.success ? (
                  <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                )}
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${testResults.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                  {testResults.success ? 'Success' : 'Error'}
                </h3>
                <div className={`mt-2 text-sm ${testResults.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  <p>{testResults.message}</p>
                  {testResults.payload && (
                    <pre className="mt-2 p-2 bg-black/10 rounded text-xs overflow-auto">
                      {JSON.stringify(testResults.payload, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TestWebhook;
