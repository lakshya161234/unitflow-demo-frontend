import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { FactoryProvider } from "@/lib/factoryContext";

export default function ERPLayout({ children }) {
  return (
    <FactoryProvider>
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <main className="flex-1 bg-gray-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </FactoryProvider>
  );
}
