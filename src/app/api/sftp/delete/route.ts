import { NextResponse } from 'next/server';
import { sftpManager, securePath } from '@/lib/sftp';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPath = searchParams.get('path');

  if (!rawPath) {
    return NextResponse.json({ error: 'path parameter is required' }, { status: 400 });
  }

  const safePath = securePath('/', rawPath);
  if (!safePath) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const sftp = await sftpManager.getSftp();

    const stats = await new Promise<any>((resolve, reject) => {
      sftp.stat(safePath, (err, stats) => {
        if (err) return reject(err);
        resolve(stats);
      });
    });

    if (stats.isDirectory()) {
      await new Promise<void>((resolve, reject) => {
        sftp.rmdir(safePath, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        sftp.unlink(safePath, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    }

    return NextResponse.json({
      message: 'Resource deleted successfully',
      path: safePath
    });

  } catch (error: any) {
    console.error('Delete error:', error);
    if (error.code === 2 || error.message?.includes('No such file')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (error.code === 3 || error.message?.includes('Permission denied')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
