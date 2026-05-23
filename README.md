This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This is a secure browser-based SFTP file manager using Next.js, React, Node.js, and Docker. The application allows users to upload, download, preview, rename, and delete files from an SFTP server through a web interface. All SFTP operations are handled securely on the backend using Node.js and ssh2 libraries, while credentials are stored in environment variables. I implemented efficient file streaming for large file transfers to avoid memory overload and used React Suspense for smoother frontend loading states. The entire project was containerized using Docker Compose for easy deployment and testing.
