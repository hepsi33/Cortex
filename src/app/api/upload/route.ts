import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents, profiles } from '@/drizzle/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

const isValidUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
 
 
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        if (!isValidUuid(userId)) {
            return NextResponse.json({ 
                error: 'Invalid Session', 
                details: 'Please log out and log in again as guest.' 
            }, { status: 400 });
        }

        // Ensure user exists in DB (for guests)
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

        const contentType = req.headers.get('content-type') || '';
        let docId = '';
        let workspaceId = '';

        const { processUpload, processUrl, processDocumentChunks } = await import('@/lib/processor');
        const { parsePdf, parseDocx, parsePptx, parseImage, parseText } = await import('@/lib/file-parsers');

        if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File;
            workspaceId = formData.get('workspaceId') as string;

            if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

            const buffer = Buffer.from(await file.arrayBuffer());
            const fileType = file.type;
            
            // 1. Parse Text IMMEDIATELY (Awaited)
            let textContent = '';
            switch (fileType) {
                case 'application/pdf': textContent = await parsePdf(buffer); break;
                case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': textContent = await parseDocx(buffer); break;
                case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': textContent = await parsePptx(buffer); break;
                case 'image/jpeg':
                case 'image/png':
                case 'image/gif':
                case 'image/webp': textContent = await parseImage(buffer, fileType); break;
                case 'text/plain':
                case 'text/markdown':
                case 'text/csv': textContent = await parseText(buffer); break;
                default: throw new Error(`Unsupported file type: ${fileType}`);
            }

            // 2. Insert into DB with content
            const [doc] = await db.insert(documents).values({
                userId: userId as any,
                workspaceId: workspaceId || null,
                name: file.name,
                content: textContent,
                fileType: fileType,
                status: 'indexing',
            }).returning();

            docId = doc.id;
            
            // 3. Process the heavy embedding (Awaited for stability)
            await processDocumentChunks(docId, textContent);

        } else {
            const body = await req.json();
            const { url } = body;
            workspaceId = body.workspaceId;

            if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });

            const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
            
            // For URLs, we create the doc first
            const [doc] = await db.insert(documents).values({
                userId: userId as any,
                workspaceId: workspaceId || null,
                name: url,
                content: '',
                fileType: isYoutube ? 'youtube' : 'url',
                status: 'indexing',
            }).returning();

            docId = doc.id;
            
            // 4. Await full processing
            await processUrl(docId, url);
        }

        return NextResponse.json({ id: docId, status: 'completed' }, { status: 200 });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error',
            details: error.message 
        }, { status: 500 });
    }
}
