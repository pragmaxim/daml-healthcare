#!/bin/bash
set -eo pipefail

export NVM_DIR=$HOME/.nvm;

if ! [ -f $NVM_DIR/nvm.sh ]; then
  echo 'Error: nvm is expected to be installed to setup exact version of node.' >&2
  exit 1
fi

source $NVM_DIR/nvm.sh;

if ! [ -x "$(command -v daml)" ]; then
  echo 'Error: daml is not installed.' >&2
  exit 1
fi

if ! [ -x "$(command -v npm)" ]; then
  echo 'Error: npm is not installed.' >&2
  exit 1
fi

BACKEND_READY_TEXT="Press 'Ctrl-C' to quit"

# Create tmp log file for backend output
backend_log_file=$(mktemp)
trigger_log_file=$(mktemp)
echo "DEBUG: Using tmp log file for backend: $backend_log_file"
echo "DEBUG: Using tmp log file for triggers: $trigger_log_file"

# Start backend in the background
(cd .. && daml start | tee "$backend_log_file" &)

# Wait for backend to be ready, then start frontend
echo "Waiting for backend..."
tail -F "${backend_log_file}" |
    grep --line-buffered "${BACKEND_READY_TEXT}" |
    while read -r ; do echo "Backend ready.";
        python3 startTriggers.py 6865 | tee "$trigger_log_file" &
        cd ../ui && nvm use && npm start ; 
    done
