FROM node:18-alpine AS builder
# Add tmux for session persistence
RUN apk add --no-cache python3 make g++ tmux
RUN npm install -g pnpm
WORKDIR /usr/src/app
COPY host/package.json host/pnpm-lock.yaml ./
RUN pnpm install
COPY host/server.js ./

FROM node:18-alpine AS runtime
# Add tmux to runtime
# IMPLEMENTATION UPDATE: Added git, github-cli (gh), and jq for full Jules CLI workflow support
RUN apk add --no-cache tmux git github-cli jq

# IMPLEMENTATION UPDATE: Install Google Jules CLI globally
RUN npm install -g pnpm @google/jules

WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY host/package.json host/pnpm-lock.yaml ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/server.js ./

# Expose the websocket port
EXPOSE 8080
USER node
CMD [ "node", "server.js" ]
