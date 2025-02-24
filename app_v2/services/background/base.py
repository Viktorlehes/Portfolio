# app/services/background/base.py

from abc import ABC, abstractmethod
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from enum import Enum

class TaskStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    FAILED = "failed"
    COMPLETED = "completed"

class BackgroundTask(ABC):
    """Base class for all background tasks"""
    
    def __init__(self, name: str, interval_seconds: int):
        self.name = name
        self.interval = interval_seconds
        self.status = TaskStatus.IDLE
        self.last_run: Optional[datetime] = None
        self.last_error: Optional[str] = None
        self.is_running = False
        self._task: Optional[asyncio.Task] = None

    @abstractmethod
    async def execute(self) -> None:
        """Execute the task logic"""
        pass

    async def run(self) -> None:
        """Run a single execution of the task"""
        if self.status == TaskStatus.RUNNING:
            logging.warning(f"Task {self.name} is already running")
            return

        try:
            self.status = TaskStatus.RUNNING
            await self.execute()
            self.status = TaskStatus.COMPLETED
            self.last_run = datetime.now(timezone.utc)
            self.last_error = None
        except Exception as e:
            self.status = TaskStatus.FAILED
            self.last_error = str(e)
            logging.error(f"Error in task {self.name}: {str(e)}")
            raise

    async def run_forever(self) -> None:
        """Run the task repeatedly at the specified interval"""
        self.is_running = True
        while self.is_running:
            try:
                await self.run()
                await asyncio.sleep(self.interval)
            except Exception as e:
                logging.error(f"Error in task loop {self.name}: {str(e)}")
                await asyncio.sleep(min(self.interval, 60))  # Wait but not longer than 1 minute

    def start(self) -> None:
        """Start the background task"""
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self.run_forever())
            logging.info(f"Started background task: {self.name}")

    def stop(self) -> None:
        """Stop the background task"""
        self.is_running = False
        if self._task:
            self._task.cancel()
            logging.info(f"Stopped background task: {self.name}")

    @property
    def state(self) -> Dict[str, Any]:
        """Get current task state"""
        return {
            "name": self.name,
            "status": self.status,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "last_error": self.last_error,
            "is_running": self.is_running,
            "interval_seconds": self.interval
        }

class BackgroundTaskManager:
    """Manages all background tasks"""
    
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BackgroundTaskManager, cls).__new__(cls)
            cls._instance.tasks = {}
        return cls._instance

    def register_task(self, task: BackgroundTask) -> None:
        """Register a new background task"""
        self.tasks[task.name] = task
        logging.info(f"Registered task: {task.name}")

    def start_all(self) -> None:
        """Start all registered tasks"""
        for task in self.tasks.values():
            task.start()

    def stop_all(self) -> None:
        """Stop all running tasks"""
        for task in self.tasks.values():
            task.stop()

    def get_task(self, name: str) -> Optional[BackgroundTask]:
        """Get a task by name"""
        return self.tasks.get(name)

    def get_all_states(self) -> Dict[str, Dict[str, Any]]:
        """Get states of all tasks"""
        return {name: task.state for name, task in self.tasks.items()}

# Create singleton instance
task_manager = BackgroundTaskManager()