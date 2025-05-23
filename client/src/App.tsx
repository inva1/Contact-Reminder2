import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Setup from "@/pages/setup";
import ContactDetails from "@/pages/contact-details";
import Settings from "@/pages/settings";
import { useEffect, useState } from "react";
import { useLocalStorage } from "./hooks/use-local-storage";

function Router() {
  const [setupComplete] = useLocalStorage("setupComplete", false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    setInitialRoute(setupComplete ? "/" : "/setup");
  }, [setupComplete]);

  if (initialRoute === null) {
    return null; // Show nothing while we determine initial route
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/setup" component={Setup} />
      <Route path="/contact/:id" component={ContactDetails} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
