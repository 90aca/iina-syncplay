FROM oven/bun:1
WORKDIR /usr/src/app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build --compile --minify --production index.ts --outfile=server

FROM oven/bun:1
WORKDIR /app
COPY --from=0 /usr/src/app/server ./server
EXPOSE 3000/tcp
ENTRYPOINT ["./server"]
