import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { BackLink, Field, PasswordInput } from '../components/ui'
import { useApp } from '../context/AppContext'
import { dashPath, friendly, validMob, validPw } from '../lib/utils'
import { sb } from '../lib/supabase'

const COPY = {
  signup: [
    'Create your account',
    'Discover Local Foods that you will like.',
    'Continue',
  ],
  login: ['Welcome back', 'Log in to continue exploring local food.', 'Log in'],
  otp: [
    'Verify your email address',
    'Enter the code we emailed you. It is valid for 5 minutes.',
    'Verify code',
  ],
  forgot: [
    'Reset your password',
    'Enter your account email and we will send you a reset code.',
    'Send reset code',
  ],
  'reset-sms': [
    'Enter your reset code',
    'Type the code from your email and choose a new password.',
    'Save new password',
  ],
}

const Input = ({ name, label, type = 'text', placeholder = '' }) => (
  <Field label={label}>
    {type === 'password' ? (
      <PasswordInput name={name} placeholder={placeholder} />
    ) : (
      <input name={name} type={type} placeholder={placeholder} />
    )}
  </Field>
)

export default function Auth({ type }) {
  const {
    otp,
    setOtp,
    resetInfo,
    setResetInfo,
    login,
    reload,
    go,
    toast,
    err,
  } = useApp()
  const [er, setEr] = useState('')
  useEffect(() => setEr(''), [type])
  const C = COPY[type]

  const onSubmit = async (ev) => {
    ev.preventDefault()
    const f = ev.currentTarget
    const v = (k) => f.elements[k]?.value ?? ''
    setEr('')
    if (type === 'signup') return signup(v, f)
    if (type === 'login') {
      const m = await login(v('e').trim().toLowerCase(), v('p'))
      if (m) setEr(m)
      return
    }
    if (type === 'otp') return verifyOtp(v)
    if (type === 'forgot') return forgot(v)
    if (type === 'reset-sms') return resetPassword(v)
  }

  async function signup(v, f) {
    const e = v('e').trim().toLowerCase(),
      p = v('p'),
      name = v('name').trim(),
      m = v('m').replace(/[\s-]/g, '')
    if (!e || !p) return setEr('Enter your email and password.')
    if (!name && !m && !v('c')) {
      /* shop owners and admins use this same page to log in */
      const msg = await login(e, p)
      return msg && setEr(msg)
    }
    if (!name) return setEr('Please enter your full name.')
    if (!validMob(m))
      return setEr('Enter a valid PH mobile number (09XXXXXXXXX).')
    const pw = validPw(p, v('c'))
    if (pw) return setEr(pw)
    if (!f.elements.t.checked)
      return setEr('Please accept the Terms and Privacy Policy.')
    const { data, error } = await sb.auth.signUp({
      email: e,
      password: p,
      options: { data: { name, phone: m } },
    })
    if (error)
      return setEr(
        /already|registered/i.test(error.message)
          ? 'This email is already registered. Please log in.'
          : /rate|seconds|limit/i.test(error.message)
            ? 'Too many emails were requested. Please wait a few minutes and try again.'
            : friendly(error),
      )
    if (data.user && data.user.identities && data.user.identities.length === 0)
      return setEr('This email is already registered. Please log in.')
    if (data.session) {
      const next = await reload()
      const u = next.me && next.me.active ? next.me : null
      toast('Account created. Your Unique Customer ID is ' + (u?.ucid || ''))
      return go(u ? dashPath(u) : 'login')
    }
    setOtp({ purpose: 'signup', email: e, sent: Date.now() })
    go('otp')
  }

  async function verifyOtp(v) {
    if (!otp) return
    const token = v('o').trim().replace(/\s/g, '')
    if (!/^\d{6,8}$/.test(token))
      return setEr('Enter the code from your email.')
    const { error } = await sb.auth.verifyOtp({
      email: otp.email,
      token,
      type: 'signup',
    })
    if (error)
      return setEr(
        'That code is wrong or has expired. Tap Resend code to get a new one.',
      )
    setOtp(null)
    const next = await reload()
    const u = next.me && next.me.active ? next.me : null
    if (!u) return go('login')
    toast('Account created. Your Unique Customer ID is ' + u.ucid)
    go(dashPath(u))
  }

  async function forgot(v) {
    const e = v('e').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      return setEr('Enter a valid email address.')
    const { error } = await sb.auth.resetPasswordForEmail(e)
    if (error && /rate|seconds|limit/i.test(error.message))
      return setEr('Please wait a minute before requesting another code.')
    setResetInfo({ email: e, sent: Date.now() })
    toast('If that email is registered, a reset code has been sent.')
    go('reset-sms')
  }

  async function resetPassword(v) {
    const pw = validPw(v('p'), v('c'))
    if (!resetInfo) return setEr('Please start again from Forgot password.')
    if (pw) return setEr(pw)
    const token = v('o').trim().replace(/\s/g, '')
    if (!/^\d{6,8}$/.test(token))
      return setEr('Enter the code from your email.')
    const r = await sb.auth.verifyOtp({
      email: resetInfo.email,
      token,
      type: 'recovery',
    })
    if (r.error)
      return setEr('That code is wrong or has expired. Request a new one.')
    const u = await sb.auth.updateUser({ password: v('p') })
    await sb.auth.signOut()
    if (u.error) return setEr(friendly(u.error))
    setResetInfo(null)
    toast('Password updated successfully. Please log in.')
    go('login')
  }

  const resend = async () => {
    if (!otp) return
    const wait = 6e4 - (Date.now() - (otp.sent || 0))
    if (wait > 0)
      return err(
        `Please wait ${Math.ceil(wait / 1e3)}s before requesting a new code.`,
      )
    const { error } = await sb.auth.resend({ type: 'signup', email: otp.email })
    if (error) return err(friendly(error))
    setOtp({ ...otp, sent: Date.now() })
    toast('A new code was sent to your email.')
  }

  const resendReset = async () => {
    if (!resetInfo) return err('Please start again from Forgot password.')
    const wait = 6e4 - (Date.now() - (resetInfo.sent || 0))
    if (wait > 0)
      return err(
        `Please wait ${Math.ceil(wait / 1e3)}s before requesting a new code.`,
      )
    await sb.auth.resetPasswordForEmail(resetInfo.email)
    setResetInfo({ ...resetInfo, sent: Date.now() })
    toast('If that email is registered, a new code was sent.')
  }

  let fields = null
  if (type === 'signup')
    fields = (
      <>
        <Input
          name="name"
          label="Full name (new customers)"
          placeholder="Enter your full name"
        />
        <Input
          name="e"
          label="Email address"
          type="email"
          placeholder="you@example.com"
        />
        <Input
          name="m"
          label="Mobile number (new customers)"
          type="tel"
          placeholder="09XX XXX XXXX"
        />
        <Input
          name="p"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
        />
        <Input
          name="c"
          label="Confirm password (new customers)"
          type="password"
          placeholder="Re-enter password"
        />
        <label className="checkline">
          <input type="checkbox" name="t" /> I agree to the Terms and Privacy
          Policy (new customers).
        </label>
      </>
    )
  if (type === 'login')
    fields = (
      <>
        <Input
          name="e"
          label="Email address"
          type="email"
          placeholder="you@example.com"
        />
        <Input
          name="p"
          label="Password"
          type="password"
          placeholder="Enter your password"
        />
        <div style={{ textAlign: 'right', marginBottom: 15 }}>
          <Link className="link" to="/forgot">
            Forgot password?
          </Link>
        </div>
      </>
    )
  if (type === 'otp')
    fields = !otp ? null : (
      <>
        <div className="mail">
          We sent a code to <b>{otp.email}</b>. Check your inbox (and spam
          folder).
        </div>
        <Input
          name="o"
          label="Verification code"
          placeholder="Enter the code"
        />
        <button
          className="btn btn-ghost btn-small"
          type="button"
          onClick={resend}
        >
          Resend code
        </button>
      </>
    )
  if (type === 'forgot')
    fields = (
      <Input
        name="e"
        label="Email address"
        type="email"
        placeholder="you@example.com"
      />
    )
  if (type === 'reset-sms')
    fields = (
      <>
        <Input
          name="o"
          label="Reset code from your email"
          placeholder="Enter the code"
        />
        <Input
          name="p"
          label="New password"
          type="password"
          placeholder="At least 8 characters"
        />
        <Input
          name="c"
          label="Confirm new password"
          type="password"
          placeholder="Re-enter new password"
        />
        <button
          className="btn btn-ghost btn-small"
          type="button"
          onClick={resendReset}
        >
          Send a new code
        </button>
      </>
    )

  const foot = {
    signup: (
      <>
        Already have an account?{' '}
        <Link className="link" to="/login">
          Log in
        </Link>
      </>
    ),
    login: (
      <>
        New to ClickBites?{' '}
        <Link className="link" to="/signup">
          Create an account
        </Link>
      </>
    ),
    otp: (
      <>
        Wrong email?{' '}
        <Link className="link" to="/signup">
          Go back
        </Link>
      </>
    ),
    forgot: (
      <>
        Remembered it?{' '}
        <Link className="link" to="/login">
          Log in
        </Link>
      </>
    ),
    'reset-sms': (
      <Link className="link" to="/login">
        Back to log in
      </Link>
    ),
  }[type]

  const back =
    type === 'otp'
      ? { to: 'signup', label: 'Back to sign up' }
      : type === 'reset-sms'
        ? { to: 'login', label: 'Back to log in' }
        : { to: 'home', label: 'Back' }

  return (
    <section className="container auth-page">
      <BackLink onClick={() => go(back.to)} label={back.label} />
      <div className="auth-wrap">
        <aside className="auth-aside">
          <div>
            <div className="brand">
              <span className="brand-mark">
                <img src="/logo.jpg" alt="" />
              </span>
              <span>
                Click<span style={{ color: 'var(--lavender)' }}>Bites</span>
              </span>
            </div>
            <h2 style={{ marginTop: 35 }}>
              Support local.
              <br />
              Eat local.
              <br />
              Love local.
            </h2>
            <p>Discover the food and people that make Calbayog City special.</p>
          </div>
          <div className="art">
            <Icon name="utensils" />
          </div>
          <small>Food discovery starts here.</small>
        </aside>
        <div className="auth-card">
          <div className="eyebrow">ClickBites account</div>
          <h2>{C[0]}</h2>
          <p className="muted">{C[1]}</p>
          <form key={type} onSubmit={onSubmit} noValidate>
            {fields}
            <div className="err">{er}</div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 5 }}
              disabled={type === 'otp' && !otp}
            >
              {C[2]}
            </button>
          </form>
          <p className="form-note" style={{ marginTop: 18 }}>
            {foot}
          </p>
        </div>
      </div>
    </section>
  )
}
