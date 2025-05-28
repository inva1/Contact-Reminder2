import { Home, User, BarChart, Bell, Settings as SettingsIcon } from "lucide-react"; // Renamed Settings to SettingsIcon to avoid conflict
import { useChatExportRecommendations } from "@/hooks/use-chat-export";
import { useState } from "react";
import ChatExportGuidanceModal from "../chat-export/guidance-modal";
import { useLocation, Link } from "wouter";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ href, label, icon }) => {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link href={href} className="flex-1">
      <div
        className={`flex flex-col items-center p-2 rounded-md transition-colors duration-150 ease-in-out
                    ${isActive 
                      ? "text-primary bg-primary/10" 
                      : "text-muted-foreground hover:text-primary hover:bg-muted/50"
                    }`}
      >
        {icon}
        <span className="text-xs mt-1">{label}</span>
      </div>
    </Link>
  );
};

export default function NavigationBar() {
  const [showGuidance, setShowGuidance] = useState(false);
  const { data: recommendations = [] } = useChatExportRecommendations();
  // Define navigation items
  const navItems = [
    { href: "/", label: "Home", icon: <Home size={24} /> },
    { href: "/contacts", label: "Contacts", icon: <User size={24} /> }, // Assuming /contacts is the route for the main contact list view
    { href: "/analytics", label: "Analytics", icon: <BarChart size={24} /> }, // Assuming /analytics route
    { href: "/settings", label: "Settings", icon: <SettingsIcon size={24} /> },
  ];

  return (
    <nav className="bg-card border-t border-border fixed bottom-0 w-full shadow-md">
      {/* Added more padding on x-axis for smaller screens, can be adjusted with sm:px-6 etc. */}
      <div className="flex justify-around items-center max-w-2xl mx-auto px-2 py-1.5"> 
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
  // Add this to your existing NavigationBar component
  const notificationItem = (
    <div 
      onClick={() => setShowGuidance(true)} 
      className="cursor-pointer"
    >
      <div className="flex flex-col items-center p-2 text-muted-foreground relative">
        <Bell size={24} />
        {recommendations.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {recommendations.length}
          </span>
        )}
        <span className="text-xs mt-1">Alerts</span>
      </div>
    </div>
  );

  return (
    <>
      <nav className="bg-card border-t border-border fixed bottom-0 w-full py-2 px-6 shadow-sm">
        <div className="flex justify-around items-center">
          {/* Your existing navigation items */}
          {notificationItem}
        </div>
      </nav>

      <ChatExportGuidanceModal
        open={showGuidance}
        onOpenChange={setShowGuidance}
        contacts={recommendations}
      />
    </>
  );  
}
