#!/bin/bash

# Start the FastAPI server in the background
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Start the Telegram bot
python3 -m bot.run &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?