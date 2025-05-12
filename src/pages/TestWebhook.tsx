
import { useState } from 'react';
import SEO from '@/components/SEO';
import WebhookForm from '@/components/webhook-testing/WebhookForm';
import SystemStatus from '@/components/webhook-testing/SystemStatus';
import WebhookLogs from '@/components/webhook-testing/WebhookLogs';

const TestWebhook = () => {
  // Reference to webhook logs component for refreshing
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleTestComplete = () => {
    // Refresh webhook logs by changing the key
    setRefreshKey(prevKey => prevKey + 1);
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
          <WebhookForm onTestComplete={handleTestComplete} />
          <SystemStatus />
        </div>
        
        <div key={refreshKey}>
          <WebhookLogs />
        </div>
      </div>
    </div>
  );
};

export default TestWebhook;
