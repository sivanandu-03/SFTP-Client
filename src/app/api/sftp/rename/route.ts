import { NextResponse } from 'next/server';
import { sftpManager, securePath } from '@/lib/sftp';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { fromPath, toPath } = body;

    if (!fromPath || !toPath) {
      return NextResponse.json({ error: 'fromPath and toPath are required' }, { status: 400 });
    }

    const safeFrom = securePath('/', fromPath);
    const safeTo = securePath('/', toPath);

    if (!safeFrom || !safeTo) {
      return NextResponse.json({ error: 'Invalid paths' }, { status: 400 });
    }

    const sftp = await sftpManager.getSftp();

    await new Promise<void>((resolve, reject) => {
      sftp.rename(safeFrom, safeTo, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    return NextResponse.json({
      message: 'Resource renamed successfully',
      fromPath: safeFrom,
      toPath: safeTo
    });

  } catch (error: any) {
    console.error('Rename error:', error);
    if (error.code === 2 || error.message?.includes('No such file')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (error.code === 3 || error.message?.includes('Permission denied')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
