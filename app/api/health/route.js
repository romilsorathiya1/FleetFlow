import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET /api/health — Health check endpoint
export async function GET() {
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };

    return NextResponse.json({
        status: 'ok',
        db: dbStatusMap[dbState] || 'unknown',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        env: process.env.NODE_ENV || 'development',
    });
}
