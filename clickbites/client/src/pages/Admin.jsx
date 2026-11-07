import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ReviewCard } from '../components/Cards'
import { DataTable, Field, Rate, Sidebar } from '../components/ui'
import { useApp } from '../context/AppContext'
import { friendly, sbErrBody } from '../lib/utils'
import { sb } from '../lib/supabase'

const TABS = [
  ['dashboard', 'Dashboard', 'chart'],
  ['shops', 'Shops & owners', 'store'],
  ['users', 'Users', 'users'],
  ['categories', 'Categories', 'tag'],
  ['reviews', 'Reviews', 'review'],
  ['settings', 'Settings', 'settings'],
]
const HEADS = ['Shop', 'Owner', 'Location', 'Rating', 'Action']

export default function Admin() {
  const { tab = 'dashboard' } = useParams()
  const { db, bz, cat, go, role, need, err, toast, reload } = useApp()
  const [er, setEr] = useState('')
  const [ver, setVer] = useState(0)

  const refreshAfter = async () => {
    await reload()
  }

  /* ---------- actions ---------- */
  const editAddress = async (id) => {
    if (!role('admin')) return
    const b = bz(id),
      a = window.prompt('Business address / location', b.address)
    if (a !== null) {
      if (
        !need(
          await sb
            .from('shops')
            .update({ address: a.trim() })
            .eq('id', Number(id)),
        )
      )
        return
      await refreshAfter()
    }
  }
  const deleteShop = async (id) => {
    if (
      !role('admin') ||
      !window.confirm(
        'Remove this listing with its products, codes and feedback?',
      )
    )
      return
    if (!need(await sb.from('shops').delete().eq('id', Number(id)))) return
    await refreshAfter()
  }
  const editUser = async (id) => {
    if (!role('admin')) return
    const u = db.users.find((x) => x.id === id),
      n = window.prompt('Full name', u.name)
    if (n !== null && n.trim()) {
      if (
        !need(await sb.from('profiles').update({ name: n.trim() }).eq('id', id))
      )
        return
      await refreshAfter()
    }
  }
  const toggleUser = async (id) => {
    if (!role('admin')) return
    const u = db.users.find((x) => x.id === id)
    if (
      !need(
        await sb.rpc('admin_set_user_active', {
          p_user_id: id,
          p_active: !u.active,
        }),
      )
    )
      return
    await refreshAfter()
  }
  const renameCat = async (id) => {
    if (!role('admin')) return
    const c = cat(id),
      n = window.prompt('Rename category', c.name)
    if (n?.trim()) {
      if (
        !need(
          await sb
            .from('categories')
            .update({ name: n.trim() })
            .eq('id', Number(id)),
        )
      )
        return
      await refreshAfter()
    }
  }
  const deleteCat = async (id) => {
    if (!role('admin')) return
    const n = db.products.filter((p) => p.cat === id).length
    if (n)
      return err(
        `Cannot delete: ${n} product(s) (active or inactive) still use this category.`,
      )
    if (!need(await sb.from('categories').delete().eq('id', Number(id)))) return
    await refreshAfter()
  }
  const deleteReview = async (id) => {
    if (!role('admin')) return
    if (!need(await sb.from('reviews').delete().eq('id', Number(id)))) return
    await refreshAfter()
  }

  const createOwner = async (ev) => {
    ev.preventDefault()
    if (!role('admin')) return
    const form = ev.currentTarget
    const f = form.elements
    const e = f.e.value.trim().toLowerCase()
    if (!f.n.value.trim() || !e || !f.b.value.trim())
      return setEr('Owner name, email and business name are required.')
    if (
      f.p.value.length < 8 ||
      !/[a-zA-Z]/.test(f.p.value) ||
      !/[0-9]/.test(f.p.value)
    )
      return setEr(
        'Initial password needs 8+ characters with a letter and a number.',
      )
    const ins = await sb
      .from('shops')
      .insert({
        name: f.b.value.trim(),
        address: f.a.value.trim(),
        category: 'Local Food',
      })
      .select('id')
      .single()
    if (ins.error) return setEr(friendly(ins.error))
    const r = await sb.functions.invoke('create-owner', {
      body: {
        email: e,
        password: f.p.value,
        name: f.n.value.trim(),
        shop_id: ins.data.id,
      },
    })
    if (r.error) {
      await sb.from('shops').delete().eq('id', ins.data.id)
      return setEr(await sbErrBody(r.error))
    }
    setEr('')
    form.reset()
    await refreshAfter()
    toast('Owner account and shop created.')
    setVer((v) => v + 1)
  }

  const addCategory = async (ev) => {
    ev.preventDefault()
    if (!role('admin')) return
    const form = ev.currentTarget
    const n = form.elements.n.value.trim()
    if (!n) return
    if (db.cats.some((c) => c.name.toLowerCase() === n.toLowerCase()))
      return err('That category already exists.')
    if (!need(await sb.from('categories').insert({ name: n }))) return
    form.reset()
    await refreshAfter()
  }

  /* ---------- pieces ---------- */
  const shopRows = (acts) =>
    db.businesses.map((b) => (
      <tr key={b.id}>
        <td>{b.name}</td>
        <td>{db.users.find((u) => u.id === b.owner)?.email}</td>
        <td>{b.address}</td>
        <td>
          <Rate bid={b.id} />
        </td>
        <td>
          <button
            className="btn btn-ghost btn-small"
            onClick={() => go(`shop/${b.id}`)}
          >
            View
          </button>
          {acts ? (
            <>
              {' '}
              <button
                className="btn btn-ghost btn-small"
                onClick={() => editAddress(b.id)}
              >
                Edit location
              </button>{' '}
              <button
                className="btn btn-danger btn-small"
                onClick={() => deleteShop(b.id)}
              >
                Remove
              </button>
            </>
          ) : null}
        </td>
      </tr>
    ))

  let h = null
  if (tab === 'dashboard') {
    const userCount = db.users.filter((u) => u.role === 'normal_user').length
    const ownerCount = db.users.filter(
      (u) => u.role === 'business_owner',
    ).length
    const shopCount = db.businesses.length
    const reviewCount = db.ratings.length
    const categoryCount = db.cats.length

    const totalUsers = Math.max(1, userCount + ownerCount)
    const userDeg = (userCount / totalUsers) * 360
    const metricTotal = Math.max(1, shopCount + reviewCount + categoryCount)
    const d1 = (shopCount / metricTotal) * 360,
      d2 = d1 + (reviewCount / metricTotal) * 360
    const metricPie = `conic-gradient(#3b82f6 0deg ${d1}deg, #10b981 ${d1}deg ${d2}deg, #f59e0b ${d2}deg 360deg)`

    const Legend = ({ color, label, n }) => (
      <div className="pie-legend-item">
        <div className="pie-legend-left">
          <span className="pie-color-box" style={{ background: color }}></span>{' '}
          {label}
        </div>
        <strong>{n}</strong>
      </div>
    )

    h = (
      <>
        <div className="stats-chart-grid">
          <div className="chart-panel">
            <h3>Users Distribution</h3>
            <div
              className="pie-container"
              style={{
                background: `conic-gradient(#d35400 0deg ${userDeg}deg, #e67e22 ${userDeg}deg 360deg)`,
              }}
            ></div>
            <div className="pie-legend">
              <Legend color="#d35400" label="Customers" n={userCount} />
              <Legend color="#e67e22" label="Business Owners" n={ownerCount} />
            </div>
          </div>
          <div className="chart-panel">
            <h3>Platform Metrics Overview</h3>
            <div
              className="pie-container"
              style={{ background: metricPie }}
            ></div>
            <div className="pie-legend">
              <Legend color="#3b82f6" label="Local Shops" n={shopCount} />
              <Legend
                color="#10b981"
                label="Feedback Entries"
                n={reviewCount}
              />
              <Legend color="#f59e0b" label="Categories" n={categoryCount} />
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="results-head">
            <h3>Local shop listings</h3>
            <button
              className="btn btn-primary btn-small"
              onClick={() => go('admin/shops')}
            >
              + Add owner account
            </button>
          </div>
          <DataTable head={HEADS} rows={shopRows(false)} empty="No shops." />
        </div>
      </>
    )
  }

  if (tab === 'shops')
    h = (
      <>
        <div className="admin-form-panel">
          <h3>Create business owner account</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Set up a new owner profile and associate their local business
            listing instantly.
          </p>
          <form key={ver} onSubmit={createOwner}>
            <div className="row" style={{ marginBottom: 12 }}>
              <Field label="Owner name">
                <input name="n" placeholder="e.g. Juan Dela Cruz" />
              </Field>
              <Field label="Owner email">
                <input name="e" type="email" placeholder="owner@demo.ph" />
              </Field>
              <Field label="Initial password (min 8)">
                <input name="p" type="password" placeholder="••••••••" />
              </Field>
            </div>
            <div className="row" style={{ marginBottom: 16 }}>
              <Field label="Business name">
                <input name="b" placeholder="e.g. Calbayog Grill" />
              </Field>
              <Field label="Business address / location">
                <input name="a" placeholder="e.g. Rueda St., Calbayog City" />
              </Field>
            </div>
            <div className="err">{er}</div>
            <button
              className="btn btn-primary"
              style={{ padding: '10px 24px', borderRadius: 12 }}
            >
              Create owner &amp; shop
            </button>
          </form>
        </div>
        <div className="panel">
          <div className="results-head">
            <h3 style={{ margin: 0 }}>Registered local shops</h3>
          </div>
          <DataTable head={HEADS} rows={shopRows(true)} empty="No shops." />
        </div>
      </>
    )

  if (tab === 'users')
    h = (
      <div className="panel">
        <DataTable
          head={['User', 'Role', 'UCID', 'Status', 'Action']}
          empty="No users yet."
          rows={db.users
            .filter((u) => u.role !== 'admin')
            .map((u) => (
              <tr key={u.id}>
                <td>
                  {u.name || '—'}
                  <br />
                  <span className="muted">{u.email}</span>
                </td>
                <td>{u.role.replace('_', ' ')}</td>
                <td>{u.ucid || '—'}</td>
                <td>
                  <span
                    className={`status ${u.active ? 'verified' : 'suspended'}`}
                  >
                    {u.active ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => editUser(u.id)}
                  >
                    Edit
                  </button>{' '}
                  <button
                    className={`btn ${u.active ? 'btn-danger' : 'btn-soft'} btn-small`}
                    onClick={() => toggleUser(u.id)}
                  >
                    {u.active ? 'Suspend' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
        />
      </div>
    )

  if (tab === 'categories')
    h = (
      <>
        <div className="admin-form-panel" style={{ marginBottom: 20 }}>
          <h3>Add New Category</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
            Create product categories to organize local menu items across shops.
          </p>
          <form
            onSubmit={addCategory}
            style={{
              display: 'flex',
              gap: 14,
              alignItems: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <div
              className="field"
              style={{ margin: 0, flex: 1, minWidth: 240 }}
            >
              <label>Category name</label>
              <input
                name="n"
                placeholder="e.g. Bakery & Pastries"
                style={{ height: 44 }}
              />
            </div>
            <button
              className="btn btn-primary"
              style={{
                height: 44,
                padding: '0 24px',
                borderRadius: 12,
                flexShrink: 0,
              }}
            >
              Add Category
            </button>
          </form>
        </div>
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="results-head">
            <h3 style={{ margin: 0 }}>Existing Categories</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', width: '40%' }}>Category</th>
                  <th style={{ textAlign: 'left', width: '30%' }}>Products</th>
                  <th style={{ textAlign: 'right', width: '30%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {db.cats.length ? (
                  db.cats.map((c) => (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'left' }}>
                        <strong>{c.name}</strong>
                      </td>
                      <td style={{ textAlign: 'left' }}>
                        <span className="pill">
                          {db.products.filter((p) => p.cat === c.id).length}{' '}
                          items
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-small"
                          onClick={() => renameCat(c.id)}
                        >
                          Rename
                        </button>{' '}
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => deleteCat(c.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="muted"
                      style={{ textAlign: 'center' }}
                    >
                      No categories.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )

  if (tab === 'reviews')
    h = (
      <div className="panel">
        <h3>Moderation</h3>
        {db.ratings.length ? (
          [...db.ratings]
            .sort((x, y) => y.at - x.at)
            .map((r) => (
              <ReviewCard
                key={r.id}
                r={r}
                adminInfo
                shopName={bz(r.bid)?.name || 'Removed shop'}
                removable
                onRemove={deleteReview}
              />
            ))
        ) : (
          <p className="muted">No feedback to moderate.</p>
        )}
      </div>
    )

  if (tab === 'settings')
    h = (
      <div className="panel">
        <h3>Account settings</h3>
        <button className="btn btn-primary" onClick={() => go('profile')}>
          Open profile
        </button>
      </div>
    )

  return (
    <section className="container dashboard">
      <Sidebar base="admin" items={TABS} tab={tab} />
      <div className="dash-main">
        <div className="dash-header">
          <div>
            <div className="eyebrow">Administrator portal</div>
            <h2>{(TABS.find((x) => x[0] === tab) || TABS[0])[1]}</h2>
          </div>
          <span className="pill">Administrator</span>
        </div>
        {h}
      </div>
    </section>
  )
}
