
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const TestWebhook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('test@example.com');
  const [userId, setUserId] = useState('test-user-id-' + Date.now());
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.zapier.com/hooks/catch/2648556/2plv5iy/');
  const [testResults, setTestResults] = useState<{success?: boolean; message?: string; payload?: any}>({});

  // Check if webhook is configured in database
  const checkWebhookConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('migrations')
        .select('name')
        .eq('name', '20250501_create_zapier_webhook')
        .single();

      if (error) {
        console.error("Error checking webhook configuration:", error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Error checking webhook configuration:", error);
      return false;
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
          message: "Webhook configuration not found in database migrations"
        });
        return;
      }

      // Check SQL function exists (approximation since we can't directly check functions)
      const { data: pgFunctions, error: pgError } = await supabase
        .rpc('get_pg_functions_info');

      if (pgError) {
        console.error("Error checking PostgreSQL functions:", pgError);
        setTestResults({
          success: false,
          message: "Could not validate database functions: " + pgError.message
        });
        return;
      }

      setTestResults({
        success: true,
        message: "Webhook configuration appears to be valid",
        payload: {
          webhookUrl: webhookUrl,
          triggeredBy: "Database trigger on auth.users INSERT",
          expectedFields: ["uid", "email", "created_at"]
        }
      });

      toast.success("Webhook validation completed");
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

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Zapier Webhook</CardTitle>
          <CardDescription>
            Test and validate your user signup webhook integration
          </CardDescription>
        </CardHeader>

        <Tabs defaultValue="test">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="test">Send Test</TabsTrigger>
            <TabsTrigger value="validate">Validate Setup</TabsTrigger>
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
