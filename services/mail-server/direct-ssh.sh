#!/bin/bash

# Direct SSH connection bypassing Azure CLI
# Use this if Azure CLI is causing OOM issues

set -e

# VM connection details
VM_IP="172.206.209.246"
VM_USER="azureuser"

# Memory limit for SSH process
MEMORY_LIMIT="256M"

echo "=========================================="
echo "Direct SSH to Mail Server"
echo "IP: $VM_IP"
echo "Memory limit: $MEMORY_LIMIT"
echo "=========================================="

# Check if SSH key exists
if [ ! -f ~/.ssh/id_rsa ]; then
    echo "Warning: No SSH key found at ~/.ssh/id_rsa"
    echo "You may need to use password authentication"
fi

# Use systemd-run with direct SSH (not Azure CLI)
systemd-run --user --scope \
  --property=MemoryMax=$MEMORY_LIMIT \
  --property=MemoryHigh=$((${MEMORY_LIMIT%M} * 90 / 100))M \
  --property=TasksMax=30 \
  --property=CPUQuota=50% \
  ssh -o "ServerAliveInterval=60" \
      -o "ServerAliveCountMax=3" \
      -o "TCPKeepAlive=yes" \
      -o "Compression=yes" \
      "${VM_USER}@${VM_IP}"

echo ""
echo "SSH session ended"
