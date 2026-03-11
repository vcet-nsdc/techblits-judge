"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layout } from '@/components/Layout';
import { ComicCard, ComicButton, SpeechBubble } from '@/components/ComicUI';
import { useJudgeLogin, getJudgeId, isSeminarHallJudge } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { ShieldAlert } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function JudgePortal() {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate: login, isPending } = useJudgeLogin();

  React.useEffect(() => {
    if (getJudgeId()) {
      router.push(isSeminarHallJudge() ? '/judge/seminar-hall' : '/judge/dashboard');
    }
  }, [router]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' }
  });

  const onSubmit = (data: LoginForm) => {
    login(data, {
      onSuccess: (result) => {
        toast({ title: "ACCESS GRANTED", description: "Welcome to the inner sanctum." });
        const dest = result.isSeminarHallJudge ? '/judge/seminar-hall' : '/judge/dashboard';
        router.push(dest);
      },
      onError: (err) => {
        toast({ title: "ACCESS DENIED", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          
          <div className="flex-1 relative hidden md:block">
            <div className="absolute top-10 -right-10 z-20">
              <SpeechBubble className="rotate-[5deg]">Identify yourself, overseer.</SpeechBubble>
            </div>
            <div className="comic-border p-2 bg-white rotate-[-2deg]">
              <div className="w-full h-48 md:h-64 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
                <span className="font-display text-4xl text-white drop-shadow-[2px_2px_0_#ff1a1a]">THE ELDERS</span>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full">
            <ComicCard className="bg-[#ff1a1a] p-2" hoverEffect={false}>
              <div className="bg-white p-5 md:p-8 comic-border h-full flex flex-col justify-center">
                <h2 className="font-display text-3xl md:text-5xl mb-2 flex items-center gap-3 md:gap-4">
                  <ShieldAlert className="text-[#ff1a1a] shrink-0" size={32} /> RESTRICTED AREA
                </h2>
                <p className="font-body text-base md:text-xl text-gray-600 font-bold mb-6 md:mb-8 uppercase">Elders & Judges Only</p>
                
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="block font-heading text-lg md:text-2xl mb-2">IDENTIFICATION (Username)</label>
                    <input 
                      {...form.register('username')} 
                      className="w-full comic-border p-3 md:p-4 text-lg md:text-2xl font-body bg-gray-50 focus:bg-yellow-50 focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block font-heading text-lg md:text-2xl mb-2">PASSPHRASE (Password)</label>
                    <input 
                      type="password"
                      {...form.register('password')} 
                      className="w-full comic-border p-3 md:p-4 text-lg md:text-2xl font-body bg-gray-50 focus:bg-yellow-50 focus:outline-none" 
                    />
                  </div>
                  
                  <ComicButton type="submit" className="w-full mt-4" disabled={isPending}>
                    {isPending ? 'VERIFYING...' : 'AUTHORIZE'}
                  </ComicButton>
                </form>
              </div>
            </ComicCard>
          </div>
          
        </div>
      </div>
    </Layout>
  );
}
