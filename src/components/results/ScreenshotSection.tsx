
interface ScreenshotSectionProps {
  screenshotUrl?: string;
}

const ScreenshotSection = ({ screenshotUrl }: ScreenshotSectionProps) => {
  return (
    <div className="bg-zinc-900 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Screenshot</h2>
      <p className="text-gray-400 mb-4">Full page capture of your Web3 project</p>
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        {screenshotUrl ? (
          <img src={screenshotUrl} alt="Website Screenshot" className="w-full" />
        ) : (
          <div className="bg-zinc-800 h-64 flex items-center justify-center">
            <p className="text-gray-400">Screenshot not available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScreenshotSection;
