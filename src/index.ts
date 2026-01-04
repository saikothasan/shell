import { Container, getContainer } from "@cloudflare/containers";
import html from "./terminal.html";

export class TerminalContainer extends Container {
  defaultPort = 8080;
  // Keep internet enabled for package installation (apk/apt), 
  // but strictly controlled via Auth in the fetch handler below.
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

    // 1. SIMPLE AUTHENTICATION
    // Ensure you set TERM_TOKEN in your .dev.vars or wrangler.toml
    const token = url.searchParams.get("token");
    if (env.TERM_TOKEN && token !== env.TERM_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (url.pathname === "/terminal") {
      return await getContainer(env.TERMINAL).fetch(request);
    } 
    
    // Serve the HTML UI
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(html, {
        headers: { "content-type": "text/html;charset=UTF-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
