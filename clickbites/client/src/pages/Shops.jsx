import SearchBox from '../components/SearchBox'
import { ShopCard } from '../components/Cards'
import { BackLink, EmptyBox } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useBizOK } from './Search'

export default function Shops() {
  const { db, F, patchF, resetFilters, avg } = useApp()
  const bizOK = useBizOK()
  const q = F.shopsQ.toLowerCase()
  const L = db.businesses.filter(
    (b) =>
      bizOK(b) &&
      (!q ||
        b.name.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q)),
  )
  if (F.sort === 'rating') L.sort((a, b) => avg(b.id).a - avg(a.id).a)

  const getSuggestions = (val) =>
    db.businesses
      .filter(
        (b) =>
          b.name.toLowerCase().startsWith(val) ||
          (b.address && b.address.toLowerCase().includes(val)),
      )
      .map((b) => ({
        key: b.id,
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '8px 12px',
          gap: 2,
        },
        label: (
          <>
            <strong style={{ fontSize: 14, color: 'var(--navy)' }}>
              {b.name}
            </strong>
            <small
              className="muted"
              style={{
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              📍 {b.address || 'Calbayog City'}
            </small>
          </>
        ),
        onPick: () => patchF({ shopsQ: b.name }),
      }))

  return (
    <section className="section">
      <div className="container">
        {F.shopsQ !== '' ? (
          <BackLink
            onClick={() => patchF({ shopsQ: '' })}
            label="Back to all shops"
          />
        ) : null}
        <SearchBox
          value={F.shopsQ}
          placeholder="Search shops by name or address..."
          ariaLabel="Search shops"
          style={{ maxWidth: 'none', marginBottom: 22 }}
          getSuggestions={getSuggestions}
          onSubmit={(v) => patchF({ shopsQ: v })}
        />
        <div className="results-head">
          <div>
            <strong>{L.length} local shops found</strong>
          </div>
        </div>
        {L.length ? (
          <div className="food-grid shop-list">
            {L.map((b) => (
              <ShopCard key={b.id} b={b} />
            ))}
          </div>
        ) : (
          <EmptyBox
            icon="store"
            title="No shops found"
            text="Try searching for a different shop name or clear search."
          >
            <button className="btn btn-soft" onClick={resetFilters}>
              Clear search
            </button>
          </EmptyBox>
        )}
      </div>
    </section>
  )
}
