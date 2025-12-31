# Use official Deno image
FROM denoland/deno:1.40.0

# Set working directory
WORKDIR /app

# Copy server code
COPY server.ts .

# Cache dependencies
RUN deno cache server.ts

# Expose port
EXPOSE 8080

# Run the server
CMD ["deno", "run", "--allow-net", "--allow-env", "server.ts"]
