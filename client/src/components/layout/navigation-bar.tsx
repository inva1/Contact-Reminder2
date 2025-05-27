import { Home, User, BarChart, Settings as SettingsIcon } from "lucide-react"; // Renamed Settings to SettingsIcon to avoid conflict
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
}
