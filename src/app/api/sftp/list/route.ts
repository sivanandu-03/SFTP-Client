import { NextResponse } from 'next/server';
import { sftpManager, securePath } from '@/lib/sftp';

export async function GET(request: Request) {
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
    const list = await new Promise<any[]>((resolve, reject) => {
      sftp.readdir(safePath, (err, list) => {
        if (err) return reject(err);
        resolve(list);
      });
    });

    const formattedList = list.map((item) => {
      let typeStr = '-';
      if (item.attrs.isDirectory()) typeStr = 'd';
      else if (item.attrs.isSymbolicLink()) typeStr = 'l';

      const mode = item.attrs.mode;
      const parseRights = (modeBits: number) => {
        let r = '';
        r += (modeBits & 4) ? 'r' : '-';
        r += (modeBits & 2) ? 'w' : '-';
        r += (modeBits & 1) ? 'x' : '-';
        return r;
      };

      const user = parseRights(mode >> 6);
      const group = parseRights(mode >> 3);
      const other = parseRights(mode);

      return {
        name: item.filename,
        type: typeStr,
        size: item.attrs.size,
        modifyTime: item.attrs.mtime * 1000,
        rights: { user, group, other }
      };
    });

    return NextResponse.json(formattedList);
  } catch (error: any) {
    console.error('List error:', error);
    if (error.code === 2 || error.message?.includes('No such file')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (error.code === 3 || error.message?.includes('Permission denied')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
