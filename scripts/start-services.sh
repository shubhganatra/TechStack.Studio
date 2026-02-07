#!/bin/bash

# Start backend and frontend services

echo "🚀 Starting TechStack.Studio services..."

# Create systemd services for auto-restart
sudo tee /etc/systemd/system/techstack-backend.service > /dev/null <<EOF
[Unit]
Description=TechStack.Studio Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/app/TechStack.Studio/backend
Environment="PATH=/home/ubuntu/app/TechStack.Studio/backend/venv/bin"
Environment="GROQ_API_KEY=${GROQ_API_KEY}"
ExecStart=/home/ubuntu/app/TechStack.Studio/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/techstack-frontend.service > /dev/null <<EOF
[Unit]
Description=TechStack.Studio Frontend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/app/TechStack.Studio/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable techstack-backend.service
sudo systemctl enable techstack-frontend.service
sudo systemctl start techstack-backend.service
sudo systemctl start techstack-frontend.service

echo "✅ Services started!"
echo ""
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: http://127.0.0.1:3000"
echo ""
echo "Check logs:"
echo "  sudo systemctl status techstack-backend"
echo "  sudo systemctl status techstack-frontend"
