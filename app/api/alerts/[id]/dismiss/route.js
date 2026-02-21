import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Alert from '@/models/Alert';

// PUT /api/alerts/[id]/dismiss — Dismiss an alert
export async function PUT(request, { params }) {
    try {
        await dbConnect();

        const { id } = await params;

        const alert = await Alert.findByIdAndUpdate(
            id,
            { isDismissed: true },
            { new: true }
        );

        if (!alert) {
            return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }

        return NextResponse.json(alert);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
