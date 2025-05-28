import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Setup from "@/pages/setup";
import LoginPage from "@/pages/LoginPage"; // Import LoginPage
import RegisterPage from "@/pages/RegisterPage"; // Import RegisterPage
import ContactDetails from "@/pages/contact-details";
import Settings from "@/pages/settings";
import ProtectedRoute from "./components/ProtectedRoute"; // Import ProtectedRoute
import { useAuth } from "./hooks/useAuth";
import { useLocalStorage } from "./hooks/use-local-storage";
import { Spinner } from "./components/ui/spinner"; // Assuming a spinner component
import React, { useEffect } from "react";


function AppRouter() { // Renamed from Router to AppRouter to avoid conflict
  const [setupComplete] = useLocalStorage("setupComplete", false);
  const { isAuthenticated, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading) { // Only perform redirects once auth state is loaded
      if (!setupComplete && location !== "/setup") {
        navigate("/setup", { replace: true });
      } else if (setupComplete && !isAuthenticated && location !== "/login" && location !== "/register") {
        // If setup is complete but user is not authenticated, redirect to login
        // Allow access to /register as well
        navigate("/login", { replace: true });
      }
      // If setup is complete AND user is authenticated, ProtectedRoute will handle access to '/' etc.
      // If trying to access /login or /register while authenticated, could redirect to '/'
      else if (isAuthenticated && (location === "/login" || location === "/register")) {
        navigate("/", { replace: true });
      }
    }
  }, [setupComplete, isAuthenticated, isLoading, location, navigate]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="large" />
      </div>
    );
  }
  
  // If setup is not complete, only render the Setup page.
  // The useEffect above will navigate to /setup.
  // This explicit check ensures no other routes are inadvertently rendered.
  if (!setupComplete && location !== "/setup") {
     // While useEffect handles navigation, this prevents rendering other routes during the brief moment before navigation.
    return <Route path="/setup" component={Setup} />;
  }


  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/setup" component={Setup} />
      
      {/* Protected Routes */}
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/contact/:id" component={ContactDetails} />
      <ProtectedRoute path="/settings" component={Settings} />
      
      {/* Fallback for 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter /> {/* Use the renamed AppRouter */}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
