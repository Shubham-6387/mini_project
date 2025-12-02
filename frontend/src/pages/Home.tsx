import { Hero } from "../components/Hero";
import { Benefits } from "../components/Benefits";
import { About } from "../components/About";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";

export default function Home() {
    return (
        <div className="relative min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 overflow-hidden">
            <AnimatedBackground />
            <Navigation />
            <Hero />
            <About />
            <Benefits />
            <Footer />
        </div>
    );
}
