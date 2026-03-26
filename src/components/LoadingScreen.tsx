interface LoadingScreenProps {
  message?: string;
  detail?: string;
}

const LoadingScreen = ({
  message = "Loading...",
  detail = "Preparing your workspace",
}: LoadingScreenProps) => (
  <div className="flex min-h-screen items-center justify-center bg-background text-fg px-4">
    
    <div className="w-full max-w-sm text-center space-y-4">
      
      {/* Spinner */}
      <div className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      
      {/* Message */}
      <h1 className="text-lg font-semibold">{message}</h1>
      
      {/* Detail */}
      <p className="text-sm text-fg-muted">{detail}</p>

    </div>

  </div>
);

export default LoadingScreen;
