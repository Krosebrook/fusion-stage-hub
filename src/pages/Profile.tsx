import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, Loader2, User } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { profile, isLoading, isSaving, updateProfile, uploadAvatar } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fullName, setFullName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [preferences, setPreferences] = useState({
    theme: "dark",
    notifications: true,
    emailDigest: "daily",
  });

  // Initialize form when profile loads
  useState(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      if (profile.preferences) {
        setPreferences({
          theme: profile.preferences.theme || "dark",
          notifications: profile.preferences.notifications ?? true,
          emailDigest: profile.preferences.emailDigest || "daily",
        });
      }
    }
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    setIsUploading(true);
    await uploadAvatar(file);
    setIsUploading(false);
  };

  const handleSaveProfile = async () => {
    await updateProfile({
      full_name: fullName,
      preferences: preferences as any,
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal details and avatar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="font-medium">{profile?.full_name || "Set your name"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <Separator />

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Display Name</Label>
              <Input
                id="fullName"
                value={fullName || profile?.full_name || ""}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Customize your experience and notification settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Select your preferred color theme.
                </p>
              </div>
              <Select
                value={preferences.theme}
                onValueChange={(value) =>
                  setPreferences((p) => ({ ...p, theme: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for approvals and alerts.
                </p>
              </div>
              <Switch
                checked={preferences.notifications}
                onCheckedChange={(checked) =>
                  setPreferences((p) => ({ ...p, notifications: checked }))
                }
              />
            </div>

            <Separator />

            {/* Email Digest */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Digest</Label>
                <p className="text-sm text-muted-foreground">
                  How often to receive summary emails.
                </p>
              </div>
              <Select
                value={preferences.emailDigest}
                onValueChange={(value) =>
                  setPreferences((p) => ({ ...p, emailDigest: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            variant="glow" 
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
