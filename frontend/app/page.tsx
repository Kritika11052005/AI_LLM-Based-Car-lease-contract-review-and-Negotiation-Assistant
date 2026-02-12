import { DashboardSidebar } from "@/components/dashboard/SideBar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Sidebar } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold text-foreground">
          AI Lease Negotiator
        </h1>
        <p className="text-muted-foreground">
          Theme toggle test - Click the switch below
        </p>
        <div className="flex justify-center">
          <ThemeToggle />
        </div>
        <div className="space-y-2">
          <div className="p-4 bg-card border border-border rounded-lg">
            <p className="text-card-foreground">Card Background</p>
          </div>
          <div className="p-4 bg-primary text-primary-foreground rounded-lg">
            <p>Primary Color</p>
          </div>
          <div className="p-4 bg-secondary text-secondary-foreground rounded-lg">
            <p>Secondary Color</p>
          </div>
          <div className="p-4 bg-secondary text-secondary-foreground rounded-lg">
            <DashboardSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}