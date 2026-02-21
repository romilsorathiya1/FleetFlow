import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

// Enable debug logging in development to verify index usage
if (process.env.NODE_ENV !== 'production') {
    mongoose.set('debug', (collectionName, method, query, doc) => {
        console.log(`[Mongoose] ${collectionName}.${method}`, JSON.stringify(query).slice(0, 200));
    });
}

async function dbConnect() {
    if (!MONGODB_URI) {
        throw new Error(
            'Please define the MONGODB_URI environment variable inside .env.local'
        );
    }

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then(async (mongoose) => {
            // Ensure all schema-defined indexes are created
            const models = mongoose.modelNames();
            await Promise.all(
                models.map((modelName) =>
                    mongoose.model(modelName).ensureIndexes().catch((err) => {
                        console.warn(`[MongoDB] Index creation warning for ${modelName}:`, err.message);
                    })
                )
            );
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[MongoDB] Connected with pool size 10. Indexes ensured for: ${models.join(', ') || 'no models loaded yet'}`);
            }
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
