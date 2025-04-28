
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ScreenshotSectionProps {
  screenshotUrl?: string;
}

const ScreenshotSection = ({ screenshotUrl }: ScreenshotSectionProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <h2 className="text-xl font-semibold">Screenshot</h2>
        <p className="text-gray-400">Full page capture of your Web3 project</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-zinc-800 overflow-hidden relative">
          {screenshotUrl ? (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
              )}
              <img 
                src={screenshotUrl} 
                alt="Website Screenshot" 
                className="w-full"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: isLoading ? 'none' : 'block' }} 
              />
            </>
          ) : hasError ? (
            <div className="bg-zinc-800 h-64 flex items-center justify-center">
              <p className="text-red-400">Failed to load screenshot</p>
            </div>
          ) : (
            <div className="bg-zinc-800 h-64 flex items-center justify-center">
              <p className="text-gray-400">Screenshot pending...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScreenshotSection;
