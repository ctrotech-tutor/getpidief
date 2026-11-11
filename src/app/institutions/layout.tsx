import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";

export default function InstitutionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Fixed Navigation Container */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navigation />
      </div>
      
      {/* Content with padding to account for fixed nav */}
      <div className="">
        {children}
      </div>
      
      <Footer />
    </div>
  );
}
