import { NextResponse } from 'next/server';
import { sftpManager, securePath } from '@/lib/sftp';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return new Response('path parameter is required', { status: 400 });
  }

  const safePath = securePath('/', rawPath);
  if (!safePath) {
    return new Response('Invalid path', { status: 400 });
  }

  try {
    const sftp = await sftpManager.getSftp();
    
    // Get stats for file size
    const stats = await new Promise<any>((resolve, reject) => {
      sftp.stat(safePath, (err, stats) => {
        if (err) return reject(err);
        resolve(stats);
      });
    });

    if (!stats.isFile()) {
       return new Response('Not a file', { status: 400 });
    }

    const filename = path.basename(safePath);
    
    // Create read stream
    const readStream = sftp.createReadStream(safePath);
    
    // Listen for client aborts and cleanup
    request.signal.addEventListener('abort', () => {
      console.log('Client aborted download. Destroying SFTP stream.');
      readStream.destroy();
    });

    // Convert Node stream to Web stream
    const webStream = new ReadableStream({
      start(controller) {
        readStream.on('data', (chunk) => controller.enqueue(chunk));
        readStream.on('end', () => controller.close());
        readStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        console.log('Stream cancelled. Destroying SFTP stream.');
        readStream.destroy();
      }
    });

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
      }
    });

  } catch (error: any) {
    console.error('Download error:', error);
    if (error.code === 2 || error.message?.includes('No such file')) {
      return new Response('Not found', { status: 404 });
    }
    if (error.code === 3 || error.message?.includes('Permission denied')) {
      return new Response('Forbidden', { status: 403 });
    }
    return new Response('Internal server error', { status: 500 });
  }
}
