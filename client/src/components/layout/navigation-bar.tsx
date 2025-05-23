import { Home, User, BarChart, Settings } from "lucide-react";
import { useLocation, Link } from "wouter";

export default function NavigationBar() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <nav className="bg-card border-t border-border fixed bottom-0 w-full py-2 px-6 shadow-sm">
      <div className="flex justify-around items-center">
        <div onClick={() => window.location.href = "/"} className="cursor-pointer">
          <div className={`flex flex-col items-center p-2 ${
            isActive("/") ? "text-primary" : "text-muted-foreground"
          }`}>
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </div>
        </div>
        
        <div onClick={() => window.location.href = "/contacts"} className="cursor-pointer">
          <div className={`flex flex-col items-center p-2 ${
            isActive("/contacts") ? "text-primary" : "text-muted-foreground"
          }`}>
            <User size={24} />
            <span className="text-xs mt-1">Contacts</span>
          </div>
        </div>
        
        <div onClick={() => window.location.href = "/analytics"} className="cursor-pointer">
          <div className={`flex flex-col items-center p-2 ${
            isActive("/analytics") ? "text-primary" : "text-muted-foreground"
          }`}>
            <BarChart size={24} />
            <span className="text-xs mt-1">Analytics</span>
          </div>
        </div>
        
        <div onClick={() => window.location.href = "/settings"} className="cursor-pointer">
          <div className={`flex flex-col items-center p-2 ${
            isActive("/settings") ? "text-primary" : "text-muted-foreground"
          }`}>
            <Settings size={24} />
            <span className="text-xs mt-1">Settings</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
