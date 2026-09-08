import { SiteHeader } from "@/components/marketing/site-header";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ExampleOffers } from "@/components/marketing/example-offers";
import { CompanyCta, SiteFooter } from "@/components/marketing/company-cta";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <ExampleOffers />
        <CompanyCta />
      </main>
      <SiteFooter />
    </>
  );
}
