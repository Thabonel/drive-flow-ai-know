# Phase 1 Foundation PRD: Infrastructure Abstraction Layer

## Document Information
- **Document Type**: Product Requirements Document (PRD)
- **Phase**: 1 of 4 (Foundation)
- **Version**: 1.0
- **Date**: February 2026
- **Owner**: Engineering Team
- **Timeline**: Months 1-2 (8 weeks)

## Executive Summary

Phase 1 establishes the foundational abstraction layers that will enable seamless migration from Supabase to infrastructure-neutral architecture. This phase focuses on creating provider-agnostic interfaces for database access, authentication, and storage while maintaining 100% backward compatibility with existing Supabase implementation.

### Deliverables
1. **Database Abstraction Layer** - Provider-agnostic database interface
2. **Authentication Adapter Pattern** - Pluggable authentication system
3. **Storage Abstraction Layer** - Multi-provider storage interface
4. **Configuration Management System** - Environment-agnostic configuration
5. **Migration Development Environment** - Dual-provider testing setup

## Technical Requirements

### Database Abstraction Layer

#### Core Interface Design
```typescript
// Primary database interface
interface DatabaseProvider {
  // Connection management
  connect(config: DatabaseConfig): Promise<DatabaseConnection>
  disconnect(): Promise<void>
  isConnected(): boolean

  // Query operations
  query<T>(sql: string, params?: any[]): Promise<QueryResult<T>>
  queryOne<T>(sql: string, params?: any[]): Promise<T | null>
  queryMany<T>(sql: string, params?: any[]): Promise<T[]>

  // Transaction support
  transaction<T>(operations: TransactionOperation[]): Promise<T>

  // Schema operations
  migrateSchema(migrations: Migration[]): Promise<MigrationResult>
  validateSchema(): Promise<SchemaValidation>
}

// Repository pattern implementation
interface UserRepository {
  create(user: CreateUserInput): Promise<User>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  update(id: string, updates: Partial<User>): Promise<User>
  delete(id: string): Promise<void>
}
```

#### Supabase Implementation (Backward Compatibility)
```typescript
// Supabase database adapter
class SupabaseDatabaseProvider implements DatabaseProvider {
  private client: SupabaseClient

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.serviceRoleKey)
  }

  async query<T>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const { data, error } = await this.client.rpc('execute_sql', {
      query: sql,
      parameters: params
    })

    if (error) throw new DatabaseError(error.message)
    return { data: data as T[], count: data?.length || 0 }
  }

  // Transaction wrapper preserving RLS
  async transaction<T>(operations: TransactionOperation[]): Promise<T> {
    // Implement using Supabase transaction patterns
    return this.client.rpc('execute_transaction', { operations })
  }
}

// Repository implementation with RLS preservation
class SupabaseUserRepository implements UserRepository {
  constructor(private provider: DatabaseProvider, private userId?: string) {}

  async findById(id: string): Promise<User | null> {
    // Preserve RLS by including user context
    const result = await this.provider.query<User>(
      'SELECT * FROM auth.users WHERE id = $1 AND (id = $2 OR $2 IS NULL)',
      [id, this.userId]
    )
    return result.data[0] || null
  }

  async create(user: CreateUserInput): Promise<User> {
    // Use Supabase auth.signUp for consistency
    const { data, error } = await this.client.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: user.metadata
      }
    })

    if (error) throw new AuthError(error.message)
    return data.user as User
  }
}
```

#### Target Implementation (PostgreSQL Direct)
```typescript
// Native PostgreSQL adapter
class PostgreSQLDatabaseProvider implements DatabaseProvider {
  private pool: Pool

  constructor(config: PostgreSQLConfig) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      ssl: config.ssl,
      max: config.maxConnections || 20
    })
  }

  async query<T>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(sql, params)
      return { data: result.rows as T[], count: result.rowCount || 0 }
    } finally {
      client.release()
    }
  }

  async transaction<T>(operations: TransactionOperation[]): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      let result: T
      for (const operation of operations) {
        result = await operation(client)
      }

      await client.query('COMMIT')
      return result!
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
```

### Authentication Adapter Pattern

#### Core Authentication Interface
```typescript
// Authentication provider interface
interface AuthenticationProvider {
  // User registration
  signUp(email: string, password: string, metadata?: any): Promise<AuthResult>
  confirmEmail(token: string): Promise<ConfirmationResult>

  // User authentication
  signIn(email: string, password: string): Promise<AuthResult>
  signOut(sessionId: string): Promise<void>

  // Session management
  getUser(token: string): Promise<User | null>
  refreshSession(refreshToken: string): Promise<AuthResult>

  // Password management
  resetPassword(email: string): Promise<void>
  updatePassword(userId: string, newPassword: string): Promise<void>

  // OAuth integration
  initiateOAuth(provider: OAuthProvider): Promise<OAuthRedirect>
  handleOAuthCallback(code: string, state: string): Promise<AuthResult>
}

// Session management interface
interface SessionManager {
  createSession(user: User): Promise<Session>
  validateSession(token: string): Promise<SessionValidation>
  revokeSession(sessionId: string): Promise<void>
  refreshSession(refreshToken: string): Promise<Session>
  getUserSessions(userId: string): Promise<Session[]>
}
```

#### Supabase Authentication Adapter
```typescript
class SupabaseAuthProvider implements AuthenticationProvider {
  private client: SupabaseClient

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.anonKey)
  }

  async signUp(email: string, password: string, metadata?: any): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })

    if (error) throw new AuthenticationError(error.message)

    return {
      user: data.user,
      session: data.session,
      requiresConfirmation: !data.session
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw new AuthenticationError(error.message)

    return {
      user: data.user,
      session: data.session,
      requiresConfirmation: false
    }
  }

  async getUser(token: string): Promise<User | null> {
    const { data: { user }, error } = await this.client.auth.getUser(token)
    if (error) return null
    return user
  }
}
```

#### Custom Authentication Implementation
```typescript
class CustomAuthProvider implements AuthenticationProvider {
  constructor(
    private database: DatabaseProvider,
    private emailService: EmailService,
    private cryptoService: CryptoService
  ) {}

  async signUp(email: string, password: string, metadata?: any): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await this.database.queryOne<User>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (existingUser) {
      throw new AuthenticationError('User already exists')
    }

    // Hash password and create user
    const hashedPassword = await this.cryptoService.hashPassword(password)
    const confirmationToken = this.cryptoService.generateToken()

    const user = await this.database.queryOne<User>(
      `INSERT INTO users (id, email, encrypted_password, confirmation_token, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [
        this.cryptoService.generateId(),
        email,
        hashedPassword,
        confirmationToken,
        metadata || {}
      ]
    )

    // Send confirmation email
    await this.emailService.sendConfirmationEmail(email, confirmationToken)

    return {
      user,
      session: null,
      requiresConfirmation: true
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const user = await this.database.queryOne<User>(
      'SELECT * FROM users WHERE email = $1 AND email_confirmed_at IS NOT NULL',
      [email]
    )

    if (!user || !await this.cryptoService.verifyPassword(password, user.encrypted_password)) {
      throw new AuthenticationError('Invalid credentials')
    }

    const session = await this.createSession(user)

    return {
      user,
      session,
      requiresConfirmation: false
    }
  }

  private async createSession(user: User): Promise<Session> {
    const sessionId = this.cryptoService.generateId()
    const accessToken = this.cryptoService.generateJWT({
      userId: user.id,
      sessionId,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    })

    const refreshToken = this.cryptoService.generateToken()

    await this.database.query(
      `INSERT INTO user_sessions (id, user_id, access_token, refresh_token, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [sessionId, user.id, accessToken, refreshToken, new Date(Date.now() + (24 * 60 * 60 * 1000))]
    )

    return {
      sessionId,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000))
    }
  }
}
```

### Storage Abstraction Layer

#### Storage Provider Interface
```typescript
// Storage provider interface
interface StorageProvider {
  // File operations
  upload(bucket: string, path: string, file: Buffer, options?: UploadOptions): Promise<UploadResult>
  download(bucket: string, path: string): Promise<Buffer>
  delete(bucket: string, path: string): Promise<void>
  copy(bucket: string, fromPath: string, toPath: string): Promise<void>
  move(bucket: string, fromPath: string, toPath: string): Promise<void>

  // URL generation
  getPublicUrl(bucket: string, path: string): Promise<string>
  getSignedUrl(bucket: string, path: string, options: SignedUrlOptions): Promise<string>

  // Metadata operations
  getMetadata(bucket: string, path: string): Promise<FileMetadata>
  updateMetadata(bucket: string, path: string, metadata: Partial<FileMetadata>): Promise<void>

  // Bucket management
  createBucket(name: string, options?: BucketOptions): Promise<void>
  deleteBucket(name: string): Promise<void>
  listBuckets(): Promise<BucketInfo[]>

  // File listing
  listFiles(bucket: string, prefix?: string, options?: ListOptions): Promise<FileInfo[]>
}
```

#### Supabase Storage Adapter
```typescript
class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.serviceRoleKey)
  }

  async upload(bucket: string, path: string, file: Buffer, options?: UploadOptions): Promise<UploadResult> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        upsert: options?.overwrite || false,
        contentType: options?.contentType,
        metadata: options?.metadata
      })

    if (error) throw new StorageError(error.message)

    return {
      path: data.path,
      fullPath: data.fullPath,
      id: data.id
    }
  }

  async download(bucket: string, path: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .download(path)

    if (error) throw new StorageError(error.message)
    return Buffer.from(await data.arrayBuffer())
  }

  async getPublicUrl(bucket: string, path: string): Promise<string> {
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }

  async getSignedUrl(bucket: string, path: string, options: SignedUrlOptions): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, options.expiresIn)

    if (error) throw new StorageError(error.message)
    return data.signedUrl
  }
}
```

### Configuration Management System

#### Configuration Interface
```typescript
// Configuration management
interface ConfigurationManager {
  // Provider selection
  getDatabaseConfig(): DatabaseConfig
  getAuthConfig(): AuthConfig
  getStorageConfig(): StorageConfig
  getFunctionConfig(): FunctionConfig

  // Environment management
  getEnvironment(): Environment
  isProduction(): boolean
  isDevelopment(): boolean

  // Feature flags
  isFeatureEnabled(feature: FeatureFlag): boolean
  getFeatureConfig(feature: FeatureFlag): any

  // Secrets management
  getSecret(key: string): Promise<string>
  setSecret(key: string, value: string): Promise<void>
}

// Configuration types
interface ProviderConfiguration {
  // Database provider selection
  database: {
    provider: 'supabase' | 'postgresql' | 'mysql' | 'sqlite'
    config: DatabaseProviderConfig
  }

  // Auth provider selection
  authentication: {
    provider: 'supabase' | 'auth0' | 'cognito' | 'firebase' | 'custom'
    config: AuthProviderConfig
  }

  // Storage provider selection
  storage: {
    provider: 'supabase' | 's3' | 'gcs' | 'azure' | 'r2'
    config: StorageProviderConfig
  }

  // Function provider selection
  functions: {
    provider: 'supabase' | 'vercel' | 'netlify' | 'aws-lambda' | 'cloudflare'
    config: FunctionProviderConfig
  }
}
```

#### Implementation
```typescript
class ConfigurationService implements ConfigurationManager {
  private config: ProviderConfiguration
  private secrets: SecretStore

  constructor() {
    this.config = this.loadConfiguration()
    this.secrets = this.initializeSecretStore()
  }

  private loadConfiguration(): ProviderConfiguration {
    const environment = process.env.NODE_ENV || 'development'

    // Default to Supabase for backward compatibility
    return {
      database: {
        provider: (process.env.DATABASE_PROVIDER as any) || 'supabase',
        config: this.getDatabaseProviderConfig()
      },
      authentication: {
        provider: (process.env.AUTH_PROVIDER as any) || 'supabase',
        config: this.getAuthProviderConfig()
      },
      storage: {
        provider: (process.env.STORAGE_PROVIDER as any) || 'supabase',
        config: this.getStorageProviderConfig()
      },
      functions: {
        provider: (process.env.FUNCTION_PROVIDER as any) || 'supabase',
        config: this.getFunctionProviderConfig()
      }
    }
  }

  getDatabaseConfig(): DatabaseConfig {
    const { provider, config } = this.config.database

    switch (provider) {
      case 'supabase':
        return {
          type: 'supabase',
          url: process.env.SUPABASE_URL!,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          anonKey: process.env.SUPABASE_ANON_KEY!
        }
      case 'postgresql':
        return {
          type: 'postgresql',
          connectionString: process.env.DATABASE_URL!,
          ssl: process.env.NODE_ENV === 'production',
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20')
        }
      default:
        throw new Error(`Unsupported database provider: ${provider}`)
    }
  }
}
```

## Implementation Timeline

### Week 1-2: Database Abstraction Layer
```typescript
// Sprint 1 deliverables
interface Sprint1Deliverables {
  // Core interfaces
  databaseInterface: 'Complete DatabaseProvider interface definition',
  repositoryPattern: 'Repository interface for all major entities',

  // Supabase adapter
  supabaseAdapter: 'Full backward compatibility with existing Supabase usage',
  rlsPreservation: 'Maintain all existing RLS policies in adapter',

  // Testing framework
  testSuite: 'Comprehensive test suite for database abstraction',
  migrationTests: 'Tests for data migration scenarios'
}
```

### Week 3-4: Authentication Adapter Pattern
```typescript
// Sprint 2 deliverables
interface Sprint2Deliverables {
  // Authentication interfaces
  authInterface: 'Complete AuthenticationProvider interface',
  sessionManagement: 'Session management interface and implementation',

  // Supabase auth adapter
  supabaseAuthAdapter: 'Preserve existing auth flow completely',
  emailConfirmation: 'Maintain email confirmation workflow',

  // Frontend integration
  reactHooksUpdate: 'Update useAuth hook to use new abstraction',
  routeProtection: 'Update ProtectedRoute to use new auth system'
}
```

### Week 5-6: Storage Abstraction Layer
```typescript
// Sprint 3 deliverables
interface Sprint3Deliverables {
  // Storage interfaces
  storageInterface: 'Complete StorageProvider interface',
  fileOperations: 'All file operation methods implemented',

  // Supabase storage adapter
  supabaseStorageAdapter: 'Maintain existing file upload/download patterns',
  securityPolicies: 'Preserve all storage security policies',

  // Frontend updates
  uploadComponents: 'Update file upload components',
  documentViewer: 'Update document viewer for new storage interface'
}
```

### Week 7-8: Configuration and Testing
```typescript
// Sprint 4 deliverables
interface Sprint4Deliverables {
  // Configuration system
  configManager: 'Complete configuration management system',
  environmentConfigs: 'Development, staging, production configurations',

  // Development environment
  dualProviderSetup: 'Support running with both Supabase and target providers',
  migrationTools: 'Basic migration tooling for development',

  // Quality assurance
  integrationTests: 'End-to-end tests with both provider configurations',
  performanceTesting: 'Performance comparison between providers',
  documentationComplete: 'Complete documentation for Phase 1'
}
```

## Success Criteria

### Technical Success Metrics
1. **Backward Compatibility**: 100% compatibility with existing Supabase implementation
2. **Performance Parity**: ≤ 5% performance impact from abstraction layer
3. **Test Coverage**: ≥ 90% test coverage for all abstraction layers
4. **Memory Impact**: ≤ 10% increase in memory usage

### Functional Success Metrics
1. **Zero Breaking Changes**: All existing functionality works unchanged
2. **Easy Provider Switching**: Change providers via configuration only
3. **Development Velocity**: No impact on feature development during Phase 1
4. **Error Handling**: Proper error translation across all providers

### Quality Assurance Criteria
```typescript
// Acceptance criteria checklist
interface AcceptanceCriteria {
  // Database abstraction
  databaseTests: [
    'All existing queries work through abstraction layer',
    'RLS policies enforced correctly',
    'Transaction support maintains ACID properties',
    'Performance within 5% of direct Supabase calls'
  ],

  // Authentication abstraction
  authenticationTests: [
    'User registration flow unchanged',
    'Login/logout flow unchanged',
    'Email confirmation flow unchanged',
    'OAuth integration unchanged',
    'Session management works correctly'
  ],

  // Storage abstraction
  storageTests: [
    'File upload/download unchanged',
    'Signed URL generation works',
    'Metadata operations work correctly',
    'Security policies maintained'
  ],

  // Configuration management
  configurationTests: [
    'Provider switching via environment variables',
    'Secret management works',
    'Feature flags work correctly',
    'Environment detection accurate'
  ]
}
```

## Risk Mitigation

### Technical Risks
1. **Performance Overhead**: Abstraction layer adds latency
   - **Mitigation**: Optimize hot paths, implement caching where appropriate
   - **Monitoring**: Continuous performance monitoring and alerting

2. **RLS Policy Preservation**: Complex RLS policies may not translate correctly
   - **Mitigation**: Comprehensive testing of all RLS scenarios
   - **Fallback**: Application-level security as backup

3. **Edge Function Integration**: Abstraction layer needs to work in Edge Function context
   - **Mitigation**: Design for serverless environment constraints
   - **Testing**: Extensive Edge Function testing

### Implementation Risks
1. **Development Timeline**: Complex abstractions may take longer than estimated
   - **Mitigation**: Start with simplest abstractions, iterate to complexity
   - **Buffer**: Include 25% time buffer in estimates

2. **Team Learning Curve**: New patterns require team training
   - **Mitigation**: Pair programming, code review focus on new patterns
   - **Documentation**: Extensive documentation and examples

## Dependencies

### Technical Dependencies
- **TypeScript 4.8+**: For advanced type safety features
- **Node.js 18+**: For modern JavaScript features
- **PostgreSQL 14+**: For target database compatibility
- **Testing Framework**: Jest or Vitest for unit testing

### Team Dependencies
- **Senior Backend Engineer**: Lead implementation of database abstraction
- **Frontend Engineer**: Update React components and hooks
- **DevOps Engineer**: Configuration and environment management

### External Dependencies
- **Target Provider Evaluation**: Must select target providers before implementation
- **Architecture Review**: External review of abstraction design
- **Security Review**: Validation of security preservation

## Deliverables

### Code Deliverables
1. **Database Abstraction Module** (`src/lib/database/`)
2. **Authentication Abstraction Module** (`src/lib/auth/`)
3. **Storage Abstraction Module** (`src/lib/storage/`)
4. **Configuration Management Module** (`src/lib/config/`)
5. **Supabase Adapters** (`src/adapters/supabase/`)

### Documentation Deliverables
1. **Architecture Documentation**: Complete system design
2. **API Documentation**: All interfaces and their usage
3. **Migration Guide**: How to switch providers
4. **Testing Guide**: How to test with different providers

### Testing Deliverables
1. **Unit Test Suite**: All abstraction layer components
2. **Integration Test Suite**: End-to-end provider testing
3. **Performance Test Suite**: Baseline and comparison tests
4. **Migration Test Suite**: Provider switching scenarios

---

**Phase 1 Start Gate**: Executive approval and resource allocation
**Phase 1 End Gate**: All acceptance criteria met, Phase 2 approved
**Success Review**: Technical team, architecture review, stakeholder sign-off