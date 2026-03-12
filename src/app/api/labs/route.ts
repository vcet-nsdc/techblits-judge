import { NextRequest, NextResponse } from 'next/server';
import { Lab } from '@/models/Lab';
import { Domain } from '@/models/Domain';
import mongoose from 'mongoose';
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
    if (domain) {
      if (/^[0-9a-fA-F]{24}$/.test(domain)) {
        query.assignedDomain = new mongoose.Types.ObjectId(domain);
      } else {
        const dom = await Domain.findOne({ name: domain }).lean();
        if (dom?._id) {
          query.assignedDomain = dom._id;
        } else {
          // If domain name not found, return empty list
          return NextResponse.json({ labs: [] });
        }
      }
    }

    const labs = await Lab.find(query).sort({ name: 1 });

    return NextResponse.json({
      labs: labs.map(lab => ({
        _id: lab._id,
        id: lab._id,
        name: lab.name,
        location: lab.location,
        type: lab.type,
        capacity: lab.capacity,
        assignedDomain: lab.assignedDomain
      }))
    });
  } catch (error) {
    console.warn('MongoDB unavailable for labs, using fallback:', error);

    // Fallback to predefined labs from system design
    const fallbackLabs = [
      { _id: '114A', id: '114A', name: '114A', location: 'Room 114A', type: VenueType.LAB, capacity: 50, assignedDomain: 'Agentic AI' },
      { _id: '114B', id: '114B', name: '114B', location: 'Room 114B', type: VenueType.LAB, capacity: 50, assignedDomain: 'Agentic AI' },
      { _id: '308A', id: '308A', name: '308A', location: 'Room 308A', type: VenueType.LAB, capacity: 50, assignedDomain: 'UI/UX Challenge' },
      { _id: '308B', id: '308B', name: '308B', location: 'Room 308B', type: VenueType.LAB, capacity: 50, assignedDomain: 'UI/UX Challenge' },
      { _id: '220', id: '220', name: '220', location: 'Room 220', type: VenueType.LAB, capacity: 50, assignedDomain: 'Vibecoding' },
      { _id: '221', id: '221', name: '221', location: 'Room 221', type: VenueType.LAB, capacity: 50, assignedDomain: 'Vibecoding' },
      { _id: '222', id: '222', name: '222', location: 'Room 222', type: VenueType.LAB, capacity: 50, assignedDomain: 'Vibecoding' },
      { _id: 'seminar-hall', id: 'seminar-hall', name: 'Seminar Hall', location: 'Main Seminar Hall', type: VenueType.SEMINAR_HALL, capacity: 200, assignedDomain: null }
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

    return NextResponse.json({ labs: filtered });
  }
}
