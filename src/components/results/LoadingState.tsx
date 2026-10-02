
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message: string;
  description: string;
}

const LoadingState = ({ message, description }: LoadingStateProps) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-web3-purple relative z-10" />
      </div>
      <h2 className="text-2xl font-bold mt-6 mb-2">{message}</h2>
      <p className="text-gray-400">{description}</p>
    </div>
  );
};

export default LoadingState;
