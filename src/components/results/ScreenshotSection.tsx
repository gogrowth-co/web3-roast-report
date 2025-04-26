
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ScreenshotSectionProps {
  screenshotUrl?: string;
}

const ScreenshotSection = ({ screenshotUrl }: ScreenshotSectionProps) => {
  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-2">
        <h2 className="text-xl font-semibold">Screenshot</h2>
        <p className="text-gray-400">Full page capture of your Web3 project</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          {screenshotUrl ? (
            <img src={screenshotUrl} alt="Website Screenshot" className="w-full" />
          ) : (
            <div className="bg-zinc-800 h-64 flex items-center justify-center">
              <p className="text-gray-400">Screenshot not available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ScreenshotSection;
