import "./globals.css";
import { AuthProvider } from "@/lib/authContext";

export const metadata = {
  title: "UnitFlow ERP | Factory Operations",
  description: "A multi-factory manufacturing ERP demo for operations, inventory, sales, and accounting.",
  icons: { icon: "/unitflow-logo.svg", shortcut: "/unitflow-logo.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
