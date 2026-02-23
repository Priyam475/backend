#!/bin/bash
# Get your PC's IP address for Capacitor live reload configuration

echo "Finding your PC's IP address..."
echo ""

# Try different methods to get IP
if command -v ip &> /dev/null; then
    IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d/ -f1)
elif command -v hostname &> /dev/null; then
    IP=$(hostname -I | awk '{print $1}')
elif command -v ifconfig &> /dev/null; then
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
else
    echo "Could not determine IP address automatically."
    echo "Please check your network settings manually."
    exit 1
fi

if [ -z "$IP" ]; then
    echo "Could not determine IP address."
    exit 1
fi

echo "Your PC's IP address is: $IP"
echo ""
echo "To enable live reload, update capacitor.config.ts:"
echo "  server: {"
echo "    url: 'http://$IP:8080',"
echo "    cleartext: true,"
echo "  },"
echo ""
echo "Then run: npm run cap:sync"
