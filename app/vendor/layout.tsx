import React from 'react';
import VendorShell from '@/components/vendor/VendorShell';

export const metadata = {
  title: 'Vendor Portal | Blackrock Esports',
  description: 'Blackrock Esports Tournament Host & Vendor Operations Portal',
};

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <VendorShell>{children}</VendorShell>;
}
