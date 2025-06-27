#!/bin/bash
set -e
/usr/src/app/node_modules/.bin/migrate up --autosync
exec "$@"