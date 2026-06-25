import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPlayer, updatePlayer, getPlayers, ApiError } from '../services/api'

export function AddEditPlayer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = id !== undefined

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  useEffect(() => {
    if (!isEdit) return
    getPlayers()
      .then((players) => {
        const player = players.find((p) => p.id === Number(id))
        if (player) {
          setName(player.name)
          setPhone(player.phone)
          if (player.photo_url) setPreview(`/api${player.photo_url}`)
        }
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !phone) {
      setError('Name and phone are required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('phone', phone)
      if (photo) formData.append('photo', photo)

      if (isEdit) {
        await updatePlayer(Number(id), formData)
      } else {
        await createPlayer(formData)
      }
      navigate('/players')
    } catch (e: any) {
      setError(e.message ?? 'Failed to save player')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <h1>{isEdit ? 'Edit Player' : 'Add Player'}</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
        <div>
          <label>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div>
          <label>Phone *</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div>
          <label>Photo</label>
          <input type="file" accept="image/*" onChange={handlePhotoChange} />
          {preview && <img src={preview} alt="preview" width={80} height={80} style={{ objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />}
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : isEdit ? 'Update Player' : 'Create Player'}
        </button>
        <button type="button" onClick={() => navigate('/players')}>Cancel</button>
      </form>
    </div>
  )
}