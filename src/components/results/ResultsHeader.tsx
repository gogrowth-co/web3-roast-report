
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download } from "lucide-react";
import { useNavigate, useParams } from 'react-router-dom';
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadElementAsPdf } from "@/utils/pdfUtils";

const ResultsHeader = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleShare = async () => {
    if (!id) {
      toast.error("Cannot share: Invalid roast ID");
      return;
    }

    try {
      setIsSharing(true);
      console.log("Sharing roast with ID:", id);
      
      // Call the create-share function to get a share ID
      const { data, error } = await supabase.functions.invoke('create-share', {
        body: { roastId: id }
      });

      if (error) {
        console.error("Share function error:", error);
        throw new Error(error.message || "Error invoking sharing function");
      }

      if (!data?.shareId) {
        console.error("No share ID returned:", data);
        throw new Error("No share ID returned from sharing function");
      }

      console.log("Share ID received:", data.shareId);
      
      // Create the shareable URL
      const shareUrl = `${window.location.origin}/share/${data.shareId}`;
      console.log("Generated share URL:", shareUrl);
      
      // Copy to clipboard directly
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard", {
        description: "You can now share this link with others"
      });
    } catch (err: any) {
      console.error("Share error:", err);
      toast.error("Failed to share results", {
        description: err.message || "Please try again"
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      console.log("Starting report download process");
      const success = await downloadElementAsPdf('report-root', `roast-report-${id || 'results'}.pdf`);
      
      if (success) {
        toast.success("Report downloaded", {
          description: "Your PDF report has been generated and downloaded"
        });
      }
    } catch (err: any) {
      console.error("Download error:", err);
      toast.error("Failed to download report", {
        description: err.message || "Please try again"
      });
    } finally {
      setIsDownloading(false);
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
            {isSharing ? "Copying..." : "Copy Share Link"}
          </Button>
          <Button 
            variant="outline" 
            className="border-zinc-700"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Downloading..." : "Download Report"}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ResultsHeader;
