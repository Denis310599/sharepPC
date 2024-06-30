#!/bin/bash
nginx -g 'daemon off;' &
gunicorn -b 0.0.0.0:8000 app:app --preload -w 5 --log-level=debug --timeout 500