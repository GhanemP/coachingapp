export async function GET() {
  return new Response('Socket.io server is running via custom server.js', { status: 200 });
}