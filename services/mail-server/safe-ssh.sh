#!/bin/bash

# Safe SSH wrapper with memory limits
# Prevents SSH/Azure CLI from causing OOM events on local system

set -e

# Memory limit for SSH process (adjust based on your system - 512M is conservative)
MEMORY_LIMIT="512M"

# Resource group and VM name for Azure
RESOURCE_GROUP="mazzlabs-mail-rg"
VM_NAME="mazzlabs-mail-server"

echo "=========================================="
echo "Safe SSH Connection to $VM_NAME"
echo "Memory limit: $MEMORY_LIMIT"
echo "=========================================="

# Use systemd-run to create a transient scope with memory limits
# This prevents the SSH process from consuming unlimited memory
systemd-run --user --scope \
  --property=MemoryMax=$MEMORY_LIMIT \
  --property=MemoryHigh=$((${MEMORY_LIMIT%M} * 90 / 100))M \
  --property=TasksMax=50 \
  az ssh vm --resource-group "$RESOURCE_GROUP" --name "$VM_NAME"

echo ""
echo "SSH session ended safely"
