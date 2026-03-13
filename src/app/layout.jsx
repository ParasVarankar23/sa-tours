import "./globals.css";
import ClientLayout from "./ClientLayout";
export const metadata = {
  title: "Travelr",
  description: "Travel landing page built with Next.js and Tailwind CSS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}