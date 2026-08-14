import assert from 'node:assert/strict'
import test from 'node:test'
import type { User } from '../data/users.ts'
import { archiveTask, createTask, hasUnsynchronisedTasks, prepareTaskPermanentDeletion, updateTask } from './task.ts'

const adam: User = { id: 'usr-adam', name: 'Adam' }
const mary: User = { id: 'usr-mary', name: 'Mary' }
const createdAt = '2026-08-13T01:00:00.000Z'

test('creates a local task with immutable ownership and pending sync state', () => {
  const task = createTask(
    { title: '  Replace switch  ', description: '  Switch is in the storeroom.  ' },
    adam,
    'task-1',
    createdAt,
  )

  assert.equal(task.id, 'task-1')
  assert.equal(task.title, 'Replace switch')
  assert.equal(task.description, 'Switch is in the storeroom.')
  assert.equal(task.creatorId, adam.id)
  assert.equal(task.creatorName, adam.name)
  assert.equal(task.deviceCreatedAt, createdAt)
  assert.equal(task.syncStatus, 'Waiting to Sync')
  assert.equal(task.localVersion, 1)
})

test('allows only the creator to edit a task', () => {
  const task = createTask({ title: 'Original', description: 'Original details' }, adam, 'task-2', createdAt)
  const updated = updateTask(
    task,
    { title: 'Updated', description: 'Updated details' },
    adam,
    '2026-08-13T02:00:00.000Z',
  )

  assert.equal(updated.title, 'Updated')
  assert.equal(updated.creatorId, adam.id)
  assert.equal(updated.deviceCreatedAt, createdAt)
  assert.equal(updated.localVersion, 2)
  assert.throws(() => updateTask(task, { title: 'No', description: 'Not allowed' }, mary), /Only the person/)
})

test('allows only the creator to archive a task and retains its content', () => {
  const task = createTask({ title: 'Keep this', description: 'Historical detail' }, adam, 'task-3', createdAt)
  const archivedAt = '2026-08-13T03:00:00.000Z'
  const archived = archiveTask(task, adam, archivedAt)

  assert.equal(archived.archived, true)
  assert.equal(archived.archivedAt, archivedAt)
  assert.equal(archived.archivedBy, adam.id)
  assert.equal(archived.title, task.title)
  assert.equal(archived.description, task.description)
  assert.throws(() => archiveTask(task, mary), /Only the person/)
})

test('detects pending changes belonging to the selected user', () => {
  const task = createTask({ title: 'Pending', description: 'Stored locally' }, adam, 'task-4', createdAt)

  assert.equal(hasUnsynchronisedTasks([task], adam.id), true)
  assert.equal(hasUnsynchronisedTasks([task], mary.id), false)
})

test('allows only the creator to permanently delete an archived task', () => {
  const task = createTask({ title: 'Delete me', description: 'Archived detail' }, adam, 'task-5', createdAt)
  const archived = archiveTask(task, adam)
  assert.equal(prepareTaskPermanentDeletion(archived, adam).pendingPermanentDeletion, true)
  assert.throws(() => prepareTaskPermanentDeletion(task, adam), /Only archived tasks/)
  assert.throws(() => prepareTaskPermanentDeletion(archived, mary), /Only the person/)
})
