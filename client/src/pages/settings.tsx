import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";

export default function Settings() {
  const [_, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [setupComplete] = useLocalStorage("setupComplete", false);
  
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState("14");
  const [cloudBackupEnabled, setCloudBackupEnabled] = useState(true);
  
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"],
  });
  
  const updateSettings = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    }
  });
  
  const syncNow = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/sync", {});
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync complete",
        description: "Your data has been synced to the cloud"
      });
    },
    onError: () => {
      toast({
        title: "Sync failed",
        description: "Failed to sync data to the cloud",
        variant: "destructive"
      });
    }
  });
  
  // Initialize state from settings
  useEffect(() => {
    if (settings) {
      setRemindersEnabled(settings.reminder_enabled);
      setReminderFrequency(String(settings.reminder_frequency));
      setCloudBackupEnabled(settings.cloud_backup_enabled);
    }
  }, [settings]);
  
  const navigateBack = () => {
    setLocation("/");
  };
  
  const handleReminderToggle = (checked: boolean) => {
    setRemindersEnabled(checked);
    updateSettings.mutate({ reminder_enabled: checked });
  };
  
  const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setReminderFrequency(value);
  };
  
  const handleFrequencyBlur = () => {
    const frequency = parseInt(reminderFrequency);
    if (isNaN(frequency) || frequency < 1) {
      setReminderFrequency("1");
      updateSettings.mutate({ reminder_frequency: 1 });
    } else if (frequency > 90) {
      setReminderFrequency("90");
      updateSettings.mutate({ reminder_frequency: 90 });
    } else {
      updateSettings.mutate({ reminder_frequency: frequency });
    }
  };
  
  const handleCloudBackupToggle = (checked: boolean) => {
    setCloudBackupEnabled(checked);
    updateSettings.mutate({ cloud_backup_enabled: checked });
  };
  
  const handleSyncNow = () => {
    syncNow.mutate();
  };
  
  // Choose theme
  const setLightTheme = () => {
    setTheme("light");
    updateSettings.mutate({ theme: "light" });
  };
  
  const setDarkTheme = () => {
    setTheme("dark");
    updateSettings.mutate({ theme: "dark" });
  };
  
  const setSystemTheme = () => {
    setTheme("system");
    updateSettings.mutate({ theme: "system" });
  };
  
  // Check if user completed setup
  if (!setupComplete) {
    setLocation("/setup");
    return null;
  }

  return (
    <MainLayout>
      <header className="px-6 py-4 bg-card shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2" 
            onClick={navigateBack}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-medium">Settings</h1>
        </div>
      </header>
      
      <section className="px-6 py-4">
        {/* Notification Settings */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Notifications</h2>
          <Card>
            <CardContent className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Enable Reminders</h3>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when it's time to contact someone
                  </p>
                </div>
                <Switch 
                  checked={remindersEnabled}
                  onCheckedChange={handleReminderToggle}
                  disabled={settingsLoading || updateSettings.isPending}
                />
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Default Reminder Frequency</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Remind me if I haven't contacted someone in:
                </p>
                <div className="flex items-center">
                  <Input 
                    type="number"
                    value={reminderFrequency}
                    onChange={handleFrequencyChange}
                    onBlur={handleFrequencyBlur}
                    min="1"
                    max="90"
                    className="w-16 mr-2"
                    disabled={settingsLoading || updateSettings.isPending}
                  />
                  <span className="text-sm">days</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sync Settings */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Data & Sync</h2>
          <Card>
            <CardContent className="py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Cloud Backup</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup your data to the cloud
                  </p>
                </div>
                <Switch 
                  checked={cloudBackupEnabled}
                  onCheckedChange={handleCloudBackupToggle}
                  disabled={settingsLoading || updateSettings.isPending}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Auto-Sync</h3>
                  <p className="text-sm text-muted-foreground">
                    Sync frequency: Daily at 2 AM
                  </p>
                </div>
                <Button 
                  onClick={handleSyncNow}
                  disabled={syncNow.isPending || !cloudBackupEnabled}
                >
                  {syncNow.isPending ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Appearance Settings */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Appearance</h2>
          <Card>
            <CardContent className="py-4">
              <h3 className="font-medium mb-2">Theme</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center">
                  <button 
                    className={`w-16 h-16 rounded-lg mb-2 bg-[#F5F5F5] border-2 ${theme === 'light' ? 'border-primary' : 'border-transparent hover:border-muted-foreground'}`}
                    onClick={setLightTheme}
                  >
                    <div className="h-full rounded-md overflow-hidden">
                      <div className="h-1/4 bg-primary"></div>
                      <div className="h-3/4 bg-white"></div>
                    </div>
                  </button>
                  <span className="text-xs">Light</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <button 
                    className={`w-16 h-16 rounded-lg mb-2 bg-[#121212] border-2 ${theme === 'dark' ? 'border-primary' : 'border-transparent hover:border-muted-foreground'}`}
                    onClick={setDarkTheme}
                  >
                    <div className="h-full rounded-md overflow-hidden">
                      <div className="h-1/4 bg-primary"></div>
                      <div className="h-3/4 bg-gray-800"></div>
                    </div>
                  </button>
                  <span className="text-xs">Dark</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <button 
                    className={`w-16 h-16 rounded-lg mb-2 border-2 ${theme === 'system' ? 'border-primary' : 'border-transparent hover:border-muted-foreground'} overflow-hidden`}
                    onClick={setSystemTheme}
                  >
                    <div className="h-full flex">
                      <div className="w-1/2">
                        <div className="h-1/4 bg-primary"></div>
                        <div className="h-3/4 bg-white"></div>
                      </div>
                      <div className="w-1/2">
                        <div className="h-1/4 bg-primary"></div>
                        <div className="h-3/4 bg-gray-800"></div>
                      </div>
                    </div>
                  </button>
                  <span className="text-xs">System</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* About Section */}
        <div>
          <h2 className="text-lg font-medium mb-3">About</h2>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm mb-2">Contact Reminder App v1.0.0</p>
              <p className="text-xs text-muted-foreground">
                This app helps introverted users stay connected with friends and family by providing timely reminders and conversation starters.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}
