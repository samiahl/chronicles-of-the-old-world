import { useState } from 'react'
import type { ArmyList, ArmyUnit, Character, Player } from '../types'
import { api } from '../api/client'
import Modal from './Modal'

interface Props {
  campaignId: string
  armyLists: ArmyList[]
  players: Player[]
  onReload: () => void
  toast: (msg: string, type?: 'ok' | 'err') => void
}

function blankChar() {
  return { name: '', rank: '', xp: '', isCaster: false, modifiers: '', notes: '', magicalItems: '' }
}
function blankUnit() {
  return { name: '', notes: '', xp: '' }
}

export default function ArmyLists({ campaignId, armyLists, players, onReload, toast }: Props) {
  // existing list state
  const [showModal, setShowModal] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [gameSize, setGameSize] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editGameSize, setEditGameSize] = useState('')

  // section toggles (keyed by army list id)
  const [charsOpen, setCharsOpen] = useState<Set<string>>(new Set())
  const [unitsOpen, setUnitsOpen] = useState<Set<string>>(new Set())
  // character details toggles (keyed by `${listId}_${charId}`)
  const [charDetailsOpen, setCharDetailsOpen] = useState<Set<string>>(new Set())

  // adding character
  const [addingCharTo, setAddingCharTo] = useState<string | null>(null)
  const [newChar, setNewChar] = useState(blankChar())

  // editing character
  const [editingChar, setEditingChar] = useState<{ listId: string; char: Character } | null>(null)

  // adding unit
  const [addingUnitTo, setAddingUnitTo] = useState<string | null>(null)
  const [newUnit, setNewUnit] = useState(blankUnit())

  // editing unit
  const [editingUnit, setEditingUnit] = useState<{ listId: string; unit: ArmyUnit } | null>(null)

  // heroic action
  const [addingHeroicTo, setAddingHeroicTo] = useState<{ listId: string; charId: string } | null>(null)
  const [newHeroic, setNewHeroic] = useState('')

  // OWB import
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPlayerId, setImportPlayerId] = useState('')
  const [importText, setImportText] = useState('')

  // ── existing handlers ────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post(`/campaigns/${campaignId}/army-lists`, {
        playerId,
        name,
        content: content || null,
        gameSize: gameSize ? parseInt(gameSize) : null,
      })
      setPlayerId(''); setName(''); setContent(''); setGameSize('')
      setShowModal(false)
      await onReload()
      toast('Muster roll filed')
    } catch {
      toast('Failed to submit army list', 'err')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this muster roll?')) return
    try {
      await api.delete(`/campaigns/${campaignId}/army-lists/${id}`)
      await onReload()
      toast('Muster roll removed')
    } catch {
      toast('Failed to remove list', 'err')
    }
  }

  const startEdit = (a: ArmyList) => {
    setEditingId(a.id)
    setEditName(a.name)
    setEditContent(a.content ?? '')
    setEditGameSize(a.gameSize != null ? String(a.gameSize) : '')
  }

  const handleSaveEdit = async (id: string) => {
    try {
      await api.put(`/campaigns/${campaignId}/army-lists/${id}`, {
        name: editName || null,
        content: editContent || null,
        gameSize: editGameSize ? parseInt(editGameSize) : null,
      })
      setEditingId(null)
      await onReload()
      toast('Muster roll updated')
    } catch {
      toast('Failed to update list', 'err')
    }
  }

  // ── character helpers ────────────────────────────────────────────────────

  const putChars = async (listId: string, characters: Character[]) => {
    await api.put(`/campaigns/${campaignId}/army-lists/${listId}`, { characters })
    await onReload()
  }

  const putUnits = async (listId: string, units: ArmyUnit[]) => {
    await api.put(`/campaigns/${campaignId}/army-lists/${listId}`, { units })
    await onReload()
  }

  const handleAddChar = async (listId: string) => {
    const a = armyLists.find(x => x.id === listId)!
    const char: Character = {
      id: crypto.randomUUID(),
      name: newChar.name.trim(),
      rank: newChar.rank.trim() || null,
      xp: newChar.xp ? parseInt(newChar.xp) : null,
      isCaster: newChar.isCaster,
      modifiers: newChar.modifiers.trim() || null,
      notes: newChar.notes.trim() || null,
      magicalItems: newChar.magicalItems
        ? newChar.magicalItems.split(',').map(s => s.trim()).filter(Boolean)
        : [],
      misfires: 0,
      miscasts: 0,
      perfectInvocations: 0,
      heroicActions: [],
    }
    try {
      await putChars(listId, [...(a.characters ?? []), char])
      setAddingCharTo(null)
      setNewChar(blankChar())
      toast('Character added')
    } catch {
      toast('Failed to add character', 'err')
    }
  }

  const handleSaveChar = async () => {
    if (!editingChar) return
    const a = armyLists.find(x => x.id === editingChar.listId)!
    const updated = (a.characters ?? []).map(c =>
      c.id === editingChar.char.id ? editingChar.char : c
    )
    try {
      await putChars(editingChar.listId, updated)
      setEditingChar(null)
      toast('Character updated')
    } catch {
      toast('Failed to update character', 'err')
    }
  }

  const handleRemoveChar = async (listId: string, charId: string) => {
    const a = armyLists.find(x => x.id === listId)!
    const updated = (a.characters ?? []).filter(c => c.id !== charId)
    try {
      await putChars(listId, updated)
      toast('Character removed')
    } catch {
      toast('Failed to remove character', 'err')
    }
  }

  const adjustCaster = async (
    listId: string,
    charId: string,
    field: 'misfires' | 'miscasts' | 'perfectInvocations',
    delta: number,
  ) => {
    const a = armyLists.find(x => x.id === listId)!
    const updated = (a.characters ?? []).map(c => {
      if (c.id !== charId) return c
      const val = Math.max(0, (c[field] as number) + delta)
      return { ...c, [field]: val }
    })
    try {
      await putChars(listId, updated)
    } catch {
      toast('Failed to update counter', 'err')
    }
  }

  const handleAddHeroic = async (listId: string, charId: string) => {
    if (!newHeroic.trim()) return
    const a = armyLists.find(x => x.id === listId)!
    const updated = (a.characters ?? []).map(c => {
      if (c.id !== charId) return c
      return { ...c, heroicActions: [...c.heroicActions, newHeroic.trim()] }
    })
    try {
      await putChars(listId, updated)
      setAddingHeroicTo(null)
      setNewHeroic('')
      toast('Deed recorded')
    } catch {
      toast('Failed to record deed', 'err')
    }
  }

  // ── unit helpers ─────────────────────────────────────────────────────────

  const handleAddUnit = async (listId: string) => {
    const a = armyLists.find(x => x.id === listId)!
    const unit: ArmyUnit = {
      id: crypto.randomUUID(),
      name: newUnit.name.trim(),
      notes: newUnit.notes.trim() || null,
      xp: newUnit.xp ? parseInt(newUnit.xp) : null,
    }
    try {
      await putUnits(listId, [...(a.units ?? []), unit])
      setAddingUnitTo(null)
      setNewUnit(blankUnit())
      toast('Unit added')
    } catch {
      toast('Failed to add unit', 'err')
    }
  }

  const handleSaveUnit = async () => {
    if (!editingUnit) return
    const a = armyLists.find(x => x.id === editingUnit.listId)!
    const updated = (a.units ?? []).map(u =>
      u.id === editingUnit.unit.id ? editingUnit.unit : u
    )
    try {
      await putUnits(editingUnit.listId, updated)
      setEditingUnit(null)
      toast('Unit updated')
    } catch {
      toast('Failed to update unit', 'err')
    }
  }

  const handleRemoveUnit = async (listId: string, unitId: string) => {
    const a = armyLists.find(x => x.id === listId)!
    const updated = (a.units ?? []).filter(u => u.id !== unitId)
    try {
      await putUnits(listId, updated)
      toast('Unit removed')
    } catch {
      toast('Failed to remove unit', 'err')
    }
  }

  // ── OWB import ───────────────────────────────────────────────────────────

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importPlayerId) return toast('Select a commander', 'err')
    if (!importText.trim()) return toast('Paste your OWB export first', 'err')
    const parsed = parseOWBExport(importText)
    try {
      const created = await api.post<ArmyList>(`/campaigns/${campaignId}/army-lists`, {
        playerId: importPlayerId,
        name: parsed.name,
        content: parsed.content,
        gameSize: parsed.gameSize,
      })
      if (parsed.characters.length > 0 || parsed.units.length > 0) {
        await api.put(`/campaigns/${campaignId}/army-lists/${created.id}`, {
          characters: parsed.characters,
          units: parsed.units,
        })
      }
      setImportText('')
      setImportPlayerId('')
      setShowImportModal(false)
      await onReload()
      toast(`Imported: ${parsed.name}${parsed.gameSize ? ` · ${parsed.gameSize}pts` : ''}`)
    } catch {
      toast('Import failed', 'err')
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Army Muster Rolls</h2>
          <p className="section-desc">The forces marshalled for war</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => setShowImportModal(true)}>↓ Import OWB</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Submit List</button>
        </div>
      </div>

      {armyLists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🛡</div>
          <div className="empty-text">No muster rolls filed yet.</div>
        </div>
      ) : (
        <div className="army-grid">
          {armyLists.map(a => {
            const chars = a.characters ?? []
            const units = a.units ?? []

            return (
              <div key={a.id} className="army-card">
                {editingId === a.id ? (
                  <div className="army-edit-form">
                    <div className="form-row-3">
                      <div className="form-group">
                        <label>List Name</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Points</label>
                        <input type="number" value={editGameSize} onChange={e => setEditGameSize(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Army List</label>
                      <textarea rows={10} value={editContent} onChange={e => setEditContent(e.target.value)}
                        placeholder="Paste your full army list here…" />
                    </div>
                    <div className="form-actions">
                      <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      <button className="btn-primary" onClick={() => handleSaveEdit(a.id)}>Save Changes</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="army-card-header">
                      <div>
                        <div className="army-list-name">{a.name}</div>
                        <div className="army-player">{a.playerName}{a.playerFaction ? ` · ${a.playerFaction}` : ''}</div>
                      </div>
                      <div className="army-pts">{a.gameSize ? `${a.gameSize}pts` : ''}</div>
                    </div>

                    {a.content && (
                      <>
                        <button
                          className="army-toggle"
                          onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                        >
                          {expanded === a.id ? '▾ Hide List' : '▸ View List'}
                        </button>
                        {expanded === a.id && (
                          <div className="army-content">{a.content}</div>
                        )}
                      </>
                    )}

                    {/* ── Characters ─────────────────────────────────── */}
                    <button
                      className="army-toggle"
                      onClick={() => setCharsOpen(prev => {
                        const n = new Set(prev); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n
                      })}
                    >
                      {charsOpen.has(a.id) ? '▾' : '▸'} Characters ({chars.length})
                    </button>

                    {charsOpen.has(a.id) && (
                      <div className="char-section">
                        <div className="character-grid">
                          {chars.map(c => {
                            const detailKey = `${a.id}_${c.id}`
                            const isEditingThisChar = editingChar?.listId === a.id && editingChar.char.id === c.id
                            const ec = editingChar?.char

                            return (
                              <div key={c.id} className="character-card">
                                {isEditingThisChar && ec ? (
                                  <div className="char-edit-form">
                                    <div className="form-row-2">
                                      <div className="form-group">
                                        <label>Name</label>
                                        <input
                                          value={ec.name}
                                          onChange={e => setEditingChar({ ...editingChar!, char: { ...ec, name: e.target.value } })}
                                        />
                                      </div>
                                      <div className="form-group">
                                        <label>Rank</label>
                                        <input
                                          value={ec.rank ?? ''}
                                          onChange={e => setEditingChar({ ...editingChar!, char: { ...ec, rank: e.target.value || null } })}
                                        />
                                      </div>
                                    </div>
                                    <div className="form-row-2">
                                      <div className="form-group">
                                        <label>XP</label>
                                        <input
                                          type="number"
                                          value={ec.xp ?? ''}
                                          onChange={e => setEditingChar({ ...editingChar!, char: { ...ec, xp: e.target.value ? parseInt(e.target.value) : null } })}
                                        />
                                      </div>
                                      <div className="form-group char-caster-check">
                                        <label>Is Caster?</label>
                                        <input
                                          type="checkbox"
                                          checked={ec.isCaster}
                                          onChange={e => setEditingChar({ ...editingChar!, char: { ...ec, isCaster: e.target.checked } })}
                                          style={{ width: 'auto', alignSelf: 'center' }}
                                        />
                                      </div>
                                    </div>
                                    <div className="form-group">
                                      <label>Magical Items (comma-separated)</label>
                                      <input
                                        value={ec.magicalItems.join(', ')}
                                        onChange={e => setEditingChar({ ...editingChar!, char: { ...ec, magicalItems: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Modifiers</label>
                                      <input
                                        value={ec.modifiers ?? ''}
                                        onChange={e => setEditingChar({ ...editingChar!, char: { ...ec, modifiers: e.target.value || null } })}
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Notes</label>
                                      <textarea
                                        rows={3}
                                        value={ec.notes ?? ''}
                                        onChange={e => setEditingChar({ ...editingChar!, char: { ...ec, notes: e.target.value || null } })}
                                      />
                                    </div>
                                    <div className="form-actions">
                                      <button className="btn-secondary btn-sm" onClick={() => setEditingChar(null)}>Cancel</button>
                                      <button className="btn-primary btn-sm" onClick={handleSaveChar}>Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="char-header">
                                      <span className="character-name">{c.name}</span>
                                      {c.rank && <span className="character-rank">{c.rank}</span>}
                                      {c.xp != null && <span className="xp-badge">{c.xp} XP</span>}
                                    </div>

                                    {c.magicalItems.length > 0 && (
                                      <div className="char-items">✦ {c.magicalItems.join(' · ')}</div>
                                    )}

                                    {(c.modifiers || c.notes) && (
                                      <>
                                        <button
                                          className="char-details-toggle"
                                          onClick={() => setCharDetailsOpen(prev => {
                                            const n = new Set(prev); n.has(detailKey) ? n.delete(detailKey) : n.add(detailKey); return n
                                          })}
                                        >
                                          {charDetailsOpen.has(detailKey) ? '▾' : '▸'} Details
                                        </button>
                                        {charDetailsOpen.has(detailKey) && (
                                          <div className="char-details">
                                            {c.modifiers && (
                                              <div className="char-detail-row">
                                                <span className="char-detail-label">Modifiers:</span> {c.modifiers}
                                              </div>
                                            )}
                                            {c.notes && (
                                              <div className="char-detail-row">
                                                <span className="char-detail-label">Notes:</span> {c.notes}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {c.isCaster && (
                                      <div className="caster-counters">
                                        {(
                                          [
                                            ['misfires', 'Misfires'],
                                            ['miscasts', 'Miscasts'],
                                            ['perfectInvocations', 'Perfect'],
                                          ] as ['misfires' | 'miscasts' | 'perfectInvocations', string][]
                                        ).map(([field, label]) => (
                                          <div key={field} className="counter-row">
                                            <span className="counter-label">{label}</span>
                                            <button className="counter-btn" onClick={() => adjustCaster(a.id, c.id, field, -1)}>−</button>
                                            <span className="counter-val">{c[field]}</span>
                                            <button className="counter-btn" onClick={() => adjustCaster(a.id, c.id, field, 1)}>+</button>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {c.heroicActions.length > 0 && (
                                      <div className="heroic-log">
                                        <div className="heroic-log-title">Heroic Deeds</div>
                                        {c.heroicActions.map((deed, i) => (
                                          <div key={i} className="heroic-entry">◆ {deed}</div>
                                        ))}
                                      </div>
                                    )}

                                    {addingHeroicTo?.listId === a.id && addingHeroicTo.charId === c.id ? (
                                      <div className="heroic-add-area">
                                        <textarea
                                          rows={2}
                                          placeholder="Describe the heroic deed…"
                                          value={newHeroic}
                                          onChange={e => setNewHeroic(e.target.value)}
                                        />
                                        <div className="heroic-add-actions">
                                          <button
                                            className="btn-secondary btn-sm"
                                            onClick={() => { setAddingHeroicTo(null); setNewHeroic('') }}
                                          >Cancel</button>
                                          <button
                                            className="btn-primary btn-sm"
                                            onClick={() => handleAddHeroic(a.id, c.id)}
                                          >Record Deed</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        className="char-details-toggle"
                                        onClick={() => { setAddingHeroicTo({ listId: a.id, charId: c.id }); setNewHeroic('') }}
                                      >
                                        + Add Deed
                                      </button>
                                    )}

                                    <div className="char-actions">
                                      <button
                                        className="btn-secondary btn-sm"
                                        onClick={() => setEditingChar({ listId: a.id, char: { ...c } })}
                                      >Edit</button>
                                      <button className="btn-danger" onClick={() => handleRemoveChar(a.id, c.id)}>Remove</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {addingCharTo === a.id ? (
                          <div className="char-add-form">
                            <div className="form-row-2">
                              <div className="form-group">
                                <label>Name</label>
                                <input
                                  value={newChar.name}
                                  onChange={e => setNewChar({ ...newChar, name: e.target.value })}
                                  placeholder="Character name"
                                />
                              </div>
                              <div className="form-group">
                                <label>Rank</label>
                                <input
                                  value={newChar.rank}
                                  onChange={e => setNewChar({ ...newChar, rank: e.target.value })}
                                  placeholder="Veteran Champion…"
                                />
                              </div>
                            </div>
                            <div className="form-row-2">
                              <div className="form-group">
                                <label>XP</label>
                                <input
                                  type="number"
                                  value={newChar.xp}
                                  onChange={e => setNewChar({ ...newChar, xp: e.target.value })}
                                  placeholder="0"
                                />
                              </div>
                              <div className="form-group char-caster-check">
                                <label>Is Caster?</label>
                                <input
                                  type="checkbox"
                                  checked={newChar.isCaster}
                                  onChange={e => setNewChar({ ...newChar, isCaster: e.target.checked })}
                                  style={{ width: 'auto', alignSelf: 'center' }}
                                />
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Magical Items (comma-separated)</label>
                              <input
                                value={newChar.magicalItems}
                                onChange={e => setNewChar({ ...newChar, magicalItems: e.target.value })}
                                placeholder="Sword of Fate, Armour of Destiny…"
                              />
                            </div>
                            <div className="form-group">
                              <label>Modifiers</label>
                              <input
                                value={newChar.modifiers}
                                onChange={e => setNewChar({ ...newChar, modifiers: e.target.value })}
                                placeholder="Stubborn, Fear…"
                              />
                            </div>
                            <div className="form-group">
                              <label>Notes</label>
                              <textarea
                                rows={2}
                                value={newChar.notes}
                                onChange={e => setNewChar({ ...newChar, notes: e.target.value })}
                              />
                            </div>
                            <div className="form-actions">
                              <button
                                className="btn-secondary btn-sm"
                                onClick={() => { setAddingCharTo(null); setNewChar(blankChar()) }}
                              >Cancel</button>
                              <button
                                className="btn-primary btn-sm"
                                onClick={() => handleAddChar(a.id)}
                                disabled={!newChar.name.trim()}
                              >Add Character</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="char-add-btn"
                            onClick={() => { setAddingCharTo(a.id); setNewChar(blankChar()) }}
                          >
                            + Add Character
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── Units ──────────────────────────────────────── */}
                    <button
                      className="army-toggle"
                      onClick={() => setUnitsOpen(prev => {
                        const n = new Set(prev); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n
                      })}
                    >
                      {unitsOpen.has(a.id) ? '▾' : '▸'} Units ({units.length})
                    </button>

                    {unitsOpen.has(a.id) && (
                      <div className="units-section">
                        <div className="units-list">
                          {units.map(u => {
                            const isEditingThisUnit = editingUnit?.listId === a.id && editingUnit.unit.id === u.id
                            const eu = editingUnit?.unit

                            return (
                              <div key={u.id} className="unit-item">
                                {isEditingThisUnit && eu ? (
                                  <div className="unit-edit-row">
                                    <input
                                      value={eu.name}
                                      onChange={e => setEditingUnit({ ...editingUnit!, unit: { ...eu, name: e.target.value } })}
                                      placeholder="Unit name"
                                    />
                                    <input
                                      type="number"
                                      value={eu.xp ?? ''}
                                      onChange={e => setEditingUnit({ ...editingUnit!, unit: { ...eu, xp: e.target.value ? parseInt(e.target.value) : null } })}
                                      placeholder="XP"
                                      style={{ width: '5rem' }}
                                    />
                                    <input
                                      value={eu.notes ?? ''}
                                      onChange={e => setEditingUnit({ ...editingUnit!, unit: { ...eu, notes: e.target.value || null } })}
                                      placeholder="Notes…"
                                    />
                                    <div className="unit-edit-actions">
                                      <button className="btn-secondary btn-sm" onClick={() => setEditingUnit(null)}>Cancel</button>
                                      <button className="btn-primary btn-sm" onClick={handleSaveUnit}>Save</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="unit-view-row">
                                    <div className="unit-text">
                                      <span className="unit-name">{u.name}</span>
                                      {u.xp != null && <span className="xp-badge">{u.xp} XP</span>}
                                      {u.notes && <span className="unit-notes"> — {u.notes}</span>}
                                    </div>
                                    <div className="unit-actions">
                                      <button
                                        className="btn-secondary btn-sm"
                                        onClick={() => setEditingUnit({ listId: a.id, unit: { ...u } })}
                                      >Edit</button>
                                      <button className="btn-danger" onClick={() => handleRemoveUnit(a.id, u.id)}>Remove</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {addingUnitTo === a.id ? (
                          <div className="unit-add-row">
                            <input
                              value={newUnit.name}
                              onChange={e => setNewUnit({ ...newUnit, name: e.target.value })}
                              placeholder="Unit name"
                            />
                            <input
                              type="number"
                              value={newUnit.xp}
                              onChange={e => setNewUnit({ ...newUnit, xp: e.target.value })}
                              placeholder="XP"
                              style={{ width: '5rem' }}
                            />
                            <input
                              value={newUnit.notes}
                              onChange={e => setNewUnit({ ...newUnit, notes: e.target.value })}
                              placeholder="Notes…"
                            />
                            <div className="unit-edit-actions">
                              <button
                                className="btn-secondary btn-sm"
                                onClick={() => { setAddingUnitTo(null); setNewUnit(blankUnit()) }}
                              >Cancel</button>
                              <button
                                className="btn-primary btn-sm"
                                onClick={() => handleAddUnit(a.id)}
                                disabled={!newUnit.name.trim()}
                              >Add</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="char-add-btn"
                            onClick={() => { setAddingUnitTo(a.id); setNewUnit(blankUnit()) }}
                          >
                            + Add Unit
                          </button>
                        )}
                      </div>
                    )}

                    <div className="army-card-footer">
                      <button className="btn-secondary" onClick={() => startEdit(a)}>Edit</button>
                      <button className="btn-danger" onClick={() => handleDelete(a.id)}>Remove</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import from Old World Builder" wide>
        <form onSubmit={handleImportSubmit}>
          <div className="form-group">
            <label>Commander</label>
            <select value={importPlayerId} onChange={e => setImportPlayerId(e.target.value)} required>
              <option value="">— Select —</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.faction ? ` (${p.faction})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Paste OWB Export</label>
            <textarea
              rows={14}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={'===Army Name [2000 pts]Warhammer: The Old World, Faction===\n++ Characters [200 pts] ++\n…'}
              style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
            />
          </div>
          {importText.trim() && <OWBPreview text={importText} />}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Import List</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Submit Muster Roll" wide>
        <form onSubmit={handleSubmit}>
          <div className="form-row-3">
            <div className="form-group">
              <label>Commander</label>
              <select value={playerId} onChange={e => setPlayerId(e.target.value)} required>
                <option value="">— Select —</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.faction ? ` (${p.faction})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>List Name</label>
              <input value={name} onChange={e => setName(e.target.value)} required
                placeholder="Round 1 List, Tournament Build…" />
            </div>
            <div className="form-group">
              <label>Points</label>
              <input type="number" value={gameSize} onChange={e => setGameSize(e.target.value)} placeholder="2000" />
            </div>
          </div>
          <div className="form-group">
            <label>Army List</label>
            <textarea rows={12} value={content} onChange={e => setContent(e.target.value)}
              placeholder="Paste your full army list here…" />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">File Muster Roll</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── OWB parser ────────────────────────────────────────────────────────────────

interface ParsedOWB {
  name: string
  gameSize: number | null
  content: string
  characters: Character[]
  units: ArmyUnit[]
}

function parseOWBExport(text: string): ParsedOWB {
  const lines = text.split('\n')
  let name = 'Imported Army'
  let gameSize: number | null = null

  const titleLine = lines.find(l => l.trim().startsWith('==='))
  if (titleLine) {
    const m = titleLine.match(/===\s*(.+?)\s*\[(\d+)\s*pts?\]/i)
    if (m) {
      name = m[1].trim()
      gameSize = parseInt(m[2])
    }
  }

  const characters: Character[] = []
  const units: ArmyUnit[] = []

  let currentSection = ''
  let currentEntryName = ''
  let currentOptions: string[] = []

  const flush = () => {
    if (!currentEntryName) return
    const notes = currentOptions.length ? currentOptions.join(', ') : null
    const isCharSection = /character/i.test(currentSection)
    if (isCharSection) {
      const isCaster = currentOptions.some(o =>
        /wizard|sorcerer|shaman|priest|caster|warlock/i.test(o)
      )
      characters.push({
        id: crypto.randomUUID(),
        name: currentEntryName,
        rank: null,
        xp: null,
        modifiers: null,
        notes,
        magicalItems: [],
        isCaster,
        misfires: 0,
        miscasts: 0,
        perfectInvocations: 0,
        heroicActions: [],
      })
    } else {
      units.push({ id: crypto.randomUUID(), name: currentEntryName, notes })
    }
    currentEntryName = ''
    currentOptions = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line === '---' || /^Created with/i.test(line)) continue
    if (line.startsWith('===')) continue

    // Section header: ++ Name [pts] ++
    if (line.startsWith('++') && line.endsWith('++')) {
      flush()
      const m = line.match(/\+\+\s*(.+?)\s*(?:\[\d+[^\]]*\])?\s*\+\+/)
      currentSection = m ? m[1].trim() : ''
      continue
    }

    // Option line: - something
    if (line.startsWith('-') && currentEntryName) {
      currentOptions.push(line.slice(1).trim())
      continue
    }

    // Entry line: Name [pts] or Count Name [pts]
    const entryMatch = line.match(/^(.+?)\s*\[\d+\s*pts?\]/i)
    if (entryMatch && currentSection) {
      flush()
      currentEntryName = entryMatch[1].trim()
    }
  }
  flush()

  return { name, gameSize, content: text, characters, units }
}

function OWBPreview({ text }: { text: string }) {
  const p = parseOWBExport(text)
  return (
    <div className="owb-preview">
      <span className="owb-preview-name">{p.name}</span>
      {p.gameSize != null && <span className="owb-preview-pts">{p.gameSize} pts</span>}
      <span className="owb-preview-stat">{p.characters.length} character{p.characters.length !== 1 ? 's' : ''}</span>
      <span className="owb-preview-stat">{p.units.length} unit{p.units.length !== 1 ? 's' : ''}</span>
    </div>
  )
}
