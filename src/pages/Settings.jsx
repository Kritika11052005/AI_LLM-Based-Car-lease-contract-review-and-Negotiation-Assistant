
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [currency, setCurrency] = useState('inr');
    const [fullName, setFullName] = useState('');
    const [message, setMessage] = useState(null);

    useEffect(() => {
        getProfile();
    }, []);

    const getProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                setFullName(user.user_metadata?.full_name || '');
                
                // Load user preferences from local storage or database
                const savedPrefs = localStorage.getItem('userPreferences');
                if (savedPrefs) {
                    const prefs = JSON.parse(savedPrefs);
                    setNotifications(prefs.notifications ?? true);
                    setDarkMode(prefs.darkMode ?? false);
                    setCurrency(prefs.currency ?? 'inr');
                }
            }
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage(null);
        
        try {
            // Update user metadata
            const { error: updateError } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            if (updateError) throw updateError;

            // Save preferences to local storage
            const preferences = {
                notifications,
                darkMode,
                currency
            };
            localStorage.setItem('userPreferences', JSON.stringify(preferences));

            // Apply dark mode if enabled
            if (darkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }

            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            
            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!user?.email) return;
        
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            alert('Password reset email sent! Please check your inbox.');
        } catch (error) {
            console.error('Error sending password reset:', error);
            alert('Failed to send password reset email. Please try again.');
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }


    return (
        <div className="max-w-2xl space-y-8">
            {/* Success/Error Message */}
            {message && (
                <Card className={message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                    <CardContent className="p-4">
                        <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                            {message.text}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Account */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input 
                            id="name" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            type="email" 
                            value={user?.email || ""} 
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="flex gap-2">
                            <Input id="password" type="password" value="••••••••" disabled className="bg-muted" />
                            <Button variant="outline" onClick={handlePasswordReset}>Reset</Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Click Reset to receive a password reset email</p>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            {/* Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Dark Mode</p>
                            <p className="text-xs text-muted-foreground">Toggle dark/light theme</p>
                        </div>
                        <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Currency</p>
                            <p className="text-xs text-muted-foreground">Default currency for prices</p>
                        </div>
                        <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="inr">INR (₹)</SelectItem>
                                <SelectItem value="usd">USD ($)</SelectItem>
                                <SelectItem value="eur">EUR (€)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Notifications</p>
                            <p className="text-xs text-muted-foreground">Email notifications for analysis results</p>
                        </div>
                        <Switch checked={notifications} onCheckedChange={setNotifications} />
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-center">
                <Button 
                    onClick={handleSaveProfile} 
                    disabled={saving}
                    className="min-w-[200px]"
                >
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save Changes'
                    )}
                </Button>
            </div>

            <Separator />

            {/* Sign Out */}
            <div className="flex justify-center">
                <Button variant="destructive" onClick={handleSignOut}>
                    Sign Out
                </Button>
            </div>
        </div>
    );
}
