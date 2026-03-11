"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Layout } from '@/components/Layout';
import { ComicCard, ComicButton, SectionTitle } from '@/components/ComicUI';
import { useCreateTeam } from '@/hooks/use-teams';
import { useToast } from '@/hooks/use-toast';
import { insertTeamSchema } from '@/db/schema';
import { Plus, Trash2, Users } from 'lucide-react';
import { z } from 'zod';

const formSchema = insertTeamSchema.extend({
  members: z.array(z.string().min(1, "Member name cannot be empty")).min(1, "At least one member is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate: createTeam, isPending } = useCreateTeam();
  const [labs, setLabs] = React.useState<Array<{ id: string; name: string }>>([]);
  const [labsLoading, setLabsLoading] = React.useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      domain: 'Agentic AI',
      problemStatement: '',
      lab: '',
      githubRepo: '',
      figmaLink: '',
      members: [''],
    }
  });

  const selectedDomain = form.watch('domain');

  React.useEffect(() => {
    const fetchLabs = async () => {
      setLabsLoading(true);
      try {
        const res = await fetch(`/api/labs?type=lab&domain=${encodeURIComponent(selectedDomain)}`);
        const data = await res.json();
        const labList = data.map((lab: { id: string; name: string }) => ({
          id: lab.name,
          name: lab.name,
        }));
        setLabs(labList);
        if (labList.length > 0) {
          form.setValue('lab', labList[0].id);
        } else {
          form.setValue('lab', '');
        }
      } catch {
        setLabs([]);
      } finally {
        setLabsLoading(false);
      }
    };
    fetchLabs();
  }, [selectedDomain, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "members" as never,
  });

  const onSubmit = (data: FormValues) => {
    data.members = data.members.filter((m: string) => m.trim() !== '');

    createTeam(data, {
      onSuccess: () => {
        toast({
          title: "BATTLE JOINED!",
          description: "Your team has successfully registered. Prepare for judgment.",
          variant: "default",
        });
        router.push('/');
      },
      onError: (err) => {
        toast({
          title: "FATAL ERROR",
          description: err.message,
          variant: "destructive",
        });
      }
    });
  };

  const inputClass = "w-full comic-border p-3 md:p-4 text-base md:text-xl font-heading bg-gray-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#ff1a1a]/20 transition-all";
  const labelClass = "block font-display text-lg md:text-2xl mb-2 uppercase";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-8 md:mb-12">
          <SectionTitle>TEAM CHECK-IN PANEL</SectionTitle>
        </div>

        <ComicCard className="bg-white">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
              <div>
                <label className={labelClass}>Team Name <span className="text-[#ff1a1a]">*</span></label>
                <input {...form.register('name')} className={inputClass} placeholder="e.g. Cyber Ninjas" />
                {form.formState.errors.name && <span className="text-[#ff1a1a] font-bold font-body">{form.formState.errors.name.message}</span>}
              </div>

              <div>
                <label className={labelClass}>Battle Domain <span className="text-[#ff1a1a]">*</span></label>
                <select {...form.register('domain')} className={inputClass}>
                  <option value="Agentic AI">Agentic AI</option>
                  <option value="Vibecoding">Vibecoding</option>
                  <option value="UI/UX Challenge">UI/UX Challenge</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Assigned Lab <span className="text-[#ff1a1a]">*</span></label>
                <select {...form.register('lab')} className={inputClass} disabled={labsLoading}>
                  {labsLoading ? (
                    <option value="">Loading labs...</option>
                  ) : labs.length === 0 ? (
                    <option value="">No labs available</option>
                  ) : (
                    labs.map(lab => (
                      <option key={lab.id} value={lab.id}>{lab.name}</option>
                    ))
                  )}
                </select>
                {form.formState.errors.lab && <span className="text-[#ff1a1a] font-bold font-body">{form.formState.errors.lab.message}</span>}
              </div>

              <div>
                <label className={labelClass}>
                  {form.watch('domain') === 'UI/UX Challenge' ? 'Figma Prototype Link' : 'GitHub Repo'} <span className="text-[#ff1a1a]">*</span>
                </label>
                <input
                  {...form.register('githubRepo')}
                  className={inputClass}
                  placeholder={form.watch('domain') === 'UI/UX Challenge' ? "https://figma.com/..." : "https://github.com/..."}
                />
                {form.formState.errors.githubRepo && <span className="text-[#ff1a1a] font-bold font-body">{form.formState.errors.githubRepo.message}</span>}
              </div>
            </div>

            <div>
              <label className={labelClass}>Problem Statement <span className="text-[#ff1a1a]">*</span></label>
              <textarea
                {...form.register('problemStatement')}
                className={`${inputClass} min-h-[120px] resize-y`}
                placeholder="What world-ending problem does your tech solve?"
              />
              {form.formState.errors.problemStatement && <span className="text-[#ff1a1a] font-bold font-body">{form.formState.errors.problemStatement.message}</span>}
            </div>

            <div className="p-4 md:p-6 border-4 border-black bg-gray-100 rounded-xl relative">
              <div className="absolute -top-6 -left-2 md:-left-4 bg-[#ff1a1a] comic-border text-white px-3 md:px-4 py-1 font-display text-lg md:text-2xl rotate-[-5deg]">
                TEAM MEMBERS
              </div>

              <div className="space-y-4 mt-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 md:gap-4 items-center">
                    <div className="flex-1 relative">
                      <Users className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        {...form.register(`members.${index}` as const)}
                        className={`${inputClass} pl-10 md:pl-12`}
                        placeholder={`Member ${index + 1} Name`}
                      />
                    </div>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="bg-black text-white p-3 md:p-4 comic-border hover:bg-[#ff1a1a] transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {fields.length < 3 ? (
                <button
                  type="button"
                  onClick={() => append("")}
                  className="mt-6 font-heading text-xl flex items-center gap-2 hover:text-[#ff1a1a] transition-colors"
                >
                  <Plus size={24} /> ADD MEMBER
                </button>
              ) : (
                <p className="mt-6 font-heading text-lg text-gray-500 italic">
                  MAX MEMBERS REACHED (3/3)
                </p>
              )}
            </div>

            <div className="pt-8 text-center">
              <ComicButton type="submit" size="lg" disabled={isPending} className="w-full md:w-auto">
                {isPending ? 'TRANSMITTING...' : 'INITIALIZE TEAM'}
              </ComicButton>
            </div>
          </form>
        </ComicCard>
      </div>
    </Layout>
  );
}
