import { useEffect, useState } from 'react'
import type { TaskInput, TaskRecord } from '../domain/task.ts'

type TaskFormProps = {
  editingTask: TaskRecord | null
  saving: boolean
  onCancel: () => void
  onSave: (input: TaskInput) => Promise<boolean>
}

export function TaskForm({ editingTask, saving, onCancel, onSave }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    setTitle(editingTask?.title ?? '')
    setDescription(editingTask?.description ?? '')
    setValidationError('')
  }, [editingTask])

  return (
    <section className="task-form-card" aria-labelledby="task-form-heading">
      <div className="task-form-heading">
        <div>
          <p className="eyebrow">{editingTask ? 'Update entry' : 'New entry'}</p>
          <h2 id="task-form-heading">{editingTask ? 'Edit task' : 'Add a task'}</h2>
        </div>
        {editingTask && <button className="text-button" type="button" onClick={onCancel}>Cancel</button>}
      </div>

      <form onSubmit={async (event) => {
        event.preventDefault()
        setValidationError('')

        if (!title.trim() || !description.trim()) {
          setValidationError('Enter both a title and description.')
          return
        }

        const saved = await onSave({ title, description })
        if (saved && !editingTask) {
          setTitle('')
          setDescription('')
        }
      }}>
        <label htmlFor="task-title">Title</label>
        <input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What do we need to remember?"
          autoComplete="off"
          required
        />

        <label htmlFor="task-description">Description</label>
        <textarea
          id="task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add the useful details here…"
          rows={5}
          required
        />

        {validationError && <p className="form-error" role="alert">{validationError}</p>}
        <button className="primary-button save-task-button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : editingTask ? 'Save changes' : 'Add task'}
        </button>
      </form>
    </section>
  )
}
