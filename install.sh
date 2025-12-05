#!/bin/bash

if [ "$EUID" -ne 0 ]; then
  echo "This script must be run as root. Use: sudo ./install.sh"
  exit 1
fi

echo "Installing WebUtility..."

# Install dependencies
npm install

# Link globally
npm link

# Copy service file
SERVICE_FILE="/etc/systemd/system/pryanikweb.service"
cp pryanikweb.service "$SERVICE_FILE"

# Replace path in service file
PROJECT_PATH="$(pwd)"
sed -i "s|/path/to/webutility|$PROJECT_PATH|g" "$SERVICE_FILE"

# Generate self-signed SSL cert if not exists
SSL_KEY="/etc/ssl/private/webutility.key"
SSL_CERT="/etc/ssl/certs/webutility.crt"

if [ ! -f "$SSL_KEY" ] || [ ! -f "$SSL_CERT" ]; then
  echo "Generating self-signed SSL certificate..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout "$SSL_KEY" -out "$SSL_CERT" -subj "/C=RU/ST=Russia/L=Moscow/O=WebUtility/CN=localhost"
  chown root:root "$SSL_KEY" "$SSL_CERT"
  chmod 600 "$SSL_KEY"
  chmod 644 "$SSL_CERT"
fi

# Add SSL environment to service
echo "Environment=SSL_KEY=$SSL_KEY SSL_CERT=$SSL_CERT" >> "$SERVICE_FILE"
sed -i "s|ExecStart=.*/node /path/to/webutility/index.js|ExecStart=/usr/bin/node /path/to/webutility/index.js|" "$SERVICE_FILE"

# Reload systemd
systemctl daemon-reload

# Enable and start
systemctl enable pryanikweb
systemctl start pryanikweb

echo "WebUtility installed and running!"
echo "Access at https://localhost"
echo "CLI: pryanikweb -v"
