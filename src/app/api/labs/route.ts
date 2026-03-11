import { NextRequest, NextResponse } from 'next/server';
import { Lab } from '@/models/Lab';
import { connectDB } from '@/lib/mongodb';
import { VenueType } from '@/types/competition';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'lab' | 'seminar_hall' | null (all)
  const domain = searchParams.get('domain'); // filter by assigned domain

  try {
    await connectDB();

    const query: Record<string, unknown> = { isActive: true };
    if (type === 'seminar_hall') query.type = VenueType.SEMINAR_HALL;
    else if (type === 'lab') query.type = VenueType.LAB;
    if (domain) query.assignedDomain = domain;

    const labs = await Lab.find(query).sort({ name: 1 });

    return NextResponse.json(
      labs.map(lab => ({
        id: lab._id,
        name: lab.name,
        location: lab.location,
        type: lab.type,
        capacity: lab.capacity,
        assignedDomain: lab.assignedDomain
      }))
    );
  } catch (error) {
    console.warn('MongoDB unavailable for labs, using fallback:', error);

    // Fallback to predefined labs from system design
    const fallbackLabs = [
      { id: '114A', name: '114A', location: 'Room 114A', type: VenueType.LAB, capacity: 50, assignedDomain: 'Agentic AI' },
      { id: '114B', name: '114B', location: 'Room 114B', type: VenueType.LAB, capacity: 50, assignedDomain: 'Agentic AI' },
      { id: '308A', name: '308A', location: 'Room 308A', type: VenueType.LAB, capacity: 50, assignedDomain: 'UI/UX Challenge' },
      { id: '308B', name: '308B', location: 'Room 308B', type: VenueType.LAB, capacity: 50, assignedDomain: 'UI/UX Challenge' },
      { id: '220', name: '220', location: 'Room 220', type: VenueType.LAB, capacity: 50, assignedDomain: 'Vibecoding' },
      { id: '221', name: '221', location: 'Room 221', type: VenueType.LAB, capacity: 50, assignedDomain: 'Vibecoding' },
      { id: '222', name: '222', location: 'Room 222', type: VenueType.LAB, capacity: 50, assignedDomain: 'Vibecoding' },
      { id: 'seminar-hall', name: 'Seminar Hall', location: 'Main Seminar Hall', type: VenueType.SEMINAR_HALL, capacity: 200, assignedDomain: null }
    ];

    const filtered = fallbackLabs.filter((lab) => {
      const matchesType = type === 'seminar_hall'
        ? lab.type === VenueType.SEMINAR_HALL
        : type === 'lab'
          ? lab.type === VenueType.LAB
          : true;

      const matchesDomain = domain
        ? lab.assignedDomain === domain
        : true;

      return matchesType && matchesDomain;
    });

    return NextResponse.json(filtered);
  }
}
