# Integrated Dockerfile: HarperDB + Next.js App
# Build Next.js app directly in HarperDB container (npm run build requires HarperDB)
FROM harperdb/harperdb:latest

WORKDIR /opt/harperdb/app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Set prebuilt to true for production build
RUN sed -i 's/prebuilt: false/prebuilt: true/' config.yaml

RUN npm run build

# Expose ports
# 9925: HarperDB HTTP Operations API and Studio UI
# 9926: HarperDB HTTPS (where Next.js app will be served)
EXPOSE 9925 9926

# Start HarperDB and Next.js app
# harperdb-nextjs start will start both HarperDB server and Next.js app
CMD ["npm", "run", "start"]
