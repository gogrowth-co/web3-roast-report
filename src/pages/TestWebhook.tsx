
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const TestWebhook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('test@example.com');
  const [userId, setUserId] = useState('test-user-id-' + Date.now());

  const handleSendTest = async () => {
    setIsLoading(true);
    try {
      // Direct call to the Zapier webhook for testing
      const response = await fetch('https://hooks.zapier.com/hooks/catch/2648556/2plv5iy/', {
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
      
      toast.success("Test data sent to Zapier webhook");
      console.log("Webhook test request sent with data:", {
        uid: userId,
        email: email,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error sending test data:", error);
      toast.error("Failed to send test data to webhook");
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
            Send test user data to the Zapier webhook to verify your integration is working
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            {isLoading ? "Sending..." : "Send Test Data"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TestWebhook;
