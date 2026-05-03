'use server';

import { db } from '@/lib/db';
import { documents, profiles } from '@/drizzle/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
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
            // Await processing for stability on Vercel
            await processUpload(docId, buffer, file.type, file.name);
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
            // Await processing for stability on Vercel
            await processUrl(docId, url);
        } else {
            throw new Error('No file or URL provided');
        }

        return { success: true, id: docId };

    } catch (error: any) {
        console.error('Upload action error:', error);
        return { success: false, error: error.message };
    }
}
