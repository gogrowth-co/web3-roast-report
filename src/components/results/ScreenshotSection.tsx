
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useState } from "react";
import { Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScreenshotSectionProps {
  screenshotUrl?: string;
}

const ScreenshotSection = ({ screenshotUrl }: ScreenshotSectionProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullView, setIsFullView] = useState(false);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const toggleFullView = () => {
    setIsFullView(!isFullView);
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Screenshot</h2>
            <p className="text-gray-400">Captured view of your Web3 project</p>
          </div>
          {screenshotUrl && !isLoading && !hasError && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleFullView}
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              {isFullView ? 'Show Preview' : 'Show Full Page'}
            </Button>
          )}
        </div>
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
              <div
                className={`${isFullView ? 'overflow-auto' : 'overflow-hidden'}`} 
                style={{ 
                  maxHeight: isFullView ? '80vh' : '576px', // 1024x768 aspect ratio adjusted for height
                  position: 'relative'
                }}
              >
                <img 
                  src={screenshotUrl} 
                  alt="Website Screenshot" 
                  className="w-full"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  style={{ 
                    display: isLoading ? 'none' : 'block',
                  }} 
                />
              </div>
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
        {!isLoading && !hasError && screenshotUrl && (
          <p className="text-xs text-gray-400 mt-2">
            {isFullView 
              ? "Showing full-page screenshot. Scroll to see more content."
              : "Showing top portion of the page. Click 'Show Full Page' to see the entire website."}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ScreenshotSection;
