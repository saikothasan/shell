import { Container, getContainer } from "@cloudflare/containers";
import html from "./terminal.html";

export class TerminalContainer extends Container {
  defaultPort = 8080;
  enableInternet = true; 

  async fetch(request: Request): Promise<Response> {
    return await this.containerFetch(request, this.defaultPort);
  }
}

export default {
  async fetch(
    request: Request,
    env: { TERMINAL: DurableObjectNamespace<TerminalContainer>; TERM_TOKEN?: string },
  ): Promise<Response> {
    const url = new URL(request.url);

    // 1. SECURITY: CONTENT SECURITY POLICY (CSP)
    // Prevents XSS and ensures only allowed scripts run
    const securityHeaders = {
      "content-type": "text/html;charset=UTF-8",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' ws: wss:;",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer"
    };

    // 2. AUTHENTICATION LOGIC
    // Supports both Header (Sec-WebSocket-Protocol) and URL Query (legacy/fallback)
    const protocolHeader = request.headers.get("Sec-WebSocket-Protocol");
    const queryToken = url.searchParams.get("token");
    
    // The client sends the token as the first "protocol" in the list
    const clientToken = protocolHeader ? protocolHeader.split(',')[0].trim() : queryToken;

    if (env.TERM_TOKEN) {
      if (!clientToken || !safeCompare(clientToken, env.TERM_TOKEN)) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // 3. ROUTING
    if (url.pathname === "/terminal") {
      // If using Sec-WebSocket-Protocol, we must return the protocol in the response
      // to complete the handshake successfully.
      let response = await getContainer(env.TERMINAL).fetch(request);
      
      if (protocolHeader && response.status === 101) {
        // Clone response to add the header required for WS handshake
        response = new Response(response.body, response);
        response.headers.set("Sec-WebSocket-Protocol", protocolHeader);
      }
      return response;
    } 
    
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(html, { headers: securityHeaders });
    }

    return new Response("Not Found", { status: 404 });
  },
};

// [Security] Constant-Time String Comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
