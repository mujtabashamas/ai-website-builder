FROM node:21-slim

RUN apt-get update && apt-get install -y curl git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Optional: pnpm
RUN corepack enable

# Add compile script
COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

WORKDIR /home/user
