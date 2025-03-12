import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
  
    // Set up Server-Sent Events headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
  
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Simulate streaming response
          const simulatedResponse = [
            "This is a simulated response",
            " that will appear in chunks.",
            " Each part is sent separately.",
            " This simulates a real-time",
            " streaming response from a server."
          ];
          
          for (const chunk of simulatedResponse) {
            // Simulate delay between chunks
            await new Promise(resolve => setTimeout(resolve, 1000));
            controller.enqueue(`data: ${chunk}\n\n`);
          }
          
        } catch (error) {
          console.error('Error generating response:', error);
          controller.enqueue(`data: [Error generating response]\n\n`);
        } finally {
          // Signal the end of the stream
          controller.close();
        }
      }
    });
  
    return new Response(stream, { headers });
}
