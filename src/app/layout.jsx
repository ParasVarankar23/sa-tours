import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: "SA Tours & Travels",
  description: "Reliable daily bus service and private bus booking",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}