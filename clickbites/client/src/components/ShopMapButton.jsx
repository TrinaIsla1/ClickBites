import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const CENTER = [12.07, 124.6] // Calbayog City
const CACHE_KEY = 'cb-geocode-v1'

/* Remember found coordinates so the map loads instantly the next time */
const geoCache = new Map()
try {
  Object.entries(JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')).forEach(
    ([k, v]) => geoCache.set(k, v),
  )
} catch {
  /* ignore */
}
const saveCache = () => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify(Object.fromEntries(geoCache)),
    )
  } catch {
    /* ignore */
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const fullAddress = (shop) =>
  `${shop.address}, Calbayog City, Samar, Philippines`
const directionsUrl = (shop) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(shop))}`

let leafletPromise = null
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (leafletPromise) return leafletPromise
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = LEAFLET_CSS
      document.head.appendChild(css)
    }
    const js = document.createElement('script')
    js.src = LEAFLET_JS
    js.onload = () => resolve(window.L)
    js.onerror = () => {
      leafletPromise = null
      reject(new Error('Leaflet failed to load'))
    }
    document.head.appendChild(js)
  })
  return leafletPromise
}

async function geocode(address) {
  if (geoCache.has(address))
    return { point: geoCache.get(address), cached: true }
  const res = await fetch(
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(address),
  )
  const results = await res.json()
  const point = results.length
    ? [Number(results[0].lat), Number(results[0].lon)]
    : null
  geoCache.set(address, point)
  saveCache()
  return { point, cached: false }
}

/* all = true  -> every partnered shop on one map (Shops page, OpenStreetMap).
               focusId = zoom to that shop and open its popup.
   all = false -> one shop on a Google map (Shop page) */
export default function ShopMapButton({
  shops = [],
  all = false,
  focusId = null,
}) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const mapEl = useRef(null)
  const map = useRef(null)
  const markers = useRef([])

  const located = shops.filter((s) => s.address)
  const shop = located[0]

  const shopsRef = useRef(shops)
  shopsRef.current = shops
  const shopsKey = shops.map((s) => `${s.id}|${s.address}`).join(';')

  /* All-shops map */
  useEffect(() => {
    if (!open || !all) return
    let cancelled = false

    ;(async () => {
      setStatus('Loading map...')
      try {
        const L = await loadLeaflet()
        if (cancelled) return

        if (!map.current) {
          map.current = L.map(mapEl.current).setView(CENTER, 13)
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(map.current)
        }
        const m = map.current
        markers.current.forEach((x) => m.removeLayer(x.marker))
        markers.current = []

        const list = shopsRef.current.filter((s) => s.address)
        if (!list.length) {
          setStatus('No shop locations available.')
          return
        }

        const coords = []
        for (let i = 0; i < list.length; i++) {
          const s = list[i]
          setStatus(`Locating shops... ${i + 1}/${list.length}`)
          try {
            const { point, cached } = await geocode(fullAddress(s))
            if (cancelled) return
            if (point) {
              coords.push(point)

              const box = document.createElement('div')
              const name = document.createElement('strong')
              name.textContent = s.name || 'ClickBites Shop'
              const link = document.createElement('a')
              link.href = directionsUrl(s)
              link.target = '_blank'
              link.rel = 'noopener noreferrer'
              link.textContent = 'Get Directions'
              box.append(
                name,
                document.createElement('br'),
                s.address,
                document.createElement('br'),
                link,
              )
              const marker = L.marker(point).addTo(m).bindPopup(box)
              markers.current.push({ id: s.id, marker, point })
            }
            /* Nominatim allows about 1 request per second */
            if (!cached && i < list.length - 1) await sleep(1100)
          } catch (err) {
            console.error('Unable to locate shop:', s.name, err)
          }
        }
        if (cancelled) return

        const focused = focusId
          ? markers.current.find((x) => x.id === focusId)
          : null

        if (focused) {
          m.setView(focused.point, 16)
          focused.marker.openPopup()
          setStatus(`Showing ${list.find((s) => s.id === focusId)?.name}.`)
        } else if (coords.length) {
          m.fitBounds(coords, { padding: [40, 40], maxZoom: 15 })
          setStatus(`${coords.length} of ${list.length} shop locations shown.`)
        } else {
          m.setView(CENTER, 13)
          setStatus('No exact locations found. Please check shop addresses.')
        }
        setTimeout(() => m.invalidateSize(), 200)
      } catch (err) {
        console.error(err)
        if (!cancelled) setStatus('Unable to load the map. Please try again.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, all, shopsKey, focusId])

  /* Close on Escape */
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  /* Tear the map down when leaving the page */
  useEffect(
    () => () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    },
    [],
  )

  return createPortal(
    <>
      <button
        type="button"
        className="gps-location-btn"
        title="View Shop Locations"
        aria-label="View shop locations"
        onClick={() => setOpen(true)}
      >
        <svg
          viewBox="0 0 24 24"
          width="32"
          height="32"
          fill="none"
          stroke="#A91D3A"
          strokeWidth="2"
        >
          <path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z" />
          <circle cx="12" cy="9" r="3" fill="#A91D3A" />
        </svg>
      </button>

      <div
        className={`shop-map-overlay${open ? ' active' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
      >
        <div
          className="shop-map-card"
          role="dialog"
          aria-label="Shop locations"
        >
          <div className="shop-map-header">
            <div>
              <h3>{all ? 'Partnered Shops' : 'Shop Location'}</h3>
              <p>
                {all
                  ? 'Explore ClickBites partner shops in Calbayog City'
                  : shop
                    ? shop.address
                    : 'This shop has not added an address yet.'}
              </p>
            </div>
            <button
              type="button"
              className="close-map-btn"
              aria-label="Close map"
              onClick={() => setOpen(false)}
            >
              &times;
            </button>
          </div>

          {all ? (
            <>
              <div id="shopLocationMap" ref={mapEl} />
              <div className="shop-map-status">{status}</div>
            </>
          ) : (
            <>
              <div id="shopLocationMap">
                {open && shop ? (
                  <iframe
                    key={shop.id}
                    title={`${shop.name} location map`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress(shop))}&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : null}
              </div>
              <div className="shop-map-status">
                {shop ? (
                  <a
                    href={directionsUrl(shop)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ display: 'inline-block', textDecoration: 'none' }}
                  >
                    📍 Get Directions
                  </a>
                ) : (
                  'No shop address has been added yet.'
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
