
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message: string;
  description: string;
}

const LoadingState = ({ message, description }: LoadingStateProps) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 blur-lg opacity-20"></div>
        <Loader2 className="h-12 w-12 animate-spin text-purple-500 relative z-10" />
      </div>
      <h2 className="text-2xl font-bold mt-6 mb-2">{message}</h2>
      <p className="text-gray-400">{description}</p>
    </div>
  );
};

export default LoadingState;
