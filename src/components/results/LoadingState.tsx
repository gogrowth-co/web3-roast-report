
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message: string;
  description: string;
}

const LoadingState = ({ message, description }: LoadingStateProps) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <Loader2 className="h-8 w-8 animate-spin text-web3-orange mb-4" />
      <h2 className="text-xl text-white font-bold">{message}</h2>
      <p className="text-gray-400 mt-2">{description}</p>
    </div>
  );
};

export default LoadingState;
