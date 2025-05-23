import { ReactNode } from "react";
import NavigationBar from "./navigation-bar";

interface MainLayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export default function MainLayout({ children, hideNavigation = false }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <main className="flex-grow overflow-y-auto hide-scrollbar pb-16">
        {children}
      </main>
      {!hideNavigation && <NavigationBar />}
    </div>
  );
}
