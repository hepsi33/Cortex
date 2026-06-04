'use server';

import { after } from 'next/server';
import { db } from '@/lib/db';
import { documents, profiles, uploadChunks } from '@/drizzle/schema';
import { auth } from '@/lib/auth';
import { eq, lt } from 'drizzle-orm';
import { processUpload, processUrl } from '@/lib/processor';

const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function uploadDocumentAction(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const userId = session.user.id;
        const workspaceId = formData.get('workspaceId') as string;
        const file = formData.get('file') as File;
        const url = formData.get('url') as string;

        // Ensure user exists
        const userExists = await db.query.profiles.findFirst({
            where: eq(profiles.id, userId as any)
        });

        if (!userExists) {
            await db.insert(profiles).values({
                id: userId as any,
                name: session.user.name || "Guest",
                email: session.user.email || `${userId}@guest.cortex`,
                password: "guest_no_password",
                role: "user",
                status: "approved"
            }).onConflictDoNothing();
        }

        const { getUserSubscriptionPlan } = await import('@/lib/subscription');
        const subscription = await getUserSubscriptionPlan();

        if (subscription && !subscription.isPremium) {
            const { count } = await import('drizzle-orm');
            const totalDocsResult = await db
                .select({ value: count() })
                .from(documents)
                .where(eq(documents.userId, userId as any));
            
            const totalDocs = totalDocsResult[0]?.value || 0;
            
            if (totalDocs >= subscription.limits.MAX_UPLOADS) {
                return { success: false, error: 'Limit Reached' };
            }
        }

        let docId = '';

        if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const [doc] = await db.insert(documents).values({
                userId: userId as any,
                workspaceId: workspaceId || null,
                name: file.name,
                content: '',
                fileType: file.type,
                status: 'indexing',
            }).returning();

            docId = doc.id;
            
            // Execute heavy parsing/embedding in the background instantly
            after(async () => {
                try {
                    await processUpload(docId, buffer, file.type, file.name);
                } catch (err) {
                    console.error("Background processing failed:", err);
                }
            });
        } else if (url) {
            const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
            const [doc] = await db.insert(documents).values({
                userId: userId as any,
                workspaceId: workspaceId || null,
                name: url,
                content: '',
                fileType: isYoutube ? 'youtube' : 'url',
                status: 'indexing',
            }).returning();

            docId = doc.id;
            
            // Execute heavy URL scraping/embedding in the background instantly
            after(async () => {
                try {
                    await processUrl(docId, url);
                } catch (err) {
                    console.error("Background URL processing failed:", err);
                }
            });
        } else {
            throw new Error('No file or URL provided');
        }

        return { success: true, id: docId };

    } catch (error: any) {
        console.error('Upload action error:', error);
        return { success: false, error: error.message };
    }
}

export async function uploadChunkAction(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const uploadId = formData.get('uploadId') as string;
        const chunkIndex = parseInt(formData.get('chunkIndex') as string);
        const totalChunks = parseInt(formData.get('totalChunks') as string);
        const data = formData.get('data') as string;

        if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || !data) {
            throw new Error('Invalid chunk data');
        }

        // Clean up old chunks periodically (e.g. older than 2 hours)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        db.delete(uploadChunks)
            .where(lt(uploadChunks.createdAt, twoHoursAgo))
            .catch(err => console.error("Failed to clean up old upload chunks:", err));

        // Insert current chunk
        await db.insert(uploadChunks).values({
            uploadId,
            chunkIndex,
            totalChunks,
            data
        });

        return { success: true };
    } catch (error: any) {
        console.error('Upload chunk error:', error);
        return { success: false, error: error.message };
    }
}

export async function assembleUploadAction(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('Unauthorized');

        const userId = session.user.id;
        const uploadId = formData.get('uploadId') as string;
        const fileName = formData.get('fileName') as string;
        const fileType = formData.get('fileType') as string;
        const workspaceId = formData.get('workspaceId') as string;

        if (!uploadId || !fileName || !fileType) {
            throw new Error('Invalid assembly parameters');
        }

        // Ensure user exists
        const userExists = await db.query.profiles.findFirst({
            where: eq(profiles.id, userId as any)
        });

        if (!userExists) {
            await db.insert(profiles).values({
                id: userId as any,
                name: session.user.name || "Guest",
                email: session.user.email || `${userId}@guest.cortex`,
                password: "guest_no_password",
                role: "user",
                status: "approved"
            }).onConflictDoNothing();
        }

        // Check subscription limits
        const { getUserSubscriptionPlan } = await import('@/lib/subscription');
        const subscription = await getUserSubscriptionPlan();

        if (subscription && !subscription.isPremium) {
            const { count } = await import('drizzle-orm');
            const totalDocsResult = await db
                .select({ value: count() })
                .from(documents)
                .where(eq(documents.userId, userId as any));
            
            const totalDocs = totalDocsResult[0]?.value || 0;
            
            if (totalDocs >= subscription.limits.MAX_UPLOADS) {
                return { success: false, error: 'Limit Reached' };
            }
        }

        // Fetch all chunks for this uploadId
        const chunks = await db.query.uploadChunks.findMany({
            where: eq(uploadChunks.uploadId, uploadId),
            orderBy: (uc, { asc }) => [asc(uc.chunkIndex)]
        });

        if (chunks.length === 0) {
            throw new Error('No chunks found for this upload');
        }

        const totalChunksExpected = chunks[0].totalChunks;
        if (chunks.length !== totalChunksExpected) {
            throw new Error(`Incomplete upload: received ${chunks.length} of ${totalChunksExpected} chunks`);
        }

        // Assemble chunks into a single Buffer
        const buffers = chunks.map(c => Buffer.from(c.data, 'base64'));
        const fullBuffer = Buffer.concat(buffers);

        // Delete chunks from DB (cleanup)
        await db.delete(uploadChunks).where(eq(uploadChunks.uploadId, uploadId));

        // Create document record
        const [doc] = await db.insert(documents).values({
            userId: userId as any,
            workspaceId: workspaceId || null,
            name: fileName,
            content: '',
            fileType: fileType,
            status: 'indexing',
        }).returning();

        const docId = doc.id;

        // Execute parsing and embedding in background
        after(async () => {
            try {
                await processUpload(docId, fullBuffer, fileType, fileName);
            } catch (err) {
                console.error("Background processing failed:", err);
            }
        });

        return { success: true, id: docId };

    } catch (error: any) {
        console.error('Assemble upload error:', error);
        return { success: false, error: error.message };
    }
}
