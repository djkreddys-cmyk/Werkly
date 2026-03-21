import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ResumeBuilder } from "@/components/resume-builder-v2";

export default function ResumeBuilderPage() {
  return (
    <div className="relative">
      <SiteHeader />
      <main className="pt-[76px]">
        <ResumeBuilder />
      </main>
      <SiteFooter />
    </div>
  );
}
