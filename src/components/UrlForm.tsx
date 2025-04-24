
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

const UrlForm = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateUrl = (input: string) => {
    try {
      const urlObj = new URL(input);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }

    if (!validateUrl(url)) {
      toast.error("Please enter a valid URL (including http:// or https://)");
      return;
    }

    setIsLoading(true);
    
    try {
      // This would connect to your backend in production
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success toast
      toast.success("Analysis started! Redirecting to results...");
      
      // Reset form
      setUrl('');
      
      // In a real app, you'd redirect to the results page
      setTimeout(() => {
        console.log("Would redirect to results page with URL:", url);
      }, 2000);
      
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter your Web3 project URL (e.g., https://uniswap.org)"
          className="flex-1 bg-web3-light-gray border-web3-light-gray focus:border-web3-purple focus:ring-web3-purple/50"
        />
        <Button 
          type="submit" 
          className="bg-web3-orange hover:bg-web3-orange/90 text-white font-bold"
          disabled={isLoading}
        >
          {isLoading ? "Scanning..." : "Roast It! 🔥"}
        </Button>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center sm:text-left">
        Free tier: Instant AI analysis with actionable recommendations
      </p>
    </form>
  );
};

export default UrlForm;
