FROM oven/bun:1 AS build
WORKDIR /usr/src/app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build --compile --minify --production --target=bun-linux-x64 index.ts --outfile=server

FROM alpine:latest
WORKDIR /app
COPY --from=build /usr/src/app/server ./server
EXPOSE 3000/tcp
ENTRYPOINT ["./server"]
