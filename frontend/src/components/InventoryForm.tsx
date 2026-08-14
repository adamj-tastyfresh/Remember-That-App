import { useEffect, useState } from 'react'
import type { InventoryInput, InventoryRecord } from '../domain/inventory.ts'

type InventoryFormProps = {
  editingRecord: InventoryRecord | null
  saving: boolean
  onCancel: () => void
  onSave: (input: InventoryInput) => Promise<boolean>
}

export function InventoryForm({ editingRecord, saving, onCancel, onSave }: InventoryFormProps) {
  const [itemName, setItemName] = useState('')
  const [itemLocation, setItemLocation] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    setItemName(editingRecord?.itemName ?? '')
    setItemLocation(editingRecord?.itemLocation ?? '')
    setValidationError('')
  }, [editingRecord])

  return (
    <section className="task-form-card inventory-form-card" aria-labelledby="inventory-form-heading">
      <div className="task-form-heading">
        <div>
          <p className="eyebrow">{editingRecord ? 'Update location' : 'New item'}</p>
          <h2 id="inventory-form-heading">{editingRecord ? 'Edit inventory' : 'Add inventory'}</h2>
        </div>
        {editingRecord && <button className="text-button" type="button" onClick={onCancel}>Cancel</button>}
      </div>
      <form onSubmit={async (event) => {
        event.preventDefault()
        setValidationError('')
        if (!itemName.trim() || !itemLocation.trim()) {
          setValidationError('Enter both an item name and location.')
          return
        }
        const saved = await onSave({ itemName, itemLocation })
        if (saved && !editingRecord) {
          setItemName('')
          setItemLocation('')
        }
      }}>
        <label htmlFor="inventory-name">Item name</label>
        <input id="inventory-name" value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder="What item are we storing?" autoComplete="off" required />
        <label htmlFor="inventory-location">Item location</label>
        <input id="inventory-location" value={itemLocation} onChange={(event) => setItemLocation(event.target.value)} placeholder="Where can it be found?" autoComplete="off" required />
        {validationError && <p className="form-error" role="alert">{validationError}</p>}
        <button className="primary-button save-task-button" type="submit" disabled={saving}>
          {saving ? 'Saving…' : editingRecord ? 'Save changes' : 'Add inventory'}
        </button>
      </form>
    </section>
  )
}