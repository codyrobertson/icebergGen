/**
 * Task Scheduler
 *
 * Provides utilities for scheduling recurring tasks
 * and managing background jobs
 */

interface ScheduledTask {
  id: string
  fn: () => Promise<void>
  interval: number
  lastRun: number
  nextRun: number
  runCount: number
  isRunning: boolean
  description: string
}

class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map()
  private timer: NodeJS.Timeout | null = null
  private running = false

  /**
   * Start the task scheduler
   */
  start(): void {
    if (this.running) return

    this.running = true
    this.timer = setInterval(() => this.checkTasks(), 10000) // Check every 10 seconds
    console.log("Task scheduler started")
  }

  /**
   * Stop the task scheduler
   */
  stop(): void {
    if (!this.running) return

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    this.running = false
    console.log("Task scheduler stopped")
  }

  /**
   * Schedule a recurring task
   * @param id Unique task identifier
   * @param fn Function to execute
   * @param interval Interval in milliseconds
   * @param description Human-readable description
   * @param runImmediately Whether to run the task immediately
   */
  schedule(id: string, fn: () => Promise<void>, interval: number, description: string, runImmediately = false): string {
    const now = Date.now()

    const task: ScheduledTask = {
      id,
      fn,
      interval,
      lastRun: runImmediately ? 0 : now,
      nextRun: runImmediately ? now : now + interval,
      runCount: 0,
      isRunning: false,
      description,
    }

    this.tasks.set(id, task)
    console.log(`Scheduled task: ${id}, ${description}, interval: ${interval}ms`)

    // Start the scheduler if it's not running
    if (!this.running) {
      this.start()
    }

    return id
  }

  /**
   * Unschedule a task
   * @param id Task identifier
   */
  unschedule(id: string): boolean {
    const result = this.tasks.delete(id)

    if (result) {
      console.log(`Unscheduled task: ${id}`)
    }

    return result
  }

  /**
   * Check and run due tasks
   */
  private async checkTasks(): Promise<void> {
    const now = Date.now()

    for (const [id, task] of this.tasks.entries()) {
      // Skip tasks that are currently running
      if (task.isRunning) continue

      // Run tasks that are due
      if (now >= task.nextRun) {
        // Mark as running to prevent concurrent execution
        task.isRunning = true

        try {
          console.log(`Running task: ${id} (${task.description})`)
          await task.fn()

          // Update task metadata
          task.lastRun = now
          task.nextRun = now + task.interval
          task.runCount++

          console.log(`Completed task: ${id}, next run at: ${new Date(task.nextRun).toISOString()}`)
        } catch (error) {
          console.error(`Error in task ${id}:`, error)
        } finally {
          // Mark as not running even if there was an error
          task.isRunning = false
        }
      }
    }
  }

  /**
   * Run a task immediately, regardless of schedule
   * @param id Task identifier
   */
  async runNow(id: string): Promise<boolean> {
    const task = this.tasks.get(id)

    if (!task || task.isRunning) {
      return false
    }

    task.isRunning = true

    try {
      console.log(`Manually running task: ${id} (${task.description})`)
      await task.fn()

      // Update task metadata
      const now = Date.now()
      task.lastRun = now
      task.nextRun = now + task.interval
      task.runCount++

      console.log(`Completed manual run of task: ${id}`)
      return true
    } catch (error) {
      console.error(`Error in manual task run ${id}:`, error)
      return false
    } finally {
      task.isRunning = false
    }
  }

  /**
   * Get the status of all scheduled tasks
   */
  getTaskStatus(): Record<
    string,
    {
      description: string
      lastRun: number
      nextRun: number
      runCount: number
      isRunning: boolean
      interval: number
    }
  > {
    const result: Record<string, any> = {}

    for (const [id, task] of this.tasks.entries()) {
      result[id] = {
        description: task.description,
        lastRun: task.lastRun,
        nextRun: task.nextRun,
        runCount: task.runCount,
        isRunning: task.isRunning,
        interval: task.interval,
      }
    }

    return result
  }
}

// Export a singleton instance
export const taskScheduler = new TaskScheduler()

// Start the scheduler after a short delay to allow for task registration
setTimeout(() => {
  taskScheduler.start()
}, 5000)

