import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Authentication
    const sessionId = request.cookies.get('admin_session')?.value;
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sessionData } = await supabaseAdmin
      .from('AdminSession')
      .select('userId')
      .eq('id', sessionId)
      .single();

    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Buckets
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketError || !buckets) {
      return NextResponse.json({ error: 'Failed to fetch buckets' }, { status: 500 });
    }

    // 3. For each bucket, fetch files to calculate stats (limit to 1000 for safety, could be paginated in a real large system but enough for this scope)
    const bucketStats = await Promise.all(
      buckets.map(async (bucket) => {
        const { data: files, error: fileError } = await supabaseAdmin.storage.from(bucket.name).list('', {
          limit: 5000,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

        if (fileError || !files) {
          return {
            id: bucket.id,
            name: bucket.name,
            public: bucket.public,
            fileCount: 0,
            totalSizeInBytes: 0,
            error: true
          };
        }

        // Filter out folders (which usually have an empty name or just metadata)
        const validFiles = files.filter(f => f.id);
        const totalSize = validFiles.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);

        return {
          id: bucket.id,
          name: bucket.name,
          public: bucket.public,
          fileCount: validFiles.length,
          totalSizeInBytes: totalSize,
          error: false
        };
      })
    );

    const totalFiles = bucketStats.reduce((sum, b) => sum + b.fileCount, 0);
    const totalBytes = bucketStats.reduce((sum, b) => sum + b.totalSizeInBytes, 0);

    return NextResponse.json({
      success: true,
      metrics: {
        timestamp: new Date().toISOString(),
        buckets: bucketStats,
        summary: {
          totalFiles,
          totalBytes,
          totalMb: (totalBytes / (1024 * 1024)).toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Storage API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
