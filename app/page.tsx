import { Header } from "@/components/header"
import { HeroSlider } from "@/components/hero-slider"
import { FullDaySection } from "@/components/full-day-section"
import { AboutSection } from "@/components/about-section"
import { StudentGroupSection } from "@/components/student-group-section"
import { TopicsSection } from "@/components/topics-section"
import { TeamSection } from "@/components/team-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSlider />
      <FullDaySection />
      <AboutSection />
      <StudentGroupSection />
      <TopicsSection />
      <TeamSection />
        {/* <ContactSection /> */}
      <Footer />
    </main>
  )
}
