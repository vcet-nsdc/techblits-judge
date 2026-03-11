"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { ComicCard, SectionTitle } from '@/components/ComicUI';
import { getJudgeId, isSeminarHallJudge } from '@/hooks/use-auth';
import { Map, Users, Target } from 'lucide-react';

export default function JudgeDashboard() {
  const router = useRouter();
  const [labs, setLabs] = React.useState<Array<{ id: string; name: string; color: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!getJudgeId()) {
      router.push('/judge-portal');
    } else if (isSeminarHallJudge()) {
      router.push('/judge/seminar-hall');
    }
  }, [router]);

  React.useEffect(() => {
    const fetchLabs = async () => {
      try {
        const response = await fetch('/api/labs');
        const data = await response.json();
        
        // Map labs to comic theme names and colors
        const labColors = ['!bg-white text-black', '!bg-black text-white', '!bg-white text-[#ff1a1a]', '!bg-black text-[#ff1a1a]', '!bg-[#ff1a1a] text-white'];
        const mappedLabs = data.map((lab: { name: string }, index: number) => ({
          id: lab.name,
          name: `SECTOR ${lab.name}`,
          color: labColors[index % labColors.length]
        }));
        
        setLabs(mappedLabs);
      } catch (error) {
        console.error('Failed to fetch labs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLabs();
  }, []);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4 md:gap-6">
          <div>
            <SectionTitle>SELECT BATTLEFIELD</SectionTitle>
            <p className="font-body text-lg md:text-2xl font-bold mt-4 bg-black text-white p-2 inline-block comic-border rotate-1">
              CHOOSE A LAB TO EVALUATE TEAMS
            </p>
          </div>

          <div className="h-32 w-40 comic-border -rotate-3 hidden md:flex bg-linear-to-br from-gray-900 to-black items-center justify-center rounded-lg">
            <span className="font-display text-2xl text-white drop-shadow-[2px_2px_0_#ff1a1a]">QUEST!</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <span className="font-display text-2xl md:text-3xl text-gray-500">LOADING SECTORS...</span>
            </div>
          ) : (
            labs.map((lab) => (
              <Link key={lab.id} href={`/judge/lab/${encodeURIComponent(lab.id)}`}>
                <ComicCard hoverEffect className={`cursor-pointer ${lab.color} h-full min-h-[160px] md:min-h-[200px] flex flex-col justify-between group overflow-hidden relative`}>
                  <div className="absolute -right-12 -top-12 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Target size={180} />
                  </div>
                  <div className="relative z-10">
                    <span className="font-heading text-xl bg-black text-white px-3 py-1 comic-border">
                      {lab.id}
                    </span>
                    <h2 className="font-display text-3xl sm:text-4xl md:text-6xl mt-4 drop-shadow-[2px_2px_0_#fff]">{lab.name}</h2>
                  </div>
                  <div className="flex justify-between items-center mt-6 md:mt-8 relative z-10 font-heading text-lg md:text-2xl bg-white text-black p-3 md:p-4 comic-border group-hover:bg-[#ff1a1a] group-hover:text-white transition-colors">
                    <span className="flex items-center gap-2"><Users /> View Teams</span>
                    <Map />
                  </div>
                </ComicCard>
              </Link>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
