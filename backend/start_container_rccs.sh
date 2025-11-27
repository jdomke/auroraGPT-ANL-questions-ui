#!/bin/sh

alembic upgrade head
uvicorn --host 0.0.0.0 backend:app --root-path "/recorder"
