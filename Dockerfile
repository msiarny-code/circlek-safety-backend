FROM node:18

# Install Python
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt

# Copy all application files
COPY . .

# Expose port (Railway will set PORT env variable)
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
