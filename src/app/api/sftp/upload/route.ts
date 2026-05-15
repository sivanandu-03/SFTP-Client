import { NextResponse } from 'next/server';
import { sftpManager, securePath } from '@/lib/sftp';
import busboy from 'busboy';
import path from 'path';
import { Readable } from 'stream';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }

    const sftp = await sftpManager.getSftp();
    
    // In Next 14 App Router, `request.body` is a ReadableStream. We can convert it to Node Readable stream:
    const reqStream = Readable.fromWeb(request.body as any);

    return new Promise((resolve, reject) => {
      const bb = busboy({ headers: { 'content-type': contentType }, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB limit
      let uploadPath = '';
      let fileStreamResolved = false;
      let finalFilePath = '';
      let limitReached = false;
      
      bb.on('field', (name, val) => {
        if (name === 'path') {
          uploadPath = val;
        }
      });

      bb.on('file', (name, file, info) => {
        const { filename } = info;
        
        if (!uploadPath) {
          file.resume();
          return;
        }
        
        const safeDir = securePath('/', uploadPath);
        if (!safeDir) {
           file.resume();
           return;
        }
        
        finalFilePath = path.join(safeDir, filename).replace(/\\/g, '/');

        const writeStream = sftp.createWriteStream(finalFilePath);
        
        file.on('limit', () => {
          limitReached = true;
          sftp.unlink(finalFilePath, () => {});
          resolve(NextResponse.json({ error: 'Payload Too Large' }, { status: 413 }));
        });

        file.pipe(writeStream);
        
        writeStream.on('close', () => {
          fileStreamResolved = true;
        });
        writeStream.on('error', (err) => {
          if (!limitReached) {
            console.error('SFTP Write Error:', err);
            resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
          }
        });
      });

      bb.on('close', () => {
        if (limitReached) return;
        
        if (finalFilePath) {
           setTimeout(() => {
              resolve(NextResponse.json({ message: 'File uploaded successfully', filePath: finalFilePath }, { status: 201 }));
           }, 100);
        } else {
           resolve(NextResponse.json({ error: 'No file found' }, { status: 400 }));
        }
      });

      reqStream.pipe(bb);
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
