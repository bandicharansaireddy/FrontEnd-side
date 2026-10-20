import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Sprout } from 'lucide-react'
import { api, getApiErrorMessage } from './api'

export type AuthUser = { id: number; fullName: string; email: string; mobile: string; role: string; createdAt: string }
type AuthPayload = { accessToken: string; user: AuthUser }
type AuthContextValue = {
  user: AuthUser | null; accessToken: string | null; resetToken: string | null;
  accept: (payload: AuthPayload) => void; logout: () => Promise<void>; setResetToken: (token: string | null) => void
}
const AuthContext = createContext<AuthContextValue | null>(null)
let startupRefresh: Promise<AuthPayload> | null = null
let accessRefresh: Promise<AuthPayload> | null = null
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error('Auth context missing'); return value }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const accept = (payload: AuthPayload) => { setUser(payload.user); setAccessToken(payload.accessToken) }
  useEffect(() => {
    const interceptor = api.interceptors.request.use(config => {
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
      return config
    })
    const responseInterceptor = api.interceptors.response.use(response => response, async error => {
      const config = error.config as (typeof error.config & { _retried?: boolean }) | undefined
      const url = config?.url || ''
      const isAuthEntry = ['/auth/login','/auth/register','/auth/refresh','/auth/logout','/auth/forgot-password','/auth/verify-otp','/auth/reset-password'].some(path => url.includes(path))
      if (error.response?.status !== 401 || !config || config._retried || isAuthEntry) throw error
      config._retried = true
      try {
        if (!accessRefresh) accessRefresh = api.post<AuthPayload>('/auth/refresh').then(({ data }) => data).finally(() => { accessRefresh = null })
        const payload = await accessRefresh
        accept(payload)
        config.headers.Authorization = `Bearer ${payload.accessToken}`
        return api.request(config)
      } catch (refreshError) {
        setUser(null); setAccessToken(null)
        throw refreshError
      }
    })
    return () => { api.interceptors.request.eject(interceptor); api.interceptors.response.eject(responseInterceptor) }
  }, [accessToken])
  useEffect(() => {
    let alive = true
    if (!startupRefresh) startupRefresh = api.post<AuthPayload>('/auth/refresh').then(({ data }) => data).finally(() => { startupRefresh = null })
    startupRefresh.then(payload => { if (alive) accept(payload) }).catch(() => { /* No stored credentials; remain signed out. */ })
    return () => { alive = false }
  }, [])
  const logout = async () => {
    try { await api.post('/auth/logout') } finally { setAccessToken(null); setUser(null); setResetToken(null) }
  }
  const value = useMemo(() => ({ user, accessToken, resetToken, accept, logout, setResetToken }), [user, accessToken, resetToken])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth(); const location = useLocation()
  return user ? <>{children}</> : <Navigate to="/login" replace state={{ from: location.pathname }}/>
}

function AuthFrame({ eyebrow, title, copy, children }: { eyebrow: string; title: React.ReactNode; copy: string; children: React.ReactNode }) {
  return <main className="auth-page"><section className="auth-art"><div className="auth-orbit">✳</div><span className="eyebrow">FRESHMART / {eyebrow}</span><h1>Good food<br/>for <em>good days.</em></h1><p>{copy}</p><span className="auth-art-note">PICKED WITH CARE · DELIVERED FRESH</span></section><section className="auth-panel"><Link to="/" className="wordmark"><span className="brand-icon"><Sprout size={22}/></span>freshmart<span className="brand-dot">.</span></Link><div className="auth-form-wrap"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{children}</div></section></main>
}
function AuthField({ label, type='text', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="auth-field">{label}<input type={type} {...props}/></label>
}
function ErrorNotice({ message }: { message: string }) { return message ? <p className="auth-error" role="alert">{message}</p> : null }

export function LoginPage() {
  const { accept } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [identifier,setIdentifier]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('')
  return <AuthFrame eyebrow="WELCOME BACK" title={<>Good to see<br/><em>you again.</em></>} copy="Your next good meal is just a few fresh picks away."><form className="auth-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const {data}=await api.post<AuthPayload>('/auth/login',{identifier,password});accept(data);navigate(location.state?.from||'/account',{replace:true})}catch(err){setError(getApiErrorMessage(err,'Could not sign in. Check your details and try again.'))}finally{setBusy(false)}}}><AuthField label="EMAIL OR MOBILE NUMBER" autoComplete="username" required value={identifier} onChange={e=>setIdentifier(e.target.value)}/><AuthField label="PASSWORD" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><div className="auth-row"><Link to="/forgot-password">Forgot password?</Link><span>Secure sign-in</span></div><ErrorNotice message={error}/><button className="button button-dark auth-submit" disabled={busy}>{busy?'SIGNING YOU IN…':'SIGN IN'} <ArrowRight size={17}/></button><p className="auth-switch">New around here? <Link to="/register">Make an account</Link></p></form></AuthFrame>
}

export function RegisterPage() {
  const { accept }=useAuth();const navigate=useNavigate();const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  return <AuthFrame eyebrow="JOIN THE MARKET" title={<>Let’s get<br/><em>you fresh.</em></>} copy="Create an account for easier market runs and a little more good in your day."><form className="auth-form" onSubmit={async e=>{e.preventDefault();const form=new FormData(e.currentTarget);const values=Object.fromEntries(form.entries());setBusy(true);setError('');try{const {data}=await api.post<AuthPayload>('/auth/register',values);accept(data);navigate('/account',{replace:true})}catch(err){setError(getApiErrorMessage(err,'Could not create your account. Please try again.'))}finally{setBusy(false)}}}><AuthField label="FULL NAME" name="fullName" autoComplete="name" minLength={3} maxLength={100} required/><AuthField label="EMAIL ADDRESS" name="email" type="email" autoComplete="email" maxLength={254} required/><AuthField label="MOBILE NUMBER" name="mobile" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} autoComplete="tel" required/><AuthField label="PASSWORD" name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}" title="Use uppercase, lowercase, a number, and a special character" required/><AuthField label="CONFIRM PASSWORD" name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" required/><ErrorNotice message={error}/><button className="button button-dark auth-submit" disabled={busy}>{busy?'CREATING ACCOUNT…':'CREATE ACCOUNT'} <ArrowRight size={17}/></button><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p></form></AuthFrame>
}

export function ForgotPasswordPage() {
  const navigate=useNavigate();const[email,setEmail]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[done,setDone]=useState(false)
  return <AuthFrame eyebrow="ACCOUNT HELP" title={<>Let’s get you<br/><em>back in.</em></>} copy="We’ll send a short-lived verification code if there’s an account for that address."><form className="auth-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api.post('/auth/forgot-password',{email});setDone(true)}catch(err){setError(getApiErrorMessage(err))}finally{setBusy(false)}}}><AuthField label="EMAIL ADDRESS" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/><ErrorNotice message={error}/>{done?<><p className="auth-success">If the account exists, a verification code has been sent.</p><button type="button" className="button button-dark auth-submit" onClick={()=>navigate(`/verify-otp?email=${encodeURIComponent(email)}`)}>ENTER VERIFICATION CODE <ArrowRight size={17}/></button></>:<button className="button button-dark auth-submit" disabled={busy}>{busy?'SENDING…':'SEND VERIFICATION CODE'} <ArrowRight size={17}/></button>}<p className="auth-switch"><Link to="/login">Back to sign in</Link></p></form></AuthFrame>
}

export function VerifyOtpPage() {
  const [params]=useSearchParams();const navigate=useNavigate();const {setResetToken}=useAuth();const[email,setEmail]=useState(params.get('email')||'');const[otp,setOtp]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('')
  return <AuthFrame eyebrow="CHECK YOUR INBOX" title={<>One little<br/><em>code.</em></>} copy="Enter the six digits from your FreshMart verification message. Codes expire after five minutes."><form className="auth-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const {data}=await api.post<{resetToken:string}>('/auth/verify-otp',{email,otp});setResetToken(data.resetToken);navigate('/reset-password')}catch(err){setError(getApiErrorMessage(err,'That code did not work. Request a fresh one and try again.'))}finally{setBusy(false)}}}><AuthField label="EMAIL ADDRESS" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/><AuthField label="SIX-DIGIT CODE" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}/><ErrorNotice message={error}/><button className="button button-dark auth-submit" disabled={busy}>{busy?'CHECKING…':'VERIFY CODE'} <ArrowRight size={17}/></button><p className="auth-switch"><Link to="/forgot-password">Request another code</Link></p></form></AuthFrame>
}

export function ResetPasswordPage() {
  const {resetToken,setResetToken}=useAuth();const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[done,setDone]=useState(false)
  if(!resetToken&&!done)return <Navigate to="/forgot-password" replace/>
  return <AuthFrame eyebrow="NEW PASSWORD" title={<>A fresh<br/><em>start.</em></>} copy="Choose a strong password for your FreshMart account."><form className="auth-form" onSubmit={async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget).entries());setBusy(true);setError('');try{await api.post('/auth/reset-password',{resetToken,...values});setResetToken(null);setDone(true)}catch(err){setError(getApiErrorMessage(err,'That reset link expired. Request a new code.'))}finally{setBusy(false)}}}><AuthField label="NEW PASSWORD" name="newPassword" type="password" minLength={8} maxLength={72} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}" autoComplete="new-password" required/><AuthField label="CONFIRM NEW PASSWORD" name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" required/><ErrorNotice message={error}/>{done?<><p className="auth-success">Password updated. Sign in with your new password.</p><Link to="/login" className="button button-dark auth-submit">GO TO SIGN IN <ArrowRight size={17}/></Link></>:<button className="button button-dark auth-submit" disabled={busy}>{busy?'UPDATING…':'UPDATE PASSWORD'} <ArrowRight size={17}/></button>}</form></AuthFrame>
}

export function AccountPage() {
  const {user,logout}=useAuth();const navigate=useNavigate();const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');const[error,setError]=useState('')
  if(!user)return <Navigate to="/login" replace/>
  return <main className="page-shell account-page"><div className="page-kicker">FRESHMART / <span>YOUR ACCOUNT</span></div><div className="account-banner"><div className="eyebrow">GOOD TO HAVE YOU HERE</div><h1>Hello,<br/><em>{user.fullName.split(' ')[0]}.</em></h1><p>Your FreshMart account is ready for its next good grocery run.</p></div><div className="account-grid"><section className="account-card"><div className="eyebrow">YOUR DETAILS</div><h2>The essentials.</h2><p><span>EMAIL</span>{user.email}</p><p><span>MOBILE</span>{user.mobile}</p><p><span>ACCOUNT</span>{user.role}</p><Link to="/orders" className="button button-dark">VIEW ORDER HISTORY</Link><button className="button account-logout" onClick={async()=>{await logout();navigate('/login',{replace:true})}}>SIGN OUT</button></section><form className="account-card account-password" onSubmit={async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget).entries());setBusy(true);setError('');setMessage('');try{await api.put('/auth/change-password',values);setMessage('Password changed. Your other sessions have been signed out.');e.currentTarget.reset()}catch(err){setError(getApiErrorMessage(err,'Could not change your password.'))}finally{setBusy(false)}}}><div className="eyebrow">KEEP IT SECURE</div><h2>Change password.</h2><AuthField label="CURRENT PASSWORD" name="currentPassword" type="password" autoComplete="current-password" required/><AuthField label="NEW PASSWORD" name="newPassword" type="password" minLength={8} maxLength={72} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,72}" autoComplete="new-password" required/><AuthField label="CONFIRM NEW PASSWORD" name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" required/><ErrorNotice message={error}/>{message&&<p className="auth-success">{message}</p>}<button className="button button-dark" disabled={busy}>{busy?'UPDATING…':'UPDATE PASSWORD'} <ArrowRight size={17}/></button></form></div></main>
}
