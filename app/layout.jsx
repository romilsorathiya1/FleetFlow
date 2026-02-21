import '@/styles/variables.css';
import '@/styles/globals.css';
import '@/styles/components.css';

export const metadata = {
  title: 'FleetFlow — Fleet Management System',
  description: 'AI-powered fleet operations management platform for tracking vehicles, trips, drivers, maintenance, and fuel logs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
