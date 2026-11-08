import { useParams, Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { ProductCard } from '../components/Cards'
import { Field, Sidebar } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useState } from 'react'
import {
  dashPath,
  fd,
  friendly,
  uploadImg,
  validMob,
  validPw,
  webp,
} from '../lib/utils'
import { sb } from '../lib/supabase'

export default function Profile() {
  const { tab = 'profile' } = useParams()
  const { db, user: u, bz, savedSet, go, toast, reload, need } = useApp()
  const [er, setEr] = useState('')
  const [er2, setEr2] = useState('')
  const [ver, setVer] = useState(0)

  if (!u) return null
  const customer = u.role === 'normal_user'
  const sv = db.products.filter((p) => savedSet().has(p.id) && bz(p.bid))
  const R = db.ratings.filter((r) => r.uid === u.id)

  const T = [['profile', 'My profile', 'user']]
  if (customer) {
    T.push(['saved', 'Saved food', 'heart'])
    T.push(['feedback', 'My feedback', 'review'])
  }
  T.push(['password', 'Change password', 'settings'])

  const onPhoto = async (e) => {
    const input = e.target
    const file = input.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/'))
      return toast('Please select an image file.', 'er')
    if (file.size > 5 * 1024 * 1024) {
      input.value = ''
      return toast('Choose an image smaller than 5 MB.', 'er')
    }
    let data
    try {
      data = await webp(file)
    } catch (x) {
      return toast('Could not load that image. Try another.', 'er')
    }
    try {
      const url = await uploadImg('avatars', u.id + '/avatar', data)
      const r = await sb
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', u.id)
      if (r.error) throw r.error
      await reload()
      toast('Profile picture updated.')
    } catch (x) {
      toast(friendly(x), 'er')
    }
  }

  const removeAvatar = async () => {
    if (
      !need(
        await sb.from('profiles').update({ avatar_url: null }).eq('id', u.id),
      )
    )
      return
    await reload()
    toast('Profile picture removed.')
  }

  const saveProfile = async (ev) => {
    ev.preventDefault()
    const f = ev.currentTarget.elements
    const e = f.e.value.trim().toLowerCase(),
      name = f.n.value.trim(),
      m = customer ? f.m.value.replace(/[\s-]/g, '') : ''
    if (!name) return setEr('Enter your name.')
    if (customer && m && !validMob(m))
      return setEr('Enter a valid PH mobile number.')
    const emailChg = e !== u.email
    if (emailChg) {
      if (!f.cp.value)
        return setEr('Enter your current password to change your email.')
      const t = await sb.auth.signInWithPassword({
        email: u.email,
        password: f.cp.value,
      })
      if (t.error) return setEr('Current password is incorrect.')
    }
    const upd = { name }
    if (customer) upd.phone = m || null
    const r = await sb.from('profiles').update(upd).eq('id', u.id)
    if (r.error) return setEr(friendly(r.error))
    if (emailChg) {
      const t = await sb.auth.updateUser({ email: e })
      if (t.error) return setEr(friendly(t.error))
      toast('Profile saved. Check your new email to confirm the change.')
    } else toast('Profile saved.')
    setEr('')
    await reload()
    setVer((v) => v + 1)
  }

  const changePw = async (ev) => {
    ev.preventDefault()
    const form = ev.currentTarget
    const f = form.elements
    const v = validPw(f.p.value, f.c.value)
    if (v) return setEr2(v)
    const t = await sb.auth.signInWithPassword({
      email: u.email,
      password: f.o.value,
    })
    if (t.error) return setEr2('Current password is incorrect.')
    const r = await sb.auth.updateUser({ password: f.p.value })
    if (r.error) return setEr2(friendly(r.error))
    setEr2('')
    toast('Password changed.')
    form.reset()
  }

  let h = null
  if (tab === 'profile') {
    const avatar = (
      <div className="profile-avatar">
        {u.avatar ? (
          <img src={u.avatar} alt="Profile picture" />
        ) : (
          <Icon name="user" />
        )}
      </div>
    )
    h = (
      <div className="panel">
        <div
          className="profile-header"
          style={{ alignItems: 'center', gap: 16 }}
        >
          {u.role === 'admin' ? (
            avatar
          ) : (
            <div
              className="profile-avatar-wrapper"
              style={{ position: 'relative', display: 'inline-block' }}
            >
              {avatar}
              <label
                className="profile-badge-upload"
                title="Upload photo"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  background: 'var(--navy)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                +
                <input type="file" accept="image/*" hidden onChange={onPhoto} />
              </label>
            </div>
          )}
          <div>
            <h3 style={{ marginBottom: 4 }}>{u.name || u.email}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {u.ucid ? (
                <>
                  Customer ID: <b>{u.ucid}</b>
                </>
              ) : null}
            </p>
            {u.role !== 'admin' && u.avatar ? (
              <div className="profile-photo-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="link"
                  onClick={removeAvatar}
                  style={{
                    fontSize: 12,
                    color: '#b3261e',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Remove photo
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <form
          key={ver + u.email + u.name}
          onSubmit={saveProfile}
          style={{ marginTop: 20 }}
        >
          <Field label="Full name">
            <input name="n" defaultValue={u.name} />
          </Field>
          <Field label="Email address">
            <input name="e" type="email" defaultValue={u.email} />
          </Field>
          {customer ? (
            <Field label="Mobile number">
              <input name="m" defaultValue={u.mobile} />
            </Field>
          ) : null}
          <Field label="Current password (needed to change your email)">
            <input name="cp" type="password" />
          </Field>
          <div className="err">{er}</div>
          <button className="btn btn-primary">Save profile</button>
        </form>
      </div>
    )
  } else if (tab === 'saved' && customer) {
    h = (
      <div className="panel">
        <h3>Saved food ({sv.length})</h3>
        {sv.length ? (
          <div className="food-grid">
            {sv.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <>
            <p className="muted">Tap the heart on any food to save it.</p>
            <button
              className="btn btn-soft btn-small"
              onClick={() => go('search')}
            >
              Explore food
            </button>
          </>
        )}
      </div>
    )
  } else if (tab === 'feedback' && customer) {
    h = (
      <div className="panel">
        <h3>My feedback</h3>
        {R.length ? (
          R.map((r) => (
            <div className="rev" key={r.id}>
              <b>{bz(r.bid)?.name || '(removed shop)'}</b>{' '}
              <span className="stars">
                <Icon name="star" /> {r.score}
              </span>{' '}
              <span className="status verified">
                {r.verified ? 'Verified' : 'Pending'}
              </span>
              <p>{r.comment}</p>
              <span className="muted">{fd(r.at)}</span> ·{' '}
              <Link className="link" to={`/review/${r.bid}`}>
                Edit
              </Link>
            </div>
          ))
        ) : (
          <>
            <p className="muted">You have not reviewed a shop yet.</p>
            <button
              className="btn btn-soft btn-small"
              onClick={() => go('review')}
            >
              Review a shop
            </button>
          </>
        )}
      </div>
    )
  } else if (tab === 'password') {
    h = (
      <div className="panel">
        <h3>Change password</h3>
        <form onSubmit={changePw}>
          <Field label="Current password">
            <input name="o" type="password" />
          </Field>
          <Field label="New password">
            <input name="p" type="password" />
          </Field>
          <Field label="Confirm new password">
            <input name="c" type="password" />
          </Field>
          <div className="err">{er2}</div>
          <button className="btn btn-ghost">Change password</button>
        </form>
      </div>
    )
  }

  return (
    <section className="container dashboard">
      <Sidebar
        base="profile"
        items={T}
        tab={tab}
        back={
          !customer
            ? { go: dashPath(u), label: 'Back to dashboard' }
            : { go: 'home', label: 'Back to home' }
        }
      />
      <div className="dash-main">{h}</div>
    </section>
  )
}
