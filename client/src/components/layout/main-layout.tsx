import { ReactNode, useEffect } from "react";
import NavigationBar from "./navigation-bar";
import { useReminders } from "@/hooks/useReminders"; // Import the hook
import { useAuth } from "@/hooks/useAuth"; // To initialize only for authenticated users

interface MainLayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export default function MainLayout({ children, hideNavigation = false }: MainLayoutProps) {
  const { isAuthenticated } = useAuth();
  const { requestPermission, notificationPermission } = useReminders(); // Initialize the hook

  useEffect(() => {
    // Request permission if authenticated and permission is default
    // This logic is also inside useReminders, but calling requestPermission here ensures it's tried
    // when the main layout mounts for an authenticated user if still default.
    if (isAuthenticated && notificationPermission === 'default') {
      requestPermission();
    }
  }, [isAuthenticated, notificationPermission, requestPermission]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow overflow-y-auto hide-scrollbar pb-16">
        {children}
      </main>
      {!hideNavigation && <NavigationBar />}
    </div>
  );
}
