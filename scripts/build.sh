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

cd .. && daml build && daml codegen js && cd ui && nvm use && npm install --install-links