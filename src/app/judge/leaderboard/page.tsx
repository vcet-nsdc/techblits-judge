"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';

export default function Leaderboard() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/leaderboard');
  }, [router]);

  return (
    <Layout>
      <div className="text-center py-16 md:py-24 font-display text-3xl md:text-5xl">REDIRECTING TO LIVE LEADERBOARD...</div>
    </Layout>
  );
}
