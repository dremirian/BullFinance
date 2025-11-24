import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { Footer } from "@/components/Footer";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background flex-col">
        <div className="flex flex-1">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="fixed top-4 right-4 z-50">
              <NotificationCenter />
            </div>
            <div className="container mx-auto p-6 space-y-6">
              {children}
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </SidebarProvider>
  );
}
