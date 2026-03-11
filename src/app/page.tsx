import Link from "next/link";
import { Layout } from "@/components/Layout";
import { ComicButton, SpeechBubble } from "@/components/ComicUI";
import { Zap } from "lucide-react";

export default function Home() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 lg:py-24">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          
          <div className="space-y-6 md:space-y-8 relative z-10">
            <div className="hidden sm:block absolute -top-12 -left-8 -rotate-12">
              <SpeechBubble className="animate-bounce">A NEW CHALLENGER APPEARS!</SpeechBubble>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-display leading-none drop-shadow-[4px_4px_0_#ff1a1a]">
              THE ULTIMATE <br/>
              <span className="text-white drop-shadow-[4px_4px_0_#000]">HACKATHON</span><br/>
              ARENA
            </h1>
            
            <p className="font-body text-base sm:text-lg md:text-xl lg:text-2xl font-bold max-w-xl bg-white/80 p-3 md:p-4 comic-border inline-block">
              Register your team, build the impossible, and face the judgment of the elders. Only the strongest code survives.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-4 md:pt-8">
              <Link href="/register" className="inline-block">
                <ComicButton size="md" variant="primary">
                  <Zap className="mr-2 h-6 w-6 md:h-8 md:w-8" /> MARK ATTENDANCE
                </ComicButton>
              </Link>
              <Link href="/judge-portal" className="inline-block">
                <ComicButton size="md" variant="secondary">
                  JUDGE PORTAL
                </ComicButton>
              </Link>
            </div>
          </div>
          
          <div className="relative mt-8 md:mt-0">
            <div className="absolute inset-0 bg-[#ff1a1a] comic-border translate-x-2 translate-y-2 md:translate-x-4 md:translate-y-4 rounded-3xl"></div>
            <div className="relative z-10 w-full h-48 sm:h-56 md:h-80 comic-border rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#fff_10px,#fff_11px)]"></div>
              <span className="font-display text-4xl sm:text-5xl md:text-7xl text-white drop-shadow-[3px_3px_0_#ff1a1a] rotate-[-5deg]">HACK!!</span>
            </div>
            
            {/* Action text overlay */}
            <div className="absolute -bottom-4 -right-2 md:-bottom-8 md:-right-8 z-20 font-display text-4xl sm:text-5xl md:text-8xl text-[#ff1a1a] drop-shadow-[4px_4px_0_#000] rotate-[-15deg]">
              CRASH!!
            </div>
          </div>
          
        </div>
      </div>
    </Layout>
  );
}
