
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2, Download } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

const ResultsHeader = () => {
  const navigate = useNavigate();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied to clipboard", {
        description: "You can now share these results with others"
      });
    } catch (err) {
      toast.error("Failed to copy link", {
        description: "Please try again"
      });
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
          <Button variant="secondary" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Results
          </Button>
          <Button variant="secondary" disabled>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ResultsHeader;
