import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function Setup() {
  const [_, setLocation] = useLocation();
  const [__, setSetupComplete] = useLocalStorage("setupComplete", false);
  
  const handleContinue = () => {
    setSetupComplete(true);
    setLocation("/");
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-10">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-2xl font-medium mb-6">Welcome to Contact Reminder</h1>
        <p className="mb-8">
          This app helps you stay connected with friends and family by analyzing your
          WhatsApp chats and suggesting personalized conversation starters.
        </p>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <h2 className="text-xl font-medium mb-4">First, enable WhatsApp backups</h2>
            <ol className="text-left space-y-3 mb-6">
              <li>1. Open WhatsApp</li>
              <li>2. Go to Settings &gt; Chats &gt; Chat Backup</li>
              <li>3. Enable local backups</li>
              <li>4. Return to this app when complete</li>
            </ol>
            <div className="flex justify-center">
              <div className="h-32 w-32 bg-muted rounded flex items-center justify-center">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="64" 
                  height="64" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3v5Z" />
                  <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3v5Z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Button 
          className="py-3 px-8 rounded-full font-medium"
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
