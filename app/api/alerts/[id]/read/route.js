import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Alert from '@/models/Alert';

// PUT /api/alerts/[id]/read — Mark alert as read
export async function PUT(request, { params }) {
    try {
        await dbConnect();

        const { id } = await params;

        // Support marking all as read
        if (id === 'all') {
            await Alert.updateMany(
                { isRead: false, isDismissed: false },
                { $set: { isRead: true } }
            );
            return NextResponse.json({ success: true, message: 'All alerts marked as read' });
        }

        const alert = await Alert.findByIdAndUpdate(
            id,
            { isRead: true },
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
