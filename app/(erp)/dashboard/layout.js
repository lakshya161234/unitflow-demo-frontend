import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { FactoryProvider } from "@/lib/factoryContext";

export default function DashboardLayout({ children }) {
  return (
    
      <div className="min-h-screen flex">
        
        <div className="flex-1 flex flex-col">
          
          <main className="flex-1 bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    
  );
}
