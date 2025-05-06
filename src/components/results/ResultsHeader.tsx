
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download } from "lucide-react";
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ResultsHeader = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!id) {
      toast.error("Cannot share: Invalid roast ID");
      return;
    }

    try {
      setIsSharing(true);
      
      // Call the create-share function to get a share ID
      const { data, error } = await supabase.functions.invoke('create-share', {
        body: { roastId: id }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.shareId) {
        throw new Error("No share ID returned");
      }

      // Create the shareable URL
      const shareUrl = `${window.location.origin}/share/${data.shareId}`;
      
      // Try to use the Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: 'Web3 ROAST Results',
          text: 'Check out this Web3 ROAST analysis!',
          url: shareUrl,
        });
        toast.success("Shared successfully");
      } else {
        // Fallback to clipboard copy
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard", {
          description: "You can now share this link with others"
        });
      }
    } catch (err) {
      console.error("Share error:", err);
      toast.error("Failed to share results", {
        description: "Please try again"
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-zinc-800 bg-black/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleShare} 
            className="border-zinc-700"
            disabled={isSharing}
          >
            <Share2 className="h-4 w-4 mr-2" />
            {isSharing ? "Sharing..." : "Share Results"}
          </Button>
          <Button variant="outline" className="border-zinc-700">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ResultsHeader;
