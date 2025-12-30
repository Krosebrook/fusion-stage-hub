# Security Policy

## Overview

Security is a top priority for Fusion Stage Hub. This document outlines our security practices, known considerations, and how to report vulnerabilities.

---

## Reporting a Vulnerability

### How to Report

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, please report security issues via:

1. **Email**: Send details to `security@fusionstagehub.com` (or repository owner's email)
2. **GitHub Security Advisory**: Use the "Security" tab → "Report a vulnerability"

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your contact information for follow-up

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution**: Depends on severity (critical issues prioritized)
- **Disclosure**: Coordinated disclosure after patch is released

### Recognition

We appreciate responsible disclosure. With your permission, we will:
- Credit you in the CHANGELOG and security advisory
- Add you to our Security Hall of Fame
- Provide swag or bounty (if program is active)

---

## Security Considerations

### 1. Authentication & Authorization

#### Current Implementation (v0.1.0 - MVP)

**Status**: ⚠️ **Not Production-Ready**

- Supabase Auth integrated in codebase
- Row Level Security (RLS) policies defined in database
- JWT-based session management
- **However**: Auth flow not fully implemented in UI

**Risks**:
- No password strength requirements
- No multi-factor authentication (MFA)
- No session timeout enforcement
- No brute force protection

**Planned Improvements (v0.2.0+)**:
- [ ] Implement full authentication flow
- [ ] Add MFA support (TOTP)
- [ ] Enforce password complexity rules
- [ ] Rate limit login attempts
- [ ] Session timeout (configurable)
- [ ] Password breach detection (HaveIBeenPwned)

---

### 2. Data Isolation (Multi-Tenancy)

#### Row Level Security (RLS)

All database tables enforce organization-scoped queries via RLS policies:

```sql
-- Example: Users can only see jobs in their org
CREATE POLICY "Users view own org jobs"
ON jobs FOR SELECT
USING (org_id IN (
  SELECT org_id FROM org_members
  WHERE user_id = auth.uid()
));
```

**Protection Against**:
- Cross-organization data leakage
- Unauthorized data access
- Privilege escalation

**Testing**:
- Automated RLS tests in CI
- Penetration testing (planned for v0.5.0)

---

### 3. Credential Storage

#### API Keys & OAuth Tokens

**Current**: Stored in `stores.credentials_encrypted` column

**Encryption**:
- **At Rest**: Supabase Vault (AES-256)
- **In Transit**: TLS 1.3
- **In Memory**: Edge Functions decrypt on-demand, never logged

**Best Practices**:
- Credentials never sent to frontend
- Decryption only in secure Edge Functions
- Automatic rotation recommended (manual for now)
- Audit log for credential access

**Example**:
```typescript
// Edge Function - decrypts credentials
const credentials = await vault.decrypt(store.credentials_encrypted);
const client = new ShopifyClient(credentials.accessToken);
```

**Future Enhancements**:
- [ ] Key rotation automation (v0.5.0)
- [ ] HashiCorp Vault integration (v1.0.0)
- [ ] Credential expiry monitoring

---

### 4. API Security

#### Rate Limiting

**Purpose**: Prevent abuse and respect platform API limits

**Implementation**:
- Token bucket algorithm per store
- Rate limits defined in `plugin_contracts.constraints`
- Queue backpressure when limits reached

**Example Limits**:
- Shopify: 1000 cost points/second
- Etsy: 10 requests/second
- Printify: 5 requests/second

#### CORS Configuration

**Current** (Vite dev server):
```typescript
// vite.config.ts
server: {
  cors: {
    origin: ['http://localhost:8080'],
    credentials: true,
  }
}
```

**Production** (Supabase Edge Functions):
- Allow only frontend domain
- Credentials: `true` (for cookies)
- Methods: `GET, POST, PUT, DELETE`

#### Input Validation

**Frontend**: Zod schemas for form validation

```typescript
const productSchema = z.object({
  title: z.string().min(1).max(255),
  price: z.number().positive(),
  sku: z.string().regex(/^[A-Z0-9-]+$/),
});
```

**Backend** (planned): Validate again in Edge Functions

**Protection Against**:
- SQL Injection (PostgreSQL parameterized queries)
- XSS (React auto-escaping + CSP headers)
- CSRF (SameSite cookies)

---

### 5. Audit Logging

#### What We Log

All critical operations logged to `audit_logs` table:

- User actions (create, update, delete)
- Approval decisions
- Store connections/disconnections
- Job executions
- Failed authentication attempts
- Permission changes

**Log Structure**:
```typescript
interface AuditLog {
  id: string;
  org_id: string;
  user_id: string;
  action: string; // "product.create", "approval.approve"
  resource_type: string;
  resource_id: string;
  metadata: object; // before/after state
  ip_address: string;
  user_agent: string;
  timestamp: Date;
}
```

#### Retention

- Active logs: 90 days
- Archived logs: 7 years (compliance)
- Export available for compliance teams

---

### 6. Dependencies

#### Vulnerability Scanning

**Tools**:
- `npm audit` (manual, for now)
- GitHub Dependabot (enabled)
- Snyk (planned for v0.3.0)

**Process**:
1. Dependabot opens PR for security updates
2. Review and test changes
3. Merge and deploy ASAP for critical issues

**Current Status** (Dec 2024):
- ✅ 0 known high/critical vulnerabilities
- ⚠️ 2 moderate vulnerabilities (in dev dependencies)

#### Supply Chain Security

- Pin dependencies to exact versions (`package-lock.json`)
- Review dependency changes in PRs
- Avoid dependencies with excessive permissions
- Prefer well-maintained libraries (React, Supabase, shadcn/ui)

---

### 7. Frontend Security

#### Content Security Policy (CSP)

**Planned for Production**:
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co;
  font-src 'self';
  frame-ancestors 'none';
```

**Protection Against**:
- XSS attacks
- Clickjacking
- Data exfiltration

#### Sensitive Data in Browser

**Avoid**:
- Storing credentials in localStorage
- Logging sensitive data to console
- Including secrets in client-side code

**Current Approach**:
- JWT stored in memory (TanStack Query state)
- Supabase client handles token refresh
- Credentials never sent to frontend

---

### 8. Infrastructure Security

#### Supabase Security Features

- **Database**: PostgreSQL with RLS
- **Auth**: Supabase Auth with JWT
- **Storage**: Row-level access control
- **Edge Functions**: Deno runtime (secure by default)
- **Network**: TLS 1.3 everywhere

#### Hosting Security (Production)

**Planned**:
- Frontend: Vercel/Netlify (CDN, DDoS protection)
- Backend: Supabase (managed, SOC 2 compliant)
- Monitoring: Datadog/Sentry for anomaly detection

---

### 9. Incident Response Plan

#### Severity Levels

**Critical** (P0):
- Data breach or leak
- Service outage > 1 hour
- Credential compromise
- RCE vulnerability

**High** (P1):
- Authentication bypass
- Privilege escalation
- Sensitive data exposure

**Medium** (P2):
- XSS vulnerability
- CSRF vulnerability
- DoS vulnerability

**Low** (P3):
- Information disclosure (non-sensitive)
- Minor UI issues

#### Response Procedure

1. **Detection**: Automated alerts or user report
2. **Triage**: Assess severity and impact
3. **Containment**: Disable affected features, revoke credentials
4. **Investigation**: Root cause analysis
5. **Remediation**: Patch and deploy fix
6. **Communication**: Notify affected users (if applicable)
7. **Post-Mortem**: Document incident and lessons learned

---

## Security Checklist (Pre-Launch)

### v0.2.0 (Alpha)
- [ ] Authentication flow fully functional
- [ ] RLS policies tested for all tables
- [ ] Rate limiting enforced
- [ ] Audit logging for critical actions
- [ ] Dependencies scanned for vulnerabilities

### v0.5.0 (RC)
- [ ] Penetration testing completed
- [ ] Security audit by third-party
- [ ] CSP headers configured
- [ ] MFA available for users
- [ ] Incident response plan documented

### v1.0.0 (Production)
- [ ] All security recommendations implemented
- [ ] SOC 2 compliance (if required)
- [ ] Bug bounty program launched
- [ ] Security training for team
- [ ] Regular security audits scheduled

---

## Compliance

### GDPR (General Data Protection Regulation)

**Applicable**: Yes, if EU users

**Requirements**:
- [ ] Data processing agreement with Supabase
- [ ] User consent for data collection
- [ ] Right to access (export user data)
- [ ] Right to deletion (GDPR delete)
- [ ] Data breach notification (72 hours)

**Implementation**:
- User profile export function
- Account deletion with cascade
- Privacy policy and ToS

### CCPA (California Consumer Privacy Act)

**Applicable**: Yes, if CA users

**Requirements**:
- Similar to GDPR
- "Do Not Sell My Data" option

### PCI DSS (Payment Card Industry)

**Applicable**: No, we don't handle payment cards directly

- Shopify/Etsy/Gumroad handle payments
- We only sync order metadata (no PAN/CVV)

---

## Security Best Practices for Users

### For Operators

1. **Use strong passwords** (12+ characters, mixed case, symbols)
2. **Enable MFA** when available
3. **Don't share credentials** with team members (invite them instead)
4. **Review audit logs** regularly
5. **Disconnect unused stores**

### For Administrators

1. **Principle of least privilege**: Assign `viewer` role by default
2. **Regular access reviews**: Remove inactive users
3. **Approval policies**: Require approval for high-value operations
4. **Monitor failed login attempts**
5. **Keep API credentials rotated** (every 90 days)

### For Developers

1. **Never commit secrets** to Git
2. **Use environment variables** for configuration
3. **Review PRs for security issues**
4. **Keep dependencies updated**
5. **Run `npm audit` before releases**

---

## Threat Model

### Assets

- User data (profiles, organizations)
- Store credentials (OAuth tokens, API keys)
- Product catalog data
- Order information
- Audit logs

### Threats

1. **Unauthorized Access**: Attacker gains access to another org's data
   - **Mitigation**: RLS policies, authentication
   
2. **Credential Theft**: API keys leaked or stolen
   - **Mitigation**: Encryption at rest, no client-side exposure
   
3. **Data Breach**: Database dump or exfiltration
   - **Mitigation**: Encryption, access controls, monitoring
   
4. **Supply Chain Attack**: Malicious dependency
   - **Mitigation**: Dependency review, lock files, scanning
   
5. **Denial of Service**: System overwhelmed
   - **Mitigation**: Rate limiting, CDN, autoscaling

---

## Contact

For security concerns or questions:

- **Email**: security@fusionstagehub.com
- **GitHub**: Use "Security" tab for private reports
- **PGP Key**: [Link to PGP key if available]

---

**Last Updated**: 2024-12-30  
**Security Version**: v1.0  
**Next Review**: 2025-03-30
